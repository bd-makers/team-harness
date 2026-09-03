// Shared harness ops used by init.
import { join, basename, resolve } from 'node:path';
import { lstat, unlink } from 'node:fs/promises';
import { writeText, readTextSafe, copyTree, exists } from './fsx.mjs';
import { render } from './render.mjs';
import { mergeMarkdown, deepMergeJson, simpleDiff } from './merge.mjs';
import { stackPermissions, RN_STACK_IDS } from './settings-permissions.mjs';

export const DEFAULT_BACKUP_PARENT = 'harness-backup';

// AGENTS.md (shared core) + CLAUDE.md (thin, @AGENTS.md import).
// Exported so drift checks stay in step with what init actually renders.
export const AGENT_FILE_TEMPLATES = [
  ['AGENTS.md', 'AGENTS.md.hbs'],
  ['CLAUDE.md', 'CLAUDE.md.hbs'],
];

function hasCommand(group, command) {
  return Array.isArray(group?.hooks)
    && group.hooks.some(hook => hook?.type === 'command' && hook.command === command);
}

// A project can author its own `.codex/hooks.json`. `init` deep-merges the harness
// group in, but a hand-edited file can still drop it — and then Codex sessions silently
// lose task context while the file stays valid JSON. Content check, not just parse.
export function codexHooksHaveSessionContext(hooks) {
  const groups = hooks?.hooks?.SessionStart;
  return Array.isArray(groups) && groups.some(group =>
    Array.isArray(group?.hooks) && group.hooks.some(hook =>
      hook?.type === 'command' && typeof hook.command === 'string'
        && hook.command.includes('harness-team session-context')));
}

// Both Edit and Write must be wired: a Write that rewrites the plan completes
// checkboxes too, and an Edit-only group used to pass this check so doctor never
// noticed the Write half was missing (codex review P2, 2026-09-03). `migrate` passes
// `requireWrite: false` — an Edit-only group is by definition a customization (the
// template has always shipped `Edit|Write`), and migrate leaves customized groups
// alone; doctor keeps warning until the team adds Write themselves.
export function settingsHasBoundaryCheckpoint(settings, { requireWrite = true } = {}) {
  const groups = settings?.hooks?.PreToolUse;
  return Array.isArray(groups) && groups.some(group => {
    if (typeof group?.matcher !== 'string') return false;
    const tools = group.matcher.split('|');
    return tools.includes('Edit') && (!requireWrite || tools.includes('Write'))
      && hasCommand(group, './.claude/hooks/boundary-checkpoint.sh');
  });
}

function hasExactKeys(value, keys) {
  return value !== null
    && typeof value === 'object'
    && !Array.isArray(value)
    && Object.keys(value).length === keys.length
    && keys.every(key => Object.hasOwn(value, key));
}

function isKnownDefaultProtectGroup(group) {
  if (!hasExactKeys(group, ['matcher', 'hooks']) || group.matcher !== 'Edit|Write' || !Array.isArray(group.hooks) || group.hooks.length !== 1) {
    return false;
  }
  const [hook] = group.hooks;
  return hasExactKeys(hook, ['type', 'command', 'timeout'])
    && hook.type === 'command'
    && hook.command === './.claude/hooks/protect-files.sh'
    && hook.timeout === 10;
}

// Settings arrays normally union whole hook groups. When upgrading the known
// default Edit|Write group, normalize the old protect-only group into the new
// protect→boundary group so `init` does not run protect-files twice. Any
// customized group is left intact; the normal non-destructive union still adds
// the new template group without replacing user hooks.
export function mergeClaudeSettings(existing, incoming) {
  const merged = deepMergeJson(existing, incoming);
  const existingGroups = existing?.hooks?.PreToolUse;
  const incomingGroups = incoming?.hooks?.PreToolUse;
  const mergedGroups = merged?.hooks?.PreToolUse;
  if (!Array.isArray(existingGroups) || !Array.isArray(incomingGroups) || !Array.isArray(mergedGroups)) return merged;

  const oldGroup = existingGroups.find(isKnownDefaultProtectGroup);
  const newGroup = incomingGroups.find(group =>
    group?.matcher === 'Edit|Write'
      && hasCommand(group, './.claude/hooks/protect-files.sh')
      && hasCommand(group, './.claude/hooks/boundary-checkpoint.sh'));
  if (!oldGroup || !newGroup) return merged;

  const oldIndex = mergedGroups.findIndex(group => JSON.stringify(group) === JSON.stringify(oldGroup));
  const newIndex = mergedGroups.findIndex(group => JSON.stringify(group) === JSON.stringify(newGroup));
  if (oldIndex === -1 || newIndex === -1 || oldIndex === newIndex) return merged;
  mergedGroups[oldIndex] = newGroup;
  mergedGroups.splice(newIndex, 1);
  return merged;
}

// The symlink-backup architecture breaks when a cloud sync service evicts files
// (offloads to cloud-only). Warn when a target/backup path lives under a known
// sync folder. Returns a warning string, or null. Best-effort by path substring.
export function cloudSyncPathWarning(p) {
  if (!p) return null;
  const markers = [
    { re: /\/Library\/Mobile Documents\//, name: 'iCloud Drive' },
    { re: /\/Dropbox(\/|$)/, name: 'Dropbox' },
    { re: /\/Google ?Drive(\/|$)/, name: 'Google Drive' },
    { re: /\/OneDrive[^/]*(\/|$)/, name: 'OneDrive' },
  ];
  const hit = markers.find(m => m.re.test(p));
  if (!hit) return null;
  return `경로가 ${hit.name} 동기화 폴더 안에 있습니다 — 클라우드가 파일을 evict하면 symlink/백업이 깨질 수 있습니다. 로컬 경로 사용을 권장합니다.`;
}

// Resolve the backup directory from a stored config, else null.
export async function loadBackupDir(targetDir) {
  const cfg = await readTextSafe(join(targetDir, '.harness/backup.json'));
  if (!cfg) return null;
  try {
    const data = JSON.parse(cfg);
    if (data.dir) return data.dir;
    const { parent, name } = data;
    if (!parent || !name) return null;
    return resolve(join(targetDir, '..', parent, name));
  } catch { return null; }
}

export async function saveBackupConfig(targetDir, config) {
  await writeText(join(targetDir, '.harness/backup.json'),
    JSON.stringify(config, null, 2) + '\n');
}

export async function planChanges(ctx, { stack }) {
  const { root, targetDir } = ctx;
  const tplDir = join(root, 'templates');
  const vars = {
    projectName: basename(targetDir),
    ...stack,
  };

  const changes = [];
  const legacyAgentFiles = [];
  const brokenMarkerFiles = [];

  // Each agent file is marker-merged independently: managed sections updated,
  // user text preserved.
  for (const [file, tplName] of AGENT_FILE_TEMPLATES) {
    const t = await readTextSafe(join(tplDir, tplName));
    if (!t) continue;
    const filePath = join(targetDir, file);
    // Legacy guard: an alias symlink (0.7.x AGENTS.md → CLAUDE.md) must NOT be
    // read or written through — fs.writeFile follows symlinks and would clobber CLAUDE.md.
    // Skip it and surface a migrate hint; `migrate` converts these to real files.
    const st = await lstat(filePath).catch(() => null);
    if (st?.isSymbolicLink()) { legacyAgentFiles.push(file); continue; }
    const rendered = render(t, vars);
    const existing = await readTextSafe(filePath);
    let merged;
    try {
      merged = mergeMarkdown(existing, rendered);
    } catch (err) {
      if (err?.code !== 'HARNESS_MARKER_MISMATCH') throw err;
      brokenMarkerFiles.push({ file, section: err.section, message: err.message });
      continue;
    }
    if (existing !== merged) {
      changes.push({ kind: 'markdown', path: filePath, before: existing, after: merged });
    }
  }

  // Scripts live in the project root with the backup dir path embedded at generation time.
  const backupDir = ctx.backupDir;
  if (backupDir) {
    for (const f of ['clone.sh', 'symlink.sh', 'delete.sh']) {
      const tpl = await readTextSafe(join(tplDir, f));
      if (!tpl) continue;
      const rendered = tpl.replace(/\{\{BACKUP_DIR\}\}/g, backupDir);
      const existing = await readTextSafe(join(targetDir, f));
      if (existing !== rendered) changes.push({ kind: 'script', path: join(targetDir, f), after: rendered });
    }
  }

  // .claude/settings.json — JSON deep-merge
  const tplSettings = JSON.parse(await readTextSafe(join(tplDir, '.claude/settings.json')));
  // permissions의 pm·RN 의존 항목은 템플릿에 없다 — 스택 프로필에서 생성해 합성한다.
  // RN 판정 입력은 excludesRnRules와 같다(명시 --stack > 감지 stackId > 프로필 id).
  const stackPerms = stackPermissions(stack, { stackId: ctx.flags?.stack ?? ctx.stackId });
  if (stackPerms.allow.length || stackPerms.deny.length) {
    tplSettings.permissions ??= {};
    tplSettings.permissions.allow = [...(tplSettings.permissions.allow ?? []), ...stackPerms.allow];
    tplSettings.permissions.deny = [...(tplSettings.permissions.deny ?? []), ...stackPerms.deny];
  }
  const existingSettings = JSON.parse((await readTextSafe(join(targetDir, '.claude/settings.json'))) || 'null');
  const mergedSettings = mergeClaudeSettings(existingSettings, tplSettings);
  const existingSettingsText = existingSettings ? JSON.stringify(existingSettings, null, 2) : null;
  const mergedSettingsText = JSON.stringify(mergedSettings, null, 2);
  if (existingSettingsText !== mergedSettingsText) {
    changes.push({
      kind: 'json',
      path: join(targetDir, '.claude/settings.json'),
      before: existingSettingsText,
      after: mergedSettingsText,
    });
  }

  // .codex/hooks.json — Codex reads project-local hooks. Deep-merge (not skip-existing)
  // so a project that already authored its own Codex hooks still gains the harness
  // SessionStart group instead of silently keeping none. Array union is by JSON identity,
  // so re-applying is a no-op and user-authored groups survive.
  const tplCodex = JSON.parse(await readTextSafe(join(tplDir, '.codex/hooks.json')));
  const existingCodex = JSON.parse((await readTextSafe(join(targetDir, '.codex/hooks.json'))) || 'null');
  const mergedCodex = deepMergeJson(existingCodex, tplCodex);
  const existingCodexText = existingCodex ? JSON.stringify(existingCodex, null, 2) : null;
  const mergedCodexText = JSON.stringify(mergedCodex, null, 2);
  if (existingCodexText !== mergedCodexText) {
    changes.push({
      kind: 'json',
      path: join(targetDir, '.codex/hooks.json'),
      before: existingCodexText,
      after: mergedCodexText,
    });
  }

  return { changes, vars, legacyAgentFiles, brokenMarkerFiles };
}

export async function applyChanges(changes) {
  const results = [];
  for (const c of changes) {
    // fs.writeFile follows symlinks; unlink any symlink first so we replace it with a
    // real file instead of clobbering its target (e.g. a legacy alias → CLAUDE.md).
    const st = await lstat(c.path).catch(() => null);
    if (st?.isSymbolicLink()) await unlink(c.path);
    await writeText(c.path, c.after, c.kind === 'script' ? { mode: 0o755 } : undefined);
    results.push({ path: c.path, kind: c.kind, written: true });
  }
  return results;
}

// React Native 전용 rules(Expo Router 네비게이션 등). 유효 stack id — 명시 `--stack`, 없으면
// init이 감지해 `ctx.stackId`로 넘긴 값 — 가 RN 계열이 아니면 제외한다. 예전에는 자동감지
// 결과로 게이트하지 않아 순수 Node·Python 프로젝트에도 Expo 규칙 4종이 들어갔고, 이를 피하려고
// `--stack node`를 주면 감지된 명령이 전부 (configure)로 지워졌다. stack 정보가 전혀 없는
// 호출(직접 호출·테스트)은 종전대로 전부 복사한다.
const RN_ONLY_RULE_FILES = new Set(['navigation.md', 'state-management.md', 'styling.md', 'testing.md']);
// RN_STACK_IDS는 settings-permissions.mjs와 공유한다 — permissions의 RN 전용 항목도 같은 판정을 쓴다.

export function excludesRnRules(ctx) {
  const stackId = ctx.flags?.stack ?? ctx.stackId;
  return !!stackId && !RN_STACK_IDS.has(stackId);
}

export async function copyStaticAssets(ctx) {
  const tplDir = join(ctx.root, 'templates');
  const out = [];
  // hooks: copy, skip existing
  out.push(...await copyTree(join(tplDir, '.claude/hooks'), join(ctx.targetDir, '.claude/hooks'), { skipExisting: true }));
  // rules: copy, skip existing. RN 전용 4종은 유효 stack이 비-RN이면 제외한다.
  const excludeRnRules = excludesRnRules(ctx);
  out.push(...await copyTree(join(tplDir, '.claude/rules'), join(ctx.targetDir, '.claude/rules'), {
    skipExisting: true,
    exclude: excludeRnRules ? RN_ONLY_RULE_FILES : undefined,
  }));
  // skills: copy, skip existing
  out.push(...await copyTree(join(tplDir, '.claude/skills'), join(ctx.targetDir, '.claude/skills'), { skipExisting: true }));
  // docs/: README + .gitkeep seed (skip existing to preserve team work)
  out.push(...await copyTree(join(tplDir, 'docs'), join(ctx.targetDir, 'docs'), { skipExisting: true }));
  // .harness/ bootstrap (empty active.json placeholder)
  const { writeText } = await import('./fsx.mjs');
  const activePath = join(ctx.targetDir, '.harness/active.json');
  if (!(await exists(activePath))) {
    await writeText(activePath, '{}\n');
    out.push({ path: activePath, action: 'write' });
  }
  // .gitignore tweaks
  await appendGitignore(ctx.targetDir, { addAiEntries: !!ctx.addAiGitignore });
  // cursor rules — mirrored from .claude/rules
  await mirrorCursorRules(ctx);
  return out;
}

const AI_GITIGNORE_ENTRIES = [
  '# AI',
  'CLAUDE.md',
  'AGENTS.md',
  '',
  'oh-my-openagent.json',
  '',
  'handoff.md',
  'plan.md',
  '',
  '.claude',
  '.claude/',
  '.cursor',
  '.cursor/',
  '.omc',
  '.omc/',
  '.omx',
  '.omx/',
  '.ai',
  '.ai/',
  '.sisyphus',
  '.sisyphus/',
  '.agents',
  '.agents/',
  '.cursorrules',
  '.codex',
  '.codex/',
  '',
  '# build',
  'output/',
  '',
  '*.log',
];

async function appendGitignore(targetDir, { addAiEntries = false } = {}) {
  const { readTextSafe, writeText } = await import('./fsx.mjs');
  const path = join(targetDir, '.gitignore');
  const existing = (await readTextSafe(path)) ?? '';
  const lines = existing.split('\n');
  const has = (line) => lines.some(l => l.trim() === line);

  // Not `.harness/` wholesale: backup.json (the shared backup path) and the cursor
  // mirror manifest are team state the README asks teams to commit. Only the per-user
  // pointer/config and the observability logs are personal.
  const harnessNeeded = [
    '.claude/settings.local.json',
    '.harness/active.json',
    '.harness/config.json',
    '.harness/observability/',
  ];
  const harnessMissing = harnessNeeded.filter(line => !has(line));

  let out = existing;
  if (harnessMissing.length > 0) {
    out += `\n# harness-aijient-team\n${harnessMissing.join('\n')}\n`;
  }

  if (addAiEntries) {
    const aiMissing = AI_GITIGNORE_ENTRIES.filter(line => line === '' || !has(line));
    if (aiMissing.length > 0) {
      out += `\n${aiMissing.join('\n')}\n`;
    }
  }

  if (out !== existing) await writeText(path, out);
}

export const AI_GITIGNORE_PREVIEW = AI_GITIGNORE_ENTRIES.join('\n');

// `.claude/rules/*.md` scopes a rule with a `paths:` glob list; Claude Code then
// loads it only while working with matching files. Cursor expresses the same
// intent as a comma-separated `globs:` string, so the mirror must translate —
// emitting `alwaysApply: true` for a scoped rule would load it into every Cursor
// session, the opposite of what the source asked for. Returns the source's paths
// and the body with the source frontmatter removed (leaving it in place would
// stack two frontmatter blocks and strand the second as literal text).
export function splitRulePaths(content) {
  const match = /^---\r?\n([\s\S]*?)\r?\n---(?:\r?\n)?/.exec(content);
  if (!match) return { paths: [], body: content };
  const unquote = (value) => value.trim().replace(/^["']|["']$/g, '');
  const paths = [];
  let inPaths = false;
  for (const line of match[1].split(/\r?\n/)) {
    const inline = /^paths:\s*\[(.*)\]\s*$/.exec(line);
    if (inline) {
      paths.push(...inline[1].split(',').map(unquote).filter(Boolean));
      inPaths = false;
      continue;
    }
    if (/^paths:\s*$/.test(line)) { inPaths = true; continue; }
    if (inPaths) {
      const item = /^\s*-\s+(.+)$/.exec(line);
      if (item) { paths.push(unquote(item[1])); continue; }
      inPaths = false;
    }
  }
  return { paths, body: content.slice(match[0].length) };
}

// Claude Code discovers `.claude/rules/**/*.md` recursively, so rules organized into
// `frontend/` or `backend/` subdirectories are live for Claude. A flat mirror would
// drop them silently — Cursor would be missing rules nobody noticed were missing.
// Symlinked rule directories are a documented sharing pattern, so they are followed,
// with a realpath set to stop a circular link from recursing forever.
// `chain` holds the realpaths of the current branch's ancestors, not every directory
// visited: a link is circular only when it reaches a directory it is already inside.
// A global visited set would also swallow two separate aliases of one shared rules
// directory, dropping the second alias's rules — the same silent omission this walk exists to fix.
async function collectRuleFiles(dir, { base = '', chain = new Set() } = {}) {
  const { readdir, realpath, stat } = await import('node:fs/promises');
  const real = await realpath(dir).catch(() => dir);
  if (chain.has(real)) return [];
  chain.add(real);
  const entries = await readdir(dir, { withFileTypes: true });
  const files = [];
  for (const entry of entries) {
    if (entry.name === '.DS_Store') continue;
    const full = join(dir, entry.name);
    const rel = base ? `${base}/${entry.name}` : entry.name;
    const isDir = entry.isDirectory()
      || (entry.isSymbolicLink() && await stat(full).then(s => s.isDirectory()).catch(() => false));
    if (isDir) files.push(...await collectRuleFiles(full, { base: rel, chain }));
    else if (entry.name.endsWith('.md')) files.push(rel);
  }
  chain.delete(real);
  return files;
}

// A YAML plain scalar may not open with an indicator character, and globs routinely
// do: `**/*.ts` reads as an alias, `[id].tsx` as a flow sequence — both make the
// generated frontmatter unparseable. Quote only those, so the ordinary case stays
// byte-identical to the plain form Cursor's own docs show.
function yamlScalar(value) {
  return /^[-?:,[\]{}#&*!|>'"%@`]/.test(value)
    ? `'${value.replace(/'/g, "''")}'`
    : value;
}

// Stamped into every generated `.mdc` as provenance, and re-checked before deleting:
// if the stamp is gone the user has taken the file over. A markdown comment, so
// Cursor renders nothing.
export const CURSOR_MIRROR_MARKER = '<!-- harness:mirror -->';

// What the last run wrote. Deletion is authorized by this record, not by the file's
// own content: the marker is a public string, so a rule started by copying a
// generated `.mdc` would carry it, and content alone would sentence that copy to
// deletion. Only a path this harness recorded writing may be removed.
const CURSOR_MIRROR_MANIFEST = '.harness/cursor-mirror.json';

// Manifest entries name files to delete, so they are read as untrusted input: a
// hand-edited `..` or absolute path must not reach unlink outside the mirror.
function isSafeMirrorEntry(rel) {
  return typeof rel === 'string'
    && rel.endsWith('.mdc')
    && !rel.startsWith('/')
    && !rel.includes('\\')
    && !rel.split('/').includes('..');
}

async function readMirrorManifest(targetDir) {
  const raw = await readTextSafe(join(targetDir, CURSOR_MIRROR_MANIFEST));
  if (!raw) return [];
  try {
    const { generated } = JSON.parse(raw);
    return Array.isArray(generated) ? generated.filter(isSafeMirrorEntry) : [];
  } catch { return []; }
}

// Mirrors from a pre-manifest harness are absent from the record and so are never
// pruned — the conservative failure is a stale rule, not a deleted one.
async function pruneCursorMirrors(dstDir, previous, keep) {
  const { rmdir, unlink } = await import('node:fs/promises');
  const out = [];
  const dirs = new Set();
  for (const rel of previous) {
    if (keep.has(rel)) continue;
    const full = join(dstDir, rel);
    const content = await readTextSafe(full);
    if (content === null || !content.includes(CURSOR_MIRROR_MARKER)) continue;
    await unlink(full);
    out.push({ path: full, action: 'prune' });
    if (rel.includes('/')) dirs.add(rel.slice(0, rel.lastIndexOf('/')));
  }
  // Deepest first, and rmdir fails on anything non-empty, so a directory still
  // holding a hand-written rule survives without a separate check.
  for (const dir of [...dirs].sort((a, b) => b.length - a.length)) {
    await rmdir(join(dstDir, dir)).catch(() => {});
  }
  return out;
}

export async function mirrorCursorRules(ctx) {
  const srcDir = join(ctx.targetDir, '.claude/rules');
  const dstDir = join(ctx.targetDir, '.cursor/rules');
  const previous = await readMirrorManifest(ctx.targetDir);
  // A removed `.claude/rules` is the strongest form of "no longer produced" —
  // returning early here would strand every mirror it ever generated.
  const sources = await exists(srcDir) ? await collectRuleFiles(srcDir) : [];
  if (!sources.length && !previous.length) return [];

  const out = [];
  const written = new Set();
  for (const rel of sources) {
    const content = await readTextSafe(join(srcDir, rel));
    const name = rel.replace(/\.md$/, '');
    const { paths, body } = splitRulePaths(content);
    const scope = paths.length
      ? `globs: ${yamlScalar(paths.join(', '))}\nalwaysApply: false`
      : 'alwaysApply: true';
    const mdc = `---\ndescription: ${name} rules\n${scope}\n---\n\n${CURSOR_MIRROR_MARKER}\n\n${body}`;
    const dst = join(dstDir, `${name}.mdc`);
    await writeText(dst, mdc);
    written.add(`${name}.mdc`);
    out.push({ path: dst, action: 'mirror' });
  }
  // A renamed or deleted rule leaves its old mirror behind, and Cursor keeps loading
  // it — the stale copy expires never, so the mirror must remove what it no longer
  // produces.
  out.push(...await pruneCursorMirrors(dstDir, previous, written));
  await writeText(join(ctx.targetDir, CURSOR_MIRROR_MANIFEST),
    JSON.stringify({ generated: [...written].sort() }, null, 2) + '\n');
  return out;
}

export function formatDiff(changes) {
  const lines = [];
  for (const c of changes) {
    lines.push(`\n═══ ${c.path} (${c.kind}) ═══`);
    if (c.before === null || c.before === undefined) {
      lines.push('  (new file)');
      lines.push((c.after ?? '').split('\n').slice(0, 30).map(l => `+ ${l}`).join('\n'));
      if ((c.after ?? '').split('\n').length > 30) lines.push('  ...');
    } else {
      lines.push(simpleDiff(c.before, c.after));
    }
  }
  return lines.join('\n');
}

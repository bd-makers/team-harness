// Shared harness ops used by init & apply.
import { join, basename, resolve } from 'node:path';
import { lstat, unlink } from 'node:fs/promises';
import { writeText, readTextSafe, copyTree, exists } from './fsx.mjs';
import { render } from './render.mjs';
import { mergeMarkdown, deepMergeJson, simpleDiff } from './merge.mjs';

export const DEFAULT_BACKUP_PARENT = 'harness-backup';

// AGENTS.md (shared core) + CLAUDE.md / GEMINI.md (thin, @AGENTS.md import).
// Exported so drift checks stay in step with what apply actually renders.
export const AGENT_FILE_TEMPLATES = [
  ['AGENTS.md', 'AGENTS.md.hbs'],
  ['CLAUDE.md', 'CLAUDE.md.hbs'],
  ['GEMINI.md', 'GEMINI.md.hbs'],
];

function hasCommand(group, command) {
  return Array.isArray(group?.hooks)
    && group.hooks.some(hook => hook?.type === 'command' && hook.command === command);
}

// A project can author its own `.codex/hooks.json`. `apply` deep-merges the harness
// group in, but a hand-edited file can still drop it — and then Codex sessions silently
// lose task context while the file stays valid JSON. Content check, not just parse.
export function codexHooksHaveSessionContext(hooks) {
  const groups = hooks?.hooks?.SessionStart;
  return Array.isArray(groups) && groups.some(group =>
    Array.isArray(group?.hooks) && group.hooks.some(hook =>
      hook?.type === 'command' && typeof hook.command === 'string'
        && hook.command.includes('harness-team session-context')));
}

export function settingsHasBoundaryCheckpoint(settings) {
  const groups = settings?.hooks?.PreToolUse;
  return Array.isArray(groups) && groups.some(group =>
    typeof group?.matcher === 'string'
      && group.matcher.split('|').includes('Edit')
      && hasCommand(group, './.claude/hooks/boundary-checkpoint.sh'));
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
// protect→boundary group so `apply` does not run protect-files twice. Any
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

  // Each agent file is marker-merged independently: managed sections updated,
  // user text preserved.
  for (const [file, tplName] of AGENT_FILE_TEMPLATES) {
    const t = await readTextSafe(join(tplDir, tplName));
    if (!t) continue;
    const filePath = join(targetDir, file);
    // Legacy guard: an alias symlink (0.7.x AGENTS.md/GEMINI.md → CLAUDE.md) must NOT be
    // read or written through — fs.writeFile follows symlinks and would clobber CLAUDE.md.
    // Skip it and surface a migrate hint; `migrate` converts these to real files.
    const st = await lstat(filePath).catch(() => null);
    if (st?.isSymbolicLink()) { legacyAgentFiles.push(file); continue; }
    const rendered = render(t, vars);
    const existing = await readTextSafe(filePath);
    const merged = mergeMarkdown(existing, rendered);
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

  // .opencode/opencode.json
  const tplOpen = JSON.parse(await readTextSafe(join(tplDir, '.opencode/opencode.json')));
  const existingOpen = JSON.parse((await readTextSafe(join(targetDir, '.opencode/opencode.json'))) || 'null');
  const mergedOpen = deepMergeJson(existingOpen, tplOpen);
  const existingOpenText = existingOpen ? JSON.stringify(existingOpen, null, 2) : null;
  const mergedOpenText = JSON.stringify(mergedOpen, null, 2);
  if (existingOpenText !== mergedOpenText) {
    changes.push({
      kind: 'json',
      path: join(targetDir, '.opencode/opencode.json'),
      before: existingOpenText,
      after: mergedOpenText,
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

  return { changes, vars, legacyAgentFiles };
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

export async function copyStaticAssets(ctx) {
  const tplDir = join(ctx.root, 'templates');
  const out = [];
  // hooks: copy, skip existing
  out.push(...await copyTree(join(tplDir, '.claude/hooks'), join(ctx.targetDir, '.claude/hooks'), { skipExisting: true }));
  // rules: copy, skip existing
  out.push(...await copyTree(join(tplDir, '.claude/rules'), join(ctx.targetDir, '.claude/rules'), { skipExisting: true }));
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
  'GEMINI.md',
  '',
  'oh-my-openagent.json',
  'opencode.json',
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
  '.opencode',
  '.opencode/',
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

  const harnessNeeded = [
    '.claude/settings.local.json',
    '.harness/',
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

export async function mirrorCursorRules(ctx) {
  const srcDir = join(ctx.targetDir, '.claude/rules');
  const dstDir = join(ctx.targetDir, '.cursor/rules');
  if (!(await exists(srcDir))) return [];
  const { readdir } = await import('node:fs/promises');
  const entries = await readdir(srcDir);
  const out = [];
  for (const name of entries) {
    if (!name.endsWith('.md')) continue;
    const content = await readTextSafe(join(srcDir, name));
    const mdcName = name.replace(/\.md$/, '.mdc');
    const mdc = `---\ndescription: ${name.replace('.md', '')} rules\nalwaysApply: true\n---\n\n${content}`;
    await writeText(join(dstDir, mdcName), mdc);
    out.push({ path: join(dstDir, mdcName), action: 'mirror' });
  }
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

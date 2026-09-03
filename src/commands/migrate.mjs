import { join, basename } from 'node:path';
import { constants } from 'node:fs';
import { createHash } from 'node:crypto';
import { unlink, rmdir, readdir, mkdir, lstat, stat, access } from 'node:fs/promises';
import { readTextSafe, writeText, exists } from '../fsx.mjs';
import { loadBackupDir, mergeClaudeSettings, settingsHasBoundaryCheckpoint } from '../harness.mjs';
import { extractSections, deepMergeJson } from '../merge.mjs';
import { render } from '../render.mjs';
import { confirm } from '../prompt.mjs';
import { installPostCommitHook } from '../git-hooks.mjs';
import { taskArtifactTemplate } from './task.mjs';
import { collectTasks, readTaskMeta, writeTaskMeta, metaRel } from './summary.mjs';
import { settingsHasSessionGate } from './session-context.mjs';

const USER_REGION_RE = /<!--\s*harness:user:begin\s*-->[\s\S]*?<!--\s*harness:user:end\s*-->/;
const EMPTY_USER_REGION = '<!-- harness:user:begin -->\n<!-- 이 마커 아래 작성한 내용은 harness가 절대 수정하지 않습니다. -->\n<!-- harness:user:end -->';

const SCRIPT_FILES = ['clone.sh', 'symlink.sh', 'delete.sh'];
const OLD_CATEGORIES = ['feature', 'fix'];

// --- Task structure migration (pre-0.6.0 → 0.6.0) ---

async function findOldTasks(targetDir) {
  const docs = join(targetDir, 'docs');
  if (!(await exists(docs))) return [];

  const found = [];
  const userDirs = (await readdir(docs, { withFileTypes: true }))
    .filter(e => e.isDirectory()).map(e => e.name);

  for (const user of userDirs) {
    for (const cat of OLD_CATEGORIES) {
      const catPath = join(docs, user, cat);
      if (!(await exists(catPath))) continue;
      const entries = await readdir(catPath, { withFileTypes: true }).catch(() => []);
      for (const e of entries) {
        if (e.isDirectory()) {
          found.push({ user, category: cat, name: e.name, oldPath: join(catPath, e.name) });
        }
      }
    }
  }
  return found;
}

async function migrateTaskStructure(ctx) {
  const { targetDir } = ctx;
  const oldTasks = await findOldTasks(targetDir);

  if (oldTasks.length === 0) {
    console.log('  task structure: up to date (no pre-0.6.0 tasks found)');
    return false;
  }

  console.log(`\nFound ${oldTasks.length} pre-0.6.0 task(s) to migrate:`);
  for (const { user, category, name } of oldTasks) {
    console.log(`  docs/${user}/${category}/${name}/ → docs/${user}/${name}/`);
  }
  console.log('\nChanges per task:');
  console.log('  spec.md      → <name>-spec.md');
  console.log('  plan.md      → <name>-plan.md');
  console.log('  handoff.md + artifact.md → <name>-handoff.md');
  console.log('Also: update .harness/active.json, create user task index, task_summary.md, post-commit hook');

  const ok = ctx.flags.yes || await confirm('\nMigrate task structure to v0.6.0?', { defaultYes: true });
  if (!ok) { console.log('Skipped task structure migration.'); return false; }

  const migratedUsers = new Set();

  for (const { user, category, name, oldPath } of oldTasks) {
    const newDir = join(targetDir, 'docs', user, name);

    if (await exists(newDir)) {
      console.log(`  skip (already exists): docs/${user}/${name}/`);
    } else {
      await mkdir(newDir, { recursive: true });

      const spec = await readTextSafe(join(oldPath, 'spec.md'));
      if (spec !== null) await writeText(join(newDir, `${name}-spec.md`), spec);

      const plan = await readTextSafe(join(oldPath, 'plan.md'));
      if (plan !== null) await writeText(join(newDir, `${name}-plan.md`), plan);

      const handoff = (await readTextSafe(join(oldPath, 'handoff.md')) || '').trim();
      const artifact = (await readTextSafe(join(oldPath, 'artifact.md')) || '').trim();
      const combined = [
        `# ${name} — Handoff\n`,
        handoff || '(세션 종료 시 post-commit hook이 자동 갱신합니다)',
        artifact ? `\n## Artifact\n\n${artifact}` : '',
      ].filter(Boolean).join('\n') + '\n';
      await writeText(join(newDir, `${name}-handoff.md`), combined);

      console.log(`  ✓ migrated: docs/${user}/${name}/`);
    }

    // Remove old files + dir
    for (const f of ['spec.md', 'plan.md', 'handoff.md', 'artifact.md']) {
      const p = join(oldPath, f);
      if (await exists(p)) await unlink(p).catch(() => {});
    }
    await rmdir(oldPath).catch(() => {});

    // Remove category dir if empty
    const catPath = join(targetDir, 'docs', user, category);
    const remaining = await readdir(catPath).catch(() => ['_']);
    if (remaining.length === 0) await rmdir(catPath).catch(() => {});

    migratedUsers.add(user);
  }

  // Update active.json if it has the old format { member, category, name }
  const activePath = join(targetDir, '.harness/active.json');
  const activeRaw = await readTextSafe(activePath);
  if (activeRaw) {
    try {
      const active = JSON.parse(activeRaw);
      if (active && active.member && active.category && active.name) {
        const updated = {
          user: active.member,
          task: active.name,
          path: `docs/${active.member}/${active.name}`,
          switchedAt: active.switchedAt || new Date().toISOString(),
        };
        await writeText(activePath, JSON.stringify(updated, null, 2) + '\n');
        console.log('  ✓ updated .harness/active.json');
      }
    } catch {}
  }

  // Create <user>-task.md index for each migrated user
  for (const user of migratedUsers) {
    const indexPath = join(targetDir, 'docs', user, `${user}-task.md`);
    if (!(await exists(indexPath))) {
      const userTasks = oldTasks.filter(t => t.user === user).map(t => t.name);
      let content = `# ${user} — Tasks\n\n## Open\n`;
      for (const t of userTasks) content += `- ${t}\n`;
      content += '\n## Completed\n';
      await writeText(indexPath, content);
      console.log(`  ✓ created docs/${user}/${user}-task.md`);
    }
  }

  // Create docs/task_summary.md
  const summaryPath = join(targetDir, 'docs', 'task_summary.md');
  if (!(await exists(summaryPath))) {
    let content = '# Task Summary\n\n| User | Task | Status | Created |\n|------|------|--------|---------|\n';
    for (const { user, name } of oldTasks) {
      content += `| ${user} | ${name} | 🔄 open | (migrated) |\n`;
    }
    await writeText(summaryPath, content);
    console.log('  ✓ created docs/task_summary.md');
  }

  await installPostCommitHook(targetDir);
  console.log('  ✓ post-commit hook installed');

  return true;
}

// --- Task structure migration (0.6.0 → 0.7.x: split artifact.md) ---
//
// 0.6.0 task = <name>-{spec,plan,handoff}.md, where handoff.md folds in an
// optional "## Artifact" section. 0.7.x splits artifact into its own file.
// We ONLY restructure files — spec/plan bodies are user-authored and are never
// touched (no Ambiguity/Ontology section injection: it would be a dead post-hoc
// gate and risk corrupting hand-written docs).

async function find06Tasks(targetDir) {
  const docs = join(targetDir, 'docs');
  if (!(await exists(docs))) return [];

  const found = [];
  const userDirs = (await readdir(docs, { withFileTypes: true }))
    .filter(e => e.isDirectory()).map(e => e.name);

  for (const user of userDirs) {
    const userPath = join(docs, user);
    const taskDirs = (await readdir(userPath, { withFileTypes: true }).catch(() => []))
      .filter(e => e.isDirectory()).map(e => e.name);
    for (const name of taskDirs) {
      const taskPath = join(userPath, name);
      const hasHandoff = await exists(join(taskPath, `${name}-handoff.md`));
      const hasArtifact = await exists(join(taskPath, `${name}-artifact.md`));
      if (hasHandoff && !hasArtifact) found.push({ user, name, taskPath });
    }
  }
  return found;
}

function splitArtifactFromHandoff(handoff) {
  const m = handoff.match(/\n##\s+Artifact\s*\n+/);
  if (!m) return { newHandoff: null, artifactBody: '' };
  const newHandoff = handoff.slice(0, m.index).trimEnd() + '\n';
  const artifactBody = handoff.slice(m.index + m[0].length).trim();
  return { newHandoff, artifactBody };
}

export async function migrateTaskTo07(ctx) {
  const { targetDir } = ctx;
  const tasks = await find06Tasks(targetDir);

  if (tasks.length === 0) {
    console.log('  task structure: up to date (no 0.6.0 tasks to split artifact.md)');
    return false;
  }

  console.log(`\nFound ${tasks.length} task(s) to upgrade to 0.7.x (4-file structure):`);
  for (const { user, name } of tasks) {
    console.log(`  docs/${user}/${name}/ → + ${name}-artifact.md`);
  }
  console.log('\nChanges per task:');
  console.log('  handoff.md "## Artifact" 섹션 → 별도 <name>-artifact.md 로 분리');
  console.log('  (없으면 빈 artifact.md scaffold 생성)');
  console.log('  spec.md / plan.md 는 건드리지 않음');

  const ok = ctx.flags.yes || await confirm('\nUpgrade task structure to 0.7.x?', { defaultYes: true });
  if (!ok) { console.log('Skipped 0.7.x task upgrade.'); return false; }

  for (const { user, name, taskPath } of tasks) {
    const handoffPath = join(taskPath, `${name}-handoff.md`);
    const artifactPath = join(taskPath, `${name}-artifact.md`);

    const handoff = await readTextSafe(handoffPath);
    const { newHandoff, artifactBody } = handoff !== null
      ? splitArtifactFromHandoff(handoff)
      : { newHandoff: null, artifactBody: '' };

    const artifactContent = artifactBody
      ? `# ${name} — Artifact\n\n${artifactBody}\n`
      : taskArtifactTemplate(name);
    await writeText(artifactPath, artifactContent);

    if (newHandoff !== null) await writeText(handoffPath, newHandoff);

    console.log(`  ✓ upgraded: docs/${user}/${name}/`);
  }

  return true;
}

// --- Backup dir script migration (pre-v0.3 → v0.3+) ---

async function migrateBackupScripts(ctx) {
  const { root, targetDir } = ctx;

  const backupDir = await loadBackupDir(targetDir);
  if (!backupDir) {
    console.log('  backup scripts: no backup dir configured — skipping');
    return false;
  }

  const toMigrate = [];
  for (const f of SCRIPT_FILES) {
    const content = await readTextSafe(join(backupDir, f));
    if (content !== null) {
      toMigrate.push({ f, inBackup: join(backupDir, f), inProject: join(targetDir, f) });
    }
  }

  if (toMigrate.length === 0) {
    console.log('  backup scripts: up to date (no scripts in backup dir)');
    return false;
  }

  console.log(`\nFound ${toMigrate.length} script(s) in backup dir to move to project root:`);
  for (const { f } of toMigrate) console.log(`  ${f}`);
  console.log(`  backup: ${backupDir}`);
  console.log(`  project: ${targetDir}`);

  const ok = ctx.flags.yes || await confirm('\nMove scripts to project root?', { defaultYes: true });
  if (!ok) { console.log('Skipped script migration.'); return false; }

  const tplDir = join(root, 'templates');
  for (const { f, inBackup, inProject } of toMigrate) {
    const tpl = await readTextSafe(join(tplDir, f));
    if (!tpl) {
      console.warn(`  warn: template not found for ${f}, skipping`);
      continue;
    }
    const rendered = tpl.replace(/\{\{BACKUP_DIR\}\}/g, backupDir);
    await writeText(inProject, rendered, { mode: 0o755 });
    await unlink(inBackup);
    console.log(`  ✓ ${f}: moved to project root`);
  }

  return true;
}

// --- Refresh stale project-root scripts (any → current template) ---

async function refreshProjectScripts(ctx) {
  const { root, targetDir } = ctx;

  const backupDir = await loadBackupDir(targetDir);
  if (!backupDir) {
    console.log('  script refresh: no backup dir configured — skipping');
    return false;
  }

  const tplDir = join(root, 'templates');
  const stale = [];
  for (const f of SCRIPT_FILES) {
    const existing = await readTextSafe(join(targetDir, f));
    if (existing === null) continue;
    const tpl = await readTextSafe(join(tplDir, f));
    if (!tpl) continue;
    const rendered = tpl.replace(/\{\{BACKUP_DIR\}\}/g, backupDir);
    if (existing !== rendered) stale.push({ f, rendered });
  }

  if (stale.length === 0) {
    console.log('  script refresh: scripts are up to date');
    return false;
  }

  console.log(`\nFound ${stale.length} stale script(s) in project root (old destructive 'rm -rf' versions):`);
  for (const { f } of stale) console.log(`  ${f}`);
  console.log('\nRefresh will replace them with the current safe templates:');
  console.log('  - delete.sh: backup symlink만 제거, 실파일은 skip');
  console.log('  - symlink.sh: 실파일이 백업과 동일할 때만 교체, 다르면 skip');
  console.log('  - clone.sh: rsync --update (백업 파일 삭제 없음)');

  const ok = ctx.flags.yes || await confirm('\nRefresh scripts to current safe templates?', { defaultYes: true });
  if (!ok) { console.log('Skipped script refresh.'); return false; }

  for (const { f, rendered } of stale) {
    await writeText(join(targetDir, f), rendered, { mode: 0o755 });
    console.log(`  ✓ refreshed: ${f}`);
  }
  return true;
}

// --- Refresh installed .claude hooks (known stock versions → current template) ---
//
// Template fixes never reach an existing install on their own: copyStaticAssets copies
// hooks with skipExisting, so init leaves installed copies untouched. This is the
// explicit opt-in delivery path — PR #29's jq-fallback fail-open fix ships through here.
// An installed hook is refreshed ONLY when its bytes match a version we actually
// shipped (sha256 table below). Anything else is treated as user-customized and never
// overwritten; we print a notice and leave it for manual review.

export const CLAUDE_HOOK_FILES = [
  'block-dangerous-git.sh',
  'protect-files.sh',
  'pre-commit-check.sh',
  'auto-format.sh',
];

// Refreshed by the same stock-sha rule but outside the jq matrix (no fallback block):
// the observability logger and the boundary checkpoint shim. Until they were listed
// here a template fix to either file had no delivery path to an existing install.
export const REFRESHABLE_HOOK_FILES = [...CLAUDE_HOOK_FILES, 'boundary-checkpoint.sh', 'observe-tools.mjs'];

// sha256 of every template version ever shipped per hook, EXCLUDING the current
// template (that case is compared directly). Provenance: git history of
// templates/.claude/hooks — the git blob sha is noted per entry, and
// tests/fixtures/stock-hooks holds the same bodies so tests/migrate-hooks.test.mjs
// can assert this table never drifts from them.
export const KNOWN_STOCK_HOOK_SHA256 = {
  'block-dangerous-git.sh': [
    '7fe0735fee13b7e5ac2aeecff90b3463b080848a9509fe180376583b2c160433', // 9198ed24 2026-07-02 도입판
    '4146387004a9139c4318ed75bcbfe41b838ca476caedea0361ddf9ffec0cee69', // 8367653a 상류 출처 표기판
    '2c8671affb60fee88f1e16467a23a13dde4df2ff80cb9d102036536903ea11ac', // e1c87ee4 PR #29 (tool_input 스코프 이전)
    '87f05509b6bc67c528e4a8f0ead3962aed754556765763fcb6e606bcc702c106', // 599cd2d4 tool_input 스코프판 (audit-cleanup 이전)
  ],
  'protect-files.sh': [
    '8031a9db866e2d79e9ed2837f6b12214e1a4cb3a91e510c1c89bbe0ac7962e63', // 286e227e initial
    '2fb1c2ff7fbd956503634a641596039cf452ac07c8fa5c7fad5a003c7e8cbe42', // 75858c28 PR #29
    '07459eed771b5b6d467877a1c34147a1d9bf634d1cf9873c08b0113da61c8ecf', // bf6c4f6e tool_input 스코프판 (audit-cleanup 이전, substring 패턴)
  ],
  'pre-commit-check.sh': [
    '97b4e1802c5ab75e463c8280d055e0a723390673bacf7116f98c63d3c87d4297', // 813a2212 initial (pnpm 하드코딩판)
    '239cedf809c22cfcf09b07ac5f9d21a98da88bc85aaadd0cd577daadaf5de392', // d4662b9b detect_pm판
    'f5b79e0c0fd2cd54a284a7c4f3139681ad95b761cf45738282523f1c85bdcf0d', // d2132caf PR #29
  ],
  'auto-format.sh': [
    'ba2ab843b6609543748e66d96ba26dbb2982444e8f24c4af10910ab8546e8327', // 58c4fe2e initial
    '11db4b4dc6f5a1f152d5bc7b7a9065c92ff07a7e4d30b06b549267e6363be019', // 775c0d56 PR #29
  ],
  'boundary-checkpoint.sh': [
    '452216fef5edb09a6fa6e14d6675222e06446c72c96abce0ff1d16156a545bc4', // 63c8862f 도입판 (CLI 부재 시 exit 127)
  ],
  'observe-tools.mjs': [
    '1c159268e0f24d802eec75d8304e610ce425db69d877c673d126b71ffb3960ba', // 7bc95dd0 도입판 (URL.pathname 비교 — 공백 경로에서 no-op)
  ],
};

export async function refreshClaudeHooks(ctx) {
  const { root, targetDir } = ctx;
  const stale = [];
  for (const name of REFRESHABLE_HOOK_FILES) {
    const rel = `.claude/hooks/${name}`;
    const installed = await readTextSafe(join(targetDir, rel));
    if (installed === null) continue; // not installed — nothing to refresh

    const tpl = await readTextSafe(join(root, 'templates', rel));
    if (!tpl || installed === tpl) continue; // no template / already current

    // The pnpm signature predates the sha table: it also catches byte-drifted copies
    // of the very old pre-commit hook (the original refresh logic, kept as a net).
    const sha256 = createHash('sha256').update(installed).digest('hex');
    const knownStock = (KNOWN_STOCK_HOOK_SHA256[name] || []).includes(sha256)
      || (name === 'pre-commit-check.sh'
        && installed.includes('pnpm tsc --noEmit') && !installed.includes('detect_pm'));
    if (knownStock) {
      stale.push({ name, rel, tpl });
    } else {
      console.log(`  ${name}: differs from every known shipped version — looks customized, skipping (manual review; 최신 템플릿: templates/${rel})`);
    }
  }

  if (stale.length === 0) return false;

  console.log(`\nFound ${stale.length} stale Claude hook(s) — known shipped version, superseded:`);
  for (const { name } of stale) console.log(`  ${name}`);
  console.log('  → 최신 템플릿으로 갱신 (jq 부재 시 훅이 조용히 무력화되던 fail-open 수정 포함)');

  const ok = ctx.flags.yes || await confirm('\nRefresh Claude hooks to current templates?', { defaultYes: true });
  if (!ok) { console.log('Skipped hook refresh.'); return false; }

  for (const { rel, tpl } of stale) {
    await writeText(join(targetDir, rel), tpl, { mode: 0o755 });
    console.log(`  ✓ refreshed: ${rel}`);
  }
  return true;
}

// --- Task index label rename (active → open) ---
//
// The open-tasks index used "active" (## Active / 🔄 active), colliding with
// .harness/active.json's pointer sense. Harmonize existing installs to "open".
// task.mjs reads both labels, so this is cosmetic consistency, not correctness.

export async function migrateTaskIndexLabels(ctx) {
  const { targetDir } = ctx;
  const docsDir = join(targetDir, 'docs');
  let changed = false;

  let entries = [];
  try { entries = await readdir(docsDir, { withFileTypes: true }); } catch { entries = []; }
  for (const ent of entries) {
    if (!ent.isDirectory()) continue;
    const idxPath = join(docsDir, ent.name, `${ent.name}-task.md`);
    const body = await readTextSafe(idxPath);
    if (body && body.includes('## Active\n')) {
      await writeText(idxPath, body.replace('## Active\n', '## Open\n'));
      console.log(`  ✓ ${ent.name}-task.md: '## Active' → '## Open'`);
      changed = true;
    }
  }

  const summaryPath = join(docsDir, 'task_summary.md');
  const sum = await readTextSafe(summaryPath);
  if (sum && sum.includes('🔄 active')) {
    await writeText(summaryPath, sum.replaceAll('🔄 active', '🔄 open'));
    console.log(`  ✓ task_summary.md: '🔄 active' → '🔄 open'`);
    changed = true;
  }

  if (!changed) console.log('  task index labels: up to date');
  return changed;
}

// --- SSOT inversion (0.7.x legacy → AGENTS.md core) ---
//
// Legacy = CLAUDE.md real file holds all sections (principles/stack/roles/protocol +
// workflow) and AGENTS.md/GEMINI.md/.cursorrules are symlinks to it.
// New = AGENTS.md is the canonical core real file; CLAUDE.md is a thin file that
// `@AGENTS.md` imports + carries only its own section. GEMINI.md is not recreated
// (Gemini is no longer a member — D7); a legacy alias is just removed. We reassemble from the
// existing marker blocks (no text heuristics) so user-rendered content (real stack
// commands, customizations) and the user region are preserved verbatim.

export async function migrateToAgentsMd(ctx) {
  const { targetDir } = ctx;
  const claudePath = join(targetDir, 'CLAUDE.md');
  const claude = await readTextSafe(claudePath);
  if (!claude) return false;

  // Already on the new structure? (AGENTS.md is a real file carrying the core)
  const agentsPath = join(targetDir, 'AGENTS.md');
  const agentsSt = await lstat(agentsPath).catch(() => null);
  if (agentsSt && !agentsSt.isSymbolicLink()) {
    const body = await readTextSafe(agentsPath);
    if (body && body.includes('harness:section="protocol"')) return false;
  }

  // Only migrate a harness-managed CLAUDE.md (has at least one core marker).
  const sections = extractSections(claude);
  const hasCore = ['protocol', 'principles', 'roles', 'stack'].some(s => sections[s]);
  if (!hasCore) return false;

  console.log('\nFound legacy CLAUDE.md master → migrating to AGENTS.md core structure:');
  console.log('  CLAUDE.md (master)        → AGENTS.md (core) + thin CLAUDE.md');
  console.log('  AGENTS.md link            → real core file; legacy GEMINI.md link removed');
  console.log('  .cursorrules              → removed (Cursor reads AGENTS.md natively)');
  console.log('  backup                    → CLAUDE.md.bak');

  const ok = ctx.flags.yes || await confirm('\nMigrate to AGENTS.md core structure?', { defaultYes: true });
  if (!ok) { console.log('Skipped AGENTS.md migration.'); return false; }

  const name = basename(targetDir);

  // 1. Back up the legacy master conservatively.
  const bakPath = join(targetDir, 'CLAUDE.md.bak');
  if (!(await exists(bakPath))) {
    await writeText(bakPath, claude);
    console.log('  ✓ backed up CLAUDE.md → CLAUDE.md.bak');
  }

  // 2. AGENTS.md (core) — reassemble from the existing core blocks (preserve rendered content).
  const coreBlocks = ['principles', 'stack', 'roles', 'protocol']
    .map(s => sections[s]).filter(Boolean).join('\n\n');
  const agents =
    `# ${name} — AI Team Contract (Core)\n\n` +
    '> 이 파일(`AGENTS.md`)이 모든 에이전트가 공유하는 단일 소스(SSOT)입니다 — agents.md 오픈 표준.\n' +
    '> `CLAUDE.md` 는 `@AGENTS.md` 를 import 하는 얇은 파일이며, 이 코어를 복제하지 않습니다.\n\n' +
    coreBlocks + '\n';

  // 3. thin CLAUDE.md — @AGENTS.md import + workflow block + preserved user region.
  const userMatch = claude.match(USER_REGION_RE);
  const userBlock = userMatch ? userMatch[0] : EMPTY_USER_REGION;
  const claudeThin =
    `@AGENTS.md\n\n# ${name} — Claude Code\n\n` +
    (sections.workflow ? sections.workflow + '\n\n' : '') +
    userBlock + '\n';

  // 4. Write files, replacing any alias symlinks with real files.
  if (agentsSt && agentsSt.isSymbolicLink()) await unlink(agentsPath);
  await writeText(agentsPath, agents);

  await writeText(claudePath, claudeThin);

  // A legacy GEMINI.md alias is removed, not rewritten; a real GEMINI.md the team
  // authored themselves is left alone.
  const geminiPath = join(targetDir, 'GEMINI.md');
  const geminiSt = await lstat(geminiPath).catch(() => null);
  if (geminiSt && geminiSt.isSymbolicLink()) await unlink(geminiPath);

  const cursorPath = join(targetDir, '.cursorrules');
  if (await exists(cursorPath)) await unlink(cursorPath);

  console.log('  ✓ AGENTS.md (core) + thin CLAUDE.md written, legacy GEMINI.md alias/.cursorrules removed');
  return true;
}

// --- SessionStart task-gate hook (pre-0.9 settings.json → + SessionStart) ---
//
// `migrate` is structure-only and never touched .claude/settings.json, so projects
// scaffolded before 0.9 don't get the SessionStart task-gate from migrate alone
// (init's deep-merge is the other path). This adds just the SessionStart hook,
// pulled from the template as the single source so the command never drifts.

export async function migrateSessionStartHook(ctx) {
  const { root, targetDir } = ctx;
  const settingsPath = join(targetDir, '.claude/settings.json');
  const raw = await readTextSafe(settingsPath);
  if (raw === null) {
    console.log('  SessionStart task-gate: no .claude/settings.json — skipping (run init)');
    return false;
  }
  let settings;
  try { settings = JSON.parse(raw); } catch {
    console.log('  SessionStart task-gate: settings.json parse 실패 — 건너뜀');
    return false;
  }

  if (settingsHasSessionGate(settings)) {
    console.log('  SessionStart task-gate: up to date');
    return false;
  }

  const tplRaw = await readTextSafe(join(root, 'templates/.claude/settings.json'));
  const tplSessionStart = tplRaw ? JSON.parse(tplRaw).hooks?.SessionStart : null;
  if (!tplSessionStart) {
    console.log('  SessionStart task-gate: 템플릿에 SessionStart 없음 — 건너뜀');
    return false;
  }

  console.log('\nFound settings.json without SessionStart task-gate hook:');
  console.log('  + hooks.SessionStart → harness-team session-context (활성 task 유무 주입)');

  const ok = ctx.flags.yes || await confirm('\nAdd SessionStart task-gate hook?', { defaultYes: true });
  if (!ok) { console.log('Skipped SessionStart task-gate migration.'); return false; }

  settings.hooks = settings.hooks || {};
  settings.hooks.SessionStart = deepMergeJson(settings.hooks.SessionStart, tplSessionStart);
  await writeText(settingsPath, JSON.stringify(settings, null, 2) + '\n');
  console.log('  ✓ added SessionStart task-gate to .claude/settings.json');
  return true;
}

// --- PreToolUse boundary checkpoint (pre-boundary settings.json → + hook) ---
//
// Keep this deliberately narrower than init: only the template's PreToolUse
// groups participate. mergeClaudeSettings() recognizes the exact old default
// protect group and upgrades it; every other group is preserved and receives a
// non-destructive union with the template group. The hook script is copied only
// when absent, so an installed user-customized script is never overwritten.

export async function migrateBoundaryCheckpointHook(ctx) {
  const { root, targetDir } = ctx;
  const settingsPath = join(targetDir, '.claude/settings.json');
  const raw = await readTextSafe(settingsPath);
  if (raw === null) {
    console.log('  PreToolUse boundary checkpoint: no .claude/settings.json — skipping (run init)');
    return null;
  }

  let settings;
  try { settings = JSON.parse(raw); } catch {
    console.log('  PreToolUse boundary checkpoint: settings.json parse 실패 — 건너뜀');
    return null;
  }

  const tplSettingsRaw = await readTextSafe(join(root, 'templates/.claude/settings.json'));
  let tplBoundaryGroup;
  try {
    const tplPreToolUse = tplSettingsRaw ? JSON.parse(tplSettingsRaw).hooks?.PreToolUse : null;
    tplBoundaryGroup = Array.isArray(tplPreToolUse)
      ? tplPreToolUse.find(group => group?.hooks?.some(h => h?.type === 'command' && h.command === './.claude/hooks/boundary-checkpoint.sh'))
      : null;
  } catch { tplBoundaryGroup = null; }
  if (!tplBoundaryGroup) {
    console.log('  PreToolUse boundary checkpoint: 템플릿에 boundary hook 없음 — 건너뜀');
    return null;
  }

  const merged = mergeClaudeSettings(settings, { hooks: { PreToolUse: [tplBoundaryGroup] } });
  // Customized Edit-only groups are respected here (doctor still warns about Write).
  const settingsChanged = !settingsHasBoundaryCheckpoint(settings, { requireWrite: false })
    && JSON.stringify(merged) !== JSON.stringify(settings);
  const scriptRel = '.claude/hooks/boundary-checkpoint.sh';
  const scriptPath = join(targetDir, scriptRel);
  let scriptEntry;
  try {
    scriptEntry = await lstat(scriptPath);
  } catch (err) {
    if (err?.code !== 'ENOENT') {
      console.log(`  PreToolUse boundary checkpoint: ${scriptRel} 확인 실패 — 건너뜀`);
      return null;
    }
  }
  if (scriptEntry) {
    let scriptReady = false;
    try {
      const scriptTarget = scriptEntry.isSymbolicLink() ? await stat(scriptPath) : scriptEntry;
      if (scriptTarget.isFile()) {
        await access(scriptPath, constants.X_OK);
        scriptReady = true;
      }
    } catch {
      scriptReady = false;
    }
    if (!scriptReady) {
      console.log(`  PreToolUse boundary checkpoint: ${scriptRel}이 실행 가능한 일반 파일이 아닙니다 — settings.json을 변경하지 않습니다`);
      return null;
    }
  }
  const scriptMissing = !scriptEntry;
  const templateScript = scriptMissing
    ? await readTextSafe(join(root, 'templates', scriptRel))
    : null;
  if (scriptMissing && !templateScript) {
    console.log(`  ${scriptRel}: 템플릿 없음 — 건너뜀`);
    return null;
  }
  if (!settingsChanged && !scriptMissing) {
    console.log('  PreToolUse boundary checkpoint: up to date');
    return false;
  }

  console.log('\nFound incomplete PreToolUse boundary checkpoint migration:');
  if (settingsChanged) console.log('  + hooks.PreToolUse → boundary-checkpoint.sh (custom groups preserved)');
  if (scriptMissing) console.log(`  + ${scriptRel}`);

  const ok = ctx.flags.yes || await confirm('\nAdd PreToolUse boundary checkpoint hook?', { defaultYes: true });
  if (!ok) { console.log('Skipped PreToolUse boundary checkpoint migration.'); return false; }

  if (settingsChanged) {
    await writeText(settingsPath, JSON.stringify(merged, null, 2) + '\n');
    console.log('  ✓ added PreToolUse boundary checkpoint to .claude/settings.json');
  }
  if (scriptMissing) {
    await writeText(scriptPath, templateScript, { mode: 0o755 });
    console.log(`  ✓ added ${scriptRel}`);
  }
  return true;
}

// --- Ledger → per-task meta.json backfill (0.15.x → 0.16.0) ---
//
// Before 0.16.0 the aggregate ledger was the only home for two facts, so the switch to
// derived rendering cannot infer them from the task directory alone:
//   - `created` — `done` overwrote `- <name> (created …)` with `- ✅ <name>`, so for a
//     completed task docs/task_summary.md is the last surviving source.
//   - done-ness — the `## <ISO> — 완료` handoff marker predates only some closures.
//     Measured on a real install: 6 rows marked `✅ done`, 4 handoffs carrying the marker.
// Without this backfill every pre-0.16.0 task renders as open with an empty date.
async function backfillTaskMeta(ctx) {
  const tasks = await collectTasks(ctx.targetDir);
  const written = [];

  for (const task of tasks) {
    if (await readTaskMeta(ctx.targetDir, task.user, task.task)) continue;
    await writeTaskMeta(ctx.targetDir, task.user, task.task, {
      user: task.user,
      task: task.task,
      created: task.created || '',
      status: task.status || 'open',
      closedAt: null,
    });
    written.push(metaRel(task.user, task.task));
  }

  if (written.length) {
    console.log(`  ✓ backfilled ${written.length} task meta file(s) from the ledger`);
  }
  return written.length > 0;
}

export async function runMigrate(ctx) {
  console.log(`harness-team migrate → ${ctx.targetDir}`);

  const agentsMigrated = await migrateToAgentsMd(ctx);

  const taskMigrated = await migrateTaskStructure(ctx);
  const taskUpgraded = await migrateTaskTo07(ctx);
  const scriptMoved = await migrateBackupScripts(ctx);
  const scriptRefreshed = await refreshProjectScripts(ctx);
  const claudeHooksRefreshed = await refreshClaudeHooks(ctx);
  const taskLabelsRenamed = await migrateTaskIndexLabels(ctx);
  const hookMigrated = await migrateSessionStartHook(ctx);
  const boundaryHookMigrated = await migrateBoundaryCheckpointHook(ctx);
  const metaBackfilled = await backfillTaskMeta(ctx);

  if (boundaryHookMigrated === null) {
    console.log('\nMigration incomplete — resolve the PreToolUse boundary checkpoint issue and rerun.');
    return;
  }

  if (!agentsMigrated && !taskMigrated && !taskUpgraded && !scriptMoved && !scriptRefreshed && !claudeHooksRefreshed && !taskLabelsRenamed && !hookMigrated && !boundaryHookMigrated && !metaBackfilled) {
    console.log('\nNothing to migrate — project is already up to date.');
    return;
  }

  console.log('\n✓ Migration complete.');
  if (scriptMoved || scriptRefreshed) {
    console.log('  Run ./clone.sh, ./symlink.sh, ./delete.sh from the project root.');
  }
}

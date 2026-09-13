import { join, basename } from 'node:path';
import { constants } from 'node:fs';
import { createHash } from 'node:crypto';
import { unlink, rmdir, readdir, mkdir, lstat, stat, access } from 'node:fs/promises';
import { readTextSafe, writeText, exists } from '../fsx.mjs';
import { loadBackupDir, mergeClaudeSettings, settingsHasBoundaryCheckpoint, mirrorCursorRules, AGENT_FILE_TEMPLATES, isLegacyCodexSessionCommand, withCodexHookFlag } from '../harness.mjs';
import { detectStack } from '../detect-stack.mjs';
import { loadRenderState } from '../render-state.mjs';
import { extractSections, deepMergeJson, simpleDiff } from '../merge.mjs';
import { render } from '../render.mjs';
import { confirm } from '../prompt.mjs';
import { installPostCommitHook } from '../git-hooks.mjs';
import {
  taskArtifactTemplate, parseReviewMarkers, evidenceWindowStart, isVerifyKind,
  parseDoneEvidenceDeclaration, VERIFY_KIND_SUFFIXES,
} from './task.mjs';
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

// --- Refresh installed .claude assets (known stock versions → current template) ---
//
// Template fixes never reach an existing install on their own: copyStaticAssets copies
// hooks, skills and rules with skipExisting, so init leaves installed copies untouched.
// copyTree's skipExisting is per FILE, so a *new* template file does arrive on re-init
// while a *modified* one never does — that asymmetry is why this path exists. It is the
// explicit opt-in delivery path: PR #29's jq-fallback fail-open fix and the new-feature
// Phase 3 slicing discipline both ship through here.
// An installed file is refreshed ONLY when its bytes match a version we actually
// shipped (sha256 tables below). Anything else is treated as user-customized and never
// overwritten; we print a notice and leave it for manual review.
//
// docs/ seed (README.md, decisions.md, .gitkeep) is deliberately NOT refreshable — it is
// team-authored after install; see copyStaticAssets' "preserve team work" comment.

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
    '9aa8b5d0206a732e07062213000884a9f0da1dbd29517754e30b008d9aafae26', // 9822cd7f audit-cleanup판 (END 열거 경계 — `push --force;` 우회 이전)
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
    '524cf3b6cb5952a02c4464a3b46b47dbef8abb82388ea786d50ca8ca17ca24ef', // 757d115f tool_input 스코프판 (`git -C`·`--no-pager` 우회 이전)
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

// skills·rules: 같은 provenance 규칙을 쓰되 **templates/ 기준 상대경로**로 키를 잡는다 —
// 스킬 3종이 모두 basename `SKILL.md`라 훅처럼 파일명으로는 구분되지 않는다.
//
// 목록은 **고정**이다. 디렉터리를 readdir로 훑지 않는다 — `.claude/rules/`는 소유권이 섞인
// 표면이라(harness-promote가 사용자 규칙을 여기에 쓴다) 훑으면 승격된 규칙마다 매번
// "looks customized" 경고가 찍힌다.
export const REFRESHABLE_TEMPLATE_FILES = [
  '.claude/skills/fix-bug/SKILL.md',
  '.claude/skills/new-feature/SKILL.md',
  '.claude/skills/verify/SKILL.md',
  '.claude/rules/navigation.md',
  '.claude/rules/state-management.md',
  '.claude/rules/styling.md',
  '.claude/rules/testing.md',
];

// sha256 of every template version ever shipped per file, EXCLUDING the current template
// (compared directly). Provenance: git history of templates/<rel> — the git blob sha and
// the commit that introduced it are noted per entry, and tests/fixtures/stock-templates
// holds the same bodies so tests/migrate-templates.test.mjs can assert this table never
// drifts from them.
export const KNOWN_STOCK_TEMPLATE_SHA256 = {
  '.claude/skills/fix-bug/SKILL.md': [
    'aa65e25d9525b0f78070037a1d2adc97df76dd2b72ca23a70c178eb084aa9b62', // aecdc528 2026-04-16-6948aa73
    '334ca95ff9016900f48a29444aea37556c8120cf0fd4422d5dc8ad50d7472de5', // 5487fba3 2026-04-28-15a492fd
    'e2439cba511b60756831fa4d6ad7b30a6c4062d5b15027065585602359da8e26', // 6f3b1705 2026-04-28-bd4ec0e8
    '8e5c62c98163bf8fd5650cc3a0724c7a3789d814a5b06da245b5f9379f11f7b6', // c8a3adf2 2026-05-15-75bd1b61
    '88a84ff52d76b106898d9378e95b07683b8d8b88fd6cf58c67d88565c451917c', // a75cebfe 2026-07-02-c12adc5a
    '98b408d2e907b3b2da55378d1c64c1b01477c76f21be9fe260363f3a7985bd5d', // 2a1a52b8 2026-07-30-2bf26aa1
  ],
  '.claude/skills/new-feature/SKILL.md': [
    '9edac00609860630dccce14062824793d3777035f9a91fa7072e16eba776fd39', // 613d0f35 2026-04-16-6948aa73
    '66c3ab0f42c87066e544ce8deee7fff7c9a52b56cf2052fb6989887bc2cc6744', // 0c68d16e 2026-04-28-15a492fd
    'cd65dbb0619bfd273ddba2c003d03c8c9ac94f90fa2f065eb8b23bff5f9f987c', // 8db9c0cc 2026-04-28-bd4ec0e8
    '2a8ab2d1c7cd6823f810a57c9589dcc4f642645aa50ab99902bce97e0414864b', // 633a21c3 2026-05-15-75bd1b61
    '0a8d640f7f2fedce74cbe83b41344cd36568e1efae1606fc4ec2b9b69d7ee05d', // 6dda58cc 2026-07-30-2bf26aa1
    'cf2c4b8187c5a7fa6da2d5dbc87dfbe51697456872753ea9bc0c43525b25e655', // 88aab5f3 2026-09-03-58b22848
    '1b770225bf8d4144da23a19fa60cc148c6f810e9d4db26e1a99ce98fa6cda4ba', // 77493ecd 2026-09-07-286ef8e9 (Pocock Phase 3 이전)
  ],
  '.claude/skills/verify/SKILL.md': [
    '2628e8fe0d0073992d8059df5bf7e5572db4314526ec220f732d88437bb4ab51', // 7a7c188d 2026-04-16-6948aa73
  ],
  '.claude/rules/navigation.md': [
    'c87512d28d6fc4a26c39ab1d2ba581ff8b9c56972db18d88d2b54617e2df684f', // c15783ca 2026-04-16-6948aa73
  ],
  '.claude/rules/state-management.md': [
    '0f0721c85a5064bf4c384ac5b56c707ae18c684fbd318bf7212217027fd4e961', // f1300e00 2026-04-16-6948aa73
  ],
  '.claude/rules/styling.md': [
    'c90144756daf0e10db73d9fabf7ffb91f3b63e68629d5bcd4a37e6b1d8377d0e', // 666e2601 2026-04-16-6948aa73
    '0199f2e4a583e8013194e2fcf5b4bad55a5d3a3418d4347fb259f6a324f22ed6', // f5b85c3c 2026-09-03-58b22848
  ],
  '.claude/rules/testing.md': [
    '6226fadc53d4555105e6508586c111580dea9fd91fa3b3eb6ff436cbbbdb99ca', // 824acfe3 2026-04-16-6948aa73
    '461af3ae66816f0ddd299a520e6f5fce5dcf01fb5c0b72da026eb9bfc7cf231c', // 7ff58e8b 2026-09-03-58b22848
  ],
};

// 설치본을 훑어 "stock이라 갱신해도 되는 것"만 골라낸다. 표면(훅/스킬/규칙)에 무관하다.
// 두 불변식이 여기 있다:
//   1. installed === null → continue. refresh는 갱신이지 설치가 아니다 — 비-RN 프로젝트에
//      일부러 깔지 않은 RN 전용 규칙 4종이 이 줄 때문에 새로 깔리지 않는다.
//   2. stock이 아니면 절대 쓰지 않는다. 경고만 남기고 수동 검토로 넘긴다.
async function collectStale(ctx, entries, { quiet = false } = {}) {
  const { root, targetDir } = ctx;
  const stale = [];
  for (const { rel, label, knownShas, legacyStock } of entries) {
    const installed = await readTextSafe(join(targetDir, rel));
    if (installed === null) continue; // not installed — nothing to refresh

    const tpl = await readTextSafe(join(root, 'templates', rel));
    if (!tpl || installed === tpl) continue; // no template / already current

    const sha256 = createHash('sha256').update(installed).digest('hex');
    const knownStock = knownShas.includes(sha256) || !!legacyStock?.(installed);
    if (knownStock) {
      stale.push({ label, rel, tpl, installed });
    } else if (!quiet) {
      console.log(`  ${label}: differs from every known shipped version — looks customized, skipping (manual review; 최신 템플릿: templates/${rel})`);
    }
  }
  return stale;
}

// 판정과 쓰기 사이에는 사용자 확인 프롬프트가 있다. 그 틈에 파일이 편집되거나 leaf가 symlink로
// 바뀌면 "stock만 덮는다"는 계약이 깨진다 — 쓰기 직전에 다시 확인한다.
// `.claude`·`.claude/skills` 같은 **디렉터리** symlink는 공식 구조라 그대로 통과한다(링크를 통해
// 실제 파일에 쓴다). 여기서 막는 것은 **leaf 파일 자체가 symlink인** 경우로, 그때 쓰면 링크가
// 가리키는 바깥 파일을 덮게 된다(rules promote의 codex P1과 같은 계약).
async function writeRefreshed(path, { tpl, installed, label }, opts) {
  const st = await lstat(path).catch(() => null);
  if (st?.isSymbolicLink()) {
    console.log(`  ${label}: leaf가 symlink다 — 링크 바깥으로 쓰지 않는다 (수동 검토)`);
    return false;
  }
  if (await readTextSafe(path) !== installed) {
    console.log(`  ${label}: 판정 이후 내용이 바뀌었다 — 건너뜀 (다시 실행하면 재판정한다)`);
    return false;
  }
  await writeText(path, tpl, opts);
  console.log(`  ✓ refreshed: ${label}`);
  return true;
}

export async function refreshClaudeHooks(ctx) {
  const stale = await collectStale(ctx, REFRESHABLE_HOOK_FILES.map(name => ({
    rel: `.claude/hooks/${name}`,
    label: name,
    knownShas: KNOWN_STOCK_HOOK_SHA256[name] || [],
    // The pnpm signature predates the sha table: it also catches byte-drifted copies
    // of the very old pre-commit hook (the original refresh logic, kept as a net).
    legacyStock: name === 'pre-commit-check.sh'
      ? (body) => body.includes('pnpm tsc --noEmit') && !body.includes('detect_pm')
      : undefined,
  })));

  if (stale.length === 0) return false;

  console.log(`\nFound ${stale.length} stale Claude hook(s) — known shipped version, superseded:`);
  for (const { label } of stale) console.log(`  ${label}`);
  console.log('  → 최신 템플릿으로 갱신 (jq 부재 시 훅이 조용히 무력화되던 fail-open 수정 포함)');

  const ok = ctx.flags.yes || await confirm('\nRefresh Claude hooks to current templates?', { defaultYes: true });
  if (!ok) { console.log('Skipped hook refresh.'); return false; }

  let wrote = 0;
  for (const entry of stale) {
    if (await writeRefreshed(join(ctx.targetDir, entry.rel), { ...entry, label: entry.rel }, { mode: 0o755 })) wrote++;
  }
  return wrote > 0;
}

// 훅과 같은 규칙으로 스킬·규칙 템플릿을 갱신한다. 훅과 달리 실행 파일이 아니라 mode를 주지 않는다.
const templateEntries = () => REFRESHABLE_TEMPLATE_FILES.map(rel => ({
  rel,
  label: rel,
  knownShas: KNOWN_STOCK_TEMPLATE_SHA256[rel] || [],
}));

// 설치본의 바이트가 우리가 배포한 적 있는 버전인가. doctor가 규칙 유래 경고를 억제할 때 쓴다 —
// stock 규칙은 "사용자가 스탬프를 빠뜨린 것"이 아니라 "낡은 것"이고 처방이 다르다(migrate).
export function isKnownStockTemplate(rel, body) {
  return (KNOWN_STOCK_TEMPLATE_SHA256[rel] || []).includes(createHash('sha256').update(body).digest('hex'));
}

// read-only 조회 — doctor가 쓴다. 아무것도 쓰지 않고 출력도 하지 않는다.
export async function findStaleTemplates(ctx) {
  return (await collectStale(ctx, templateEntries(), { quiet: true })).map(s => s.rel);
}

export async function refreshClaudeTemplates(ctx) {
  const stale = await collectStale(ctx, templateEntries());

  if (stale.length === 0) return false;

  console.log(`\nFound ${stale.length} stale skill/rule template(s) — known shipped version, superseded:`);
  for (const { label } of stale) console.log(`  ${label}`);
  console.log('  → 최신 템플릿으로 갱신 (init은 skipExisting이라 수정된 템플릿을 배달하지 못한다)');

  const ok = ctx.flags.yes || await confirm('\nRefresh skill/rule templates to current versions?', { defaultYes: true });
  if (!ok) { console.log('Skipped template refresh.'); return false; }

  const written = [];
  for (const entry of stale) {
    if (await writeRefreshed(join(ctx.targetDir, entry.rel), { ...entry, label: entry.rel })) written.push(entry);
  }
  if (!written.length) return false;

  // `.cursor/rules/*.mdc`는 `.claude/rules/*.md`에서 생성되는 별도 산출물이다. 미러를 다시 만들지
  // 않으면 Claude만 새 규칙을 보고 Cursor는 계속 옛 규칙을 읽는다 — doctor는 `.claude` 쪽만 보므로
  // 정상으로 돌아와 드리프트가 숨는다. `.claude/rules`를 쓰는 다른 경로(`rules promote`)와 같은 규약이다.
  if (written.some(({ rel }) => rel.startsWith('.claude/rules/'))) {
    const mirrored = (await mirrorCursorRules(ctx)).filter(r => r.action === 'mirror').length;
    if (mirrored) console.log(`  ✓ cursor mirror regenerated: ${mirrored} rule(s)`);
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


// --- 부트스트랩 안전망: 관리 절 원본 백업 + diff 경고 ---
//
// render-state.json이 없는 설치본에서 다음 init은 관리 절을 stock으로 간주해 한 번 덮어쓴다
// (spec 설계 절: "사용자 편집으로 간주"를 고르면 그 설치본은 영영 갱신되지 않는다).
// migrate는 원본과 템플릿 렌더 결과를 동시에 볼 수 있는 유일한 지점이므로, 그 1회를
// 복구 가능(백업)·가시(diff)로 만든다. 백업은 타임스탬프 디렉터리에 **누적**한다.
//
// 렌더에 쓰는 vars는 init이 --stack 없이 쓰는 것과 같다(detectStack + projectName).
// 사용자가 나중에 `init --stack X`를 주면 diff가 조금 달라질 수 있다 — 경고는 참고용이고
// 실제 보존 판정은 init의 provenance 가드가 한다.
export async function migrateManagedSectionBackup(ctx) {
  const { root, targetDir } = ctx;
  // 부트스트랩 판정은 **파일 단위**다. 전역으로 "해시가 하나라도 있으면 건너뜀"으로 하면,
  // AGENTS.md만 skip돼(symlink·마커 깨짐·템플릿 없음) CLAUDE.md 해시만 저장된 부분 상태에서
  // AGENTS.md를 복구했을 때 백업 없이 부트스트랩 교체가 일어난다 — 안전망이 비는 경로다
  // (codex 리뷰 P1). 해시가 없는 파일이 하나라도 있으면 그 파일을 백업 대상으로 본다.
  const prior = await loadRenderState(targetDir);

  const stack = await detectStack(targetDir);
  const vars = { projectName: basename(targetDir), ...stack };
  // 백업은 **누적**이다 — 덮으면 복구 대상이 사라져 안전망의 의미가 없다. 같은 초에 두 번
  // 실행되면(init 사이에 migrate를 두 번) 같은 이름이 나오므로 비어 있는 이름을 찾을 때까지 센다.
  const iso = new Date().toISOString().replace(/[-:T]/g, '').replace(/\..*$/, ''); // YYYYMMDDHHMMSS
  const stamp = `${iso.slice(0, 8)}-${iso.slice(8, 14)}`;
  const backupRoot = join(targetDir, '.harness/backup');
  let backupDir = join(backupRoot, `managed-sections-${stamp}`);
  for (let n = 2; await exists(backupDir); n++) {
    backupDir = join(backupRoot, `managed-sections-${stamp}-${n}`);
  }

  const reports = [];
  let backed = false;
  for (const [file, tplName] of AGENT_FILE_TEMPLATES) {
    // 레거시(0.7.x) 설치는 AGENTS.md가 CLAUDE.md를 가리키는 symlink다 — readTextSafe는 링크를
    // 따라가므로 엉뚱한 파일을 원본으로 삼게 된다. migrateToAgentsMd가 곧 실파일로 바꿀 것이니
    // 여기서는 건드리지 않는다(백업할 고유 내용이 링크 대상 쪽에 이미 있다).
    if (prior.sections[file]) continue; // 이 파일은 이미 provenance가 있다 — 부트스트랩이 아니다
    const st = await lstat(join(targetDir, file)).catch(() => null);
    if (st?.isSymbolicLink()) continue;
    const existing = await readTextSafe(join(targetDir, file));
    if (existing === null) continue;
    const tpl = await readTextSafe(join(root, 'templates', tplName));
    if (!tpl) continue;
    const rendered = render(tpl, vars);
    const current = extractSections(existing);
    const incoming = extractSections(rendered);
    let fileHasDrift = false;
    for (const [name, block] of Object.entries(incoming)) {
      if (current[name] === undefined || current[name] === block) continue;
      reports.push({ file, name, diff: simpleDiff(current[name], block) });
      fileHasDrift = true;
    }
    if (fileHasDrift) {
      await mkdir(backupDir, { recursive: true });
      await writeText(join(backupDir, file), existing);
      backed = true;
    }
  }

  if (!backed) return false;

  console.log('\n⚠️  관리 절이 템플릿 렌더 결과와 다릅니다 — 다음 `init`이 이 절들을 한 번 교체합니다.');
  console.log(`  원본 백업: ${backupDir}`);
  for (const { file, name, diff } of reports) {
    console.log(`\n  ${file} → harness:section="${name}"`);
    console.log(diff.split('\n').map(l => `      ${l}`).join('\n'));
  }
  console.log('\n  → 남기고 싶은 내용은 init 뒤에 백업에서 옮기세요. 이후 실행부터는 자동으로 보존됩니다.');
  return true;
}

// --- SessionStart task-gate hook (pre-0.9 settings.json → + SessionStart) ---
//
// `migrate` is structure-only and never touched .claude/settings.json, so projects
// scaffolded before 0.9 don't get the SessionStart task-gate from migrate alone
// (init's deep-merge is the other path). This adds just the SessionStart hook,
// pulled from the template as the single source so the command never drifts.

// migrate는 "구조를 최신으로 옮기는" 명령이지 "설치를 템플릿과 동일하게 만드는" 명령이 아니다.
// 템플릿의 SessionStart 그룹에는 task-gate(전역 CLI)와 observe-tools(프로젝트 내부 파일)가 함께 있다.
// 그룹 통째로 병합하면 후자까지 배선되는데, refreshClaudeHooks는 없는 파일을 설치하지 않으므로
// (installed === null → continue — 사용자가 일부러 지운 훅을 되살리지 않기 위한 불변식)
// settings가 없는 파일을 가리키는 상태로 남았다. 배선을 task-gate로 좁혀 그 상태를 없앤다.
// 사용자가 observe-tools를 원하면 init이 설치하며 배선한다.
export function narrowToSessionContext(groups) {
  if (!Array.isArray(groups)) return groups;
  return groups
    .map(group => ({
      ...group,
      hooks: (group?.hooks ?? []).filter(hook =>
        typeof hook?.command === 'string' && hook.command.includes('harness-team session-context')),
    }))
    .filter(group => group.hooks.length > 0);
}

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
  const tplSessionStart = narrowToSessionContext(tplRaw ? JSON.parse(tplRaw).hooks?.SessionStart : null);
  if (!tplSessionStart || tplSessionStart.length === 0) {
    console.log('  SessionStart task-gate: 템플릿에 session-context 훅 없음 — 건너뜀');
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

// --- Codex SessionStart 훅에 `--codex-hook` 붙이기 (0.38.3) ---
//
// Codex 는 훅의 평문 stdout 을 주입하지 않는다(2026-09-12 실측). 그래서 플래그 없는 옛 하네스 훅은
// **실행되지만 아무것도 주입하지 않는다**. `init` 의 배열 union 은 새 그룹을 *추가*할 뿐이라 옛 훅이
// 죽은 채 남는다 — 제자리에서 올려 주는 경로가 이것뿐이다(템플릿 수정이 기존 설치에 닿는 유일한 길).
// 하네스 CLI 를 부르는 커맨드만 건드린다. 사용자가 직접 쓴 훅은 이름이 달라 매칭되지 않는다.
export async function migrateCodexHookFlag(ctx) {
  const { targetDir } = ctx;
  const path = join(targetDir, '.codex/hooks.json');
  const raw = await readTextSafe(path);
  if (raw === null) {
    console.log('  Codex hook flag: no .codex/hooks.json — skipping');
    return false;
  }
  let hooks;
  try { hooks = JSON.parse(raw); } catch {
    console.log('  Codex hook flag: .codex/hooks.json parse 실패 — 건너뜀');
    return false;
  }
  const groups = hooks?.hooks?.SessionStart;
  if (!Array.isArray(groups)) {
    console.log('  Codex hook flag: up to date');
    return false;
  }

  const upgraded = [];
  for (const group of groups) {
    for (const hook of (Array.isArray(group?.hooks) ? group.hooks : [])) {
      if (hook?.type !== 'command' || !isLegacyCodexSessionCommand(hook.command)) continue;
      const before = hook.command;
      hook.command = withCodexHookFlag(before);
      upgraded.push(before);
    }
  }
  if (!upgraded.length) {
    console.log('  Codex hook flag: up to date');
    return false;
  }

  console.log(`\nFound ${upgraded.length} Codex SessionStart hook(s) without --codex-hook:`);
  console.log('  이 상태에서는 훅이 실행돼도 Codex 에 아무것도 주입되지 않습니다 (평문 stdout 은 무시됩니다).');
  for (const cmd of upgraded) console.log(`  - ${cmd.slice(0, 100)}${cmd.length > 100 ? '…' : ''}`);

  const ok = ctx.flags.yes || await confirm('\nAdd --codex-hook to these hook command(s)?', { defaultYes: true });
  if (!ok) { console.log('Skipped Codex hook flag migration.'); return false; }

  await writeText(path, JSON.stringify(hooks, null, 2) + '\n');
  console.log(`  ✓ .codex/hooks.json — ${upgraded.length} command(s) upgraded`);
  return true;
}

// --- 구 task → CLI 소유 리뷰 증거 채택 (0.37.0 후속, opt-in) ---
//
// 0.37.0 이후 `verify: required` 의 정본은 meta 의 `reviews[]` 다. 그 키가 없는 구 task 는 종전대로
// artifact 마커로 판정하고, `harness-team review` 는 구 task 에 키를 **만들지 않는다** — 키 생성을
// 부수효과로 두면 첫 리뷰 호출 순간 기존 손 마커가 증거에서 빠지기 때문이다(adversarial 리뷰 P1).
// 그래서 옮기는 길이 필요하다. 이 단계가 그 길이고, 세 가지를 지킨다:
//   1. `--adopt-reviews` 없이는 **아무것도 바꾸지 않는다** (한 줄 안내만). `--yes` 단독으로도 채택하지 않는다.
//   2. 잃는 증거는 가드와 **같은 파서·같은 판정 창**으로 센다 — 사용자가 보는 수와 가드가 세는 수가 같아야 한다.
//   3. 비용을 수가 아니라 결과로 말한다 — `verify: required` task 는 채택 뒤 리뷰를 **다시 돌려야** 종결된다.
export async function collectReviewAdoptionCandidates(targetDir) {
  const candidates = [];
  for (const t of await collectTasks(targetDir)) {
    if (t.status === 'done') continue;
    const meta = await readTaskMeta(targetDir, t.user, t.task);
    // meta 파일이 없으면 건너뛴다 — backfillTaskMeta 가 먼저 만들고, 다음 실행에서 후보가 된다.
    if (!meta || Array.isArray(meta.reviews)) continue;

    const dir = join(targetDir, 'docs', t.user, t.task);
    const artifact = await readTextSafe(join(dir, `${t.task}-artifact.md`));
    const { at: windowStart } = evidenceWindowStart(meta);
    const dropped = (artifact ? parseReviewMarkers(artifact) : [])
      .filter(m => (windowStart === null || m.at >= windowStart) && isVerifyKind(m.kind));

    const spec = await readTextSafe(join(dir, `${t.task}-spec.md`));
    const evidence = parseDoneEvidenceDeclaration(spec ?? '');
    candidates.push({ user: t.user, task: t.task, meta, dropped: dropped.length, verifyRequired: evidence.verify === 'required' });
  }
  return candidates;
}

export async function adoptTaskReviews(ctx) {
  const { targetDir } = ctx;
  const candidates = await collectReviewAdoptionCandidates(targetDir);

  if (candidates.length === 0) {
    console.log('  review evidence: up to date (no legacy tasks)');
    return false;
  }
  if (!ctx.flags['adopt-reviews']) {
    console.log(`  review evidence: ${candidates.length} legacy task(s) still judged by artifact markers — rerun with --adopt-reviews to move them to CLI-owned evidence`);
    return false;
  }

  console.log(`\nFound ${candidates.length} task(s) on legacy (artifact-marker) review evidence:`);
  for (const c of candidates) {
    const cost = !c.verifyRequired
      ? 'spec이 verify를 요구하지 않음 — 잃는 증거 없음'
      : c.dropped
        ? `검증 마커 ${c.dropped}개가 증거에서 빠짐 → 종결 전 \`harness-team review <engine> --framing <접미사>\` 재실행 필요`
        : '이 판정 창에 검증 마커 없음 — 어차피 지금도 종결이 막혀 있다';
    console.log(`  docs/${c.user}/${c.task}/ — ${cost}`);
  }
  console.log('\n채택은 각 meta 에 `reviews: []` 를 넣는다. 그 뒤 `verify: required` 는 `harness-team review` 가');
  console.log(`기록한 실행만 센다 (kind 접미사 ${VERIFY_KIND_SUFFIXES.map(x => `-${x}`).join('·')}). 손으로 쓴 artifact 마커는 세지 않는다.`);
  console.log('되돌리려면 그 meta 에서 `reviews` 키를 지우면 된다 — 그 외 필드는 건드리지 않는다.');

  const ok = ctx.flags.yes || await confirm('\nAdopt CLI-owned review evidence for these task(s)?', { defaultYes: false });
  if (!ok) { console.log('Skipped review evidence adoption.'); return false; }

  for (const c of candidates) {
    await writeTaskMeta(targetDir, c.user, c.task, { ...c.meta, user: c.user, task: c.task, reviews: [] });
    console.log(`  ✓ ${metaRel(c.user, c.task)} — reviews: []`);
  }
  return true;
}

export async function runMigrate(ctx) {
  console.log(`harness-team migrate → ${ctx.targetDir}`);

  const managedBackedUp = await migrateManagedSectionBackup(ctx);
  const agentsMigrated = await migrateToAgentsMd(ctx);

  const taskMigrated = await migrateTaskStructure(ctx);
  const taskUpgraded = await migrateTaskTo07(ctx);
  const scriptMoved = await migrateBackupScripts(ctx);
  const scriptRefreshed = await refreshProjectScripts(ctx);
  const claudeHooksRefreshed = await refreshClaudeHooks(ctx);
  const claudeTemplatesRefreshed = await refreshClaudeTemplates(ctx);
  const taskLabelsRenamed = await migrateTaskIndexLabels(ctx);
  const hookMigrated = await migrateSessionStartHook(ctx);
  const boundaryHookMigrated = await migrateBoundaryCheckpointHook(ctx);
  const codexFlagMigrated = await migrateCodexHookFlag(ctx);
  const metaBackfilled = await backfillTaskMeta(ctx);
  // backfill 뒤에 둔다 — 방금 만들어진 meta 도 같은 실행에서 후보가 되게 한다.
  const reviewsAdopted = await adoptTaskReviews(ctx);

  if (boundaryHookMigrated === null) {
    console.log('\nMigration incomplete — resolve the PreToolUse boundary checkpoint issue and rerun.');
    return;
  }

  if (!managedBackedUp && !agentsMigrated && !taskMigrated && !taskUpgraded && !scriptMoved && !scriptRefreshed && !claudeHooksRefreshed && !claudeTemplatesRefreshed && !taskLabelsRenamed && !hookMigrated && !boundaryHookMigrated && !metaBackfilled && !reviewsAdopted && !codexFlagMigrated) {
    console.log('\nNothing to migrate — project is already up to date.');
    return;
  }

  console.log('\n✓ Migration complete.');
  if (scriptMoved || scriptRefreshed) {
    console.log('  Run ./clone.sh, ./symlink.sh, ./delete.sh from the project root.');
  }
}

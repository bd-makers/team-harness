import { join } from 'node:path';
import { unlink, rmdir, readdir, mkdir } from 'node:fs/promises';
import { readTextSafe, writeText, exists } from '../fsx.mjs';
import { loadBackupDir } from '../harness.mjs';
import { confirm } from '../prompt.mjs';
import { installPostCommitHook } from '../git-hooks.mjs';

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
      let content = `# ${user} — Tasks\n\n## Active\n`;
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
      content += `| ${user} | ${name} | 🔄 active | (migrated) |\n`;
    }
    await writeText(summaryPath, content);
    console.log('  ✓ created docs/task_summary.md');
  }

  await installPostCommitHook(targetDir);
  console.log('  ✓ post-commit hook installed');

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

export async function runMigrate(ctx) {
  console.log(`harness-team migrate → ${ctx.targetDir}`);

  const taskMigrated = await migrateTaskStructure(ctx);
  const scriptMoved = await migrateBackupScripts(ctx);
  const scriptRefreshed = await refreshProjectScripts(ctx);

  if (!taskMigrated && !scriptMoved && !scriptRefreshed) {
    console.log('\nNothing to migrate — project is already up to date.');
    return;
  }

  console.log('\n✓ Migration complete.');
  if (scriptMoved || scriptRefreshed) {
    console.log('  Run ./clone.sh, ./symlink.sh, ./delete.sh from the project root.');
  }
}

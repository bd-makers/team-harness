import { join } from 'node:path';
import { unlink } from 'node:fs/promises';
import { readTextSafe, writeText } from '../fsx.mjs';
import { loadBackupDir } from '../harness.mjs';
import { confirm } from '../prompt.mjs';

const SCRIPT_FILES = ['clone.sh', 'symlink.sh', 'delete.sh'];

export async function runMigrate(ctx) {
  const { root, targetDir } = ctx;

  const backupDir = await loadBackupDir(targetDir);
  if (!backupDir) {
    console.error('error: no backup dir configured — .harness/backup.json not found');
    process.exit(1);
  }

  const toMigrate = [];
  for (const f of SCRIPT_FILES) {
    const content = await readTextSafe(join(backupDir, f));
    if (content !== null) {
      toMigrate.push({ f, inBackup: join(backupDir, f), inProject: join(targetDir, f) });
    }
  }

  if (toMigrate.length === 0) {
    console.log('Nothing to migrate: no scripts found in backup dir.');
    return;
  }

  console.log(`Found ${toMigrate.length} script(s) in backup dir to migrate to project root:`);
  for (const { f } of toMigrate) console.log(`  ${f}`);
  console.log(`\nBackup: ${backupDir}`);
  console.log(`Project: ${targetDir}`);
  console.log(`\nHarness artifacts in backup dir (CLAUDE.md, .claude/, docs/, etc.) will NOT be touched.`);

  const ok = ctx.flags.yes || await confirm('\nProceed?', { defaultYes: true });
  if (!ok) { console.log('Aborted.'); return; }

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
    console.log(`  ✓ ${f}: moved to project root, removed from backup`);
  }

  console.log('\n✓ Migration complete.');
  console.log('  Run ./clone.sh, ./symlink.sh, ./delete.sh from the project root.');
}

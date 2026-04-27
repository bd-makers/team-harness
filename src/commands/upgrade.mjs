import { join, resolve } from 'node:path';
import { lstat } from 'node:fs/promises';
import { homedir } from 'node:os';
import { resolveBackupDir } from '../backup-dir.mjs';
import { writeText } from '../fsx.mjs';
import { confirm } from '../prompt.mjs';
import { runClone } from './clone.mjs';
import { runDelete } from './delete.mjs';
import { runSymlink } from './symlink.mjs';

const MOVE_ITEMS = ['CLAUDE.md', '.claude', '.cursor', '.opencode', 'docs', '.harness', 'clone.sh', 'delete.sh'];

export async function runUpgrade(ctx) {
  console.log(`harness-team upgrade → ${ctx.targetDir}`);

  // 1. Resolve backup dir
  const rawBackupDir = ctx.flags['backup-dir']
    ? resolve((ctx.flags['backup-dir']).replace(/^~/, homedir()))
    : null;
  const backupDir = rawBackupDir || await resolveBackupDir(ctx.targetDir);
  if (!backupDir) {
    console.error(
      'No backup dir found.\n' +
      '  Option A: harness-team upgrade --backup-dir <path>\n' +
      '  Option B: harness-team init (new project setup)'
    );
    process.exit(1);
  }
  console.log(`  backup dir: ${backupDir}`);

  // 2. Clone project → backup (creates backup if missing, merges if exists)
  console.log('\n[1/3] Syncing project files to backup dir...');
  await runClone({ ...ctx, flags: { ...ctx.flags, yes: true }, targetDir: ctx.targetDir });

  // 3. Detect real (non-symlink) items in project root
  const realItems = [];

  for (const item of MOVE_ITEMS) {
    const p = join(ctx.targetDir, item);
    const st = await lstat(p).catch(() => null);
    if (!st) continue;
    if (!st.isSymbolicLink()) {
      realItems.push({ item, p });
    }
  }

  if (realItems.length === 0) {
    console.log('\nNo real files detected — already migrated. Running symlink...');
    await runSymlink({ ...ctx, flags: { ...ctx.flags, 'backup-dir': backupDir } });
    return;
  }

  // 4. Confirm with the user
  console.log('\n[2/3] Real files/dirs to replace with symlinks:');
  for (const op of realItems) console.log(`  ${op.item}`);

  const ok = ctx.flags.yes || await confirm(
    '\nDelete these and replace with symlinks from backup? (backup was just synced)',
    { defaultYes: false },
  );
  if (!ok) { console.log('Aborted.'); return; }

  // 5. Delete real items; --include-real returns savedBackupConfig
  console.log('\n[3/3] Replacing real files with symlinks...');
  const { savedBackupConfig } = await runDelete({
    ...ctx,
    flags: { ...ctx.flags, yes: true, 'include-real': true, 'backup-dir': backupDir },
  });

  // 6. Restore .harness/backup.json so symlink step can find the backup dir
  if (savedBackupConfig) {
    await writeText(
      join(ctx.targetDir, '.harness/backup.json'),
      JSON.stringify(savedBackupConfig, null, 2) + '\n',
    );
    console.log('  ✓ restored .harness/backup.json');
  } else {
    await writeText(
      join(ctx.targetDir, '.harness/backup.json'),
      JSON.stringify({ dir: backupDir }, null, 2) + '\n',
    );
    console.log('  ✓ wrote .harness/backup.json');
  }

  // 7. Create symlinks
  await runSymlink({ ...ctx, flags: { ...ctx.flags, yes: true, 'backup-dir': backupDir } });

  console.log('\n✓ Upgrade complete — project is now on symlink structure.');
}

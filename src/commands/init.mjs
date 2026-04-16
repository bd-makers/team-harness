import { basename, dirname, resolve } from 'node:path';
import { mkdir } from 'node:fs/promises';
import { detectStack } from '../detect-stack.mjs';
import {
  planChanges, applyChanges, copyStaticAssets, setupSymlinks, formatDiff,
  loadBackupDir, saveBackupConfig, DEFAULT_BACKUP_PARENT,
} from '../harness.mjs';
import { confirm, ask } from '../prompt.mjs';

export async function runInit(ctx) {
  console.log(`harness-team init → ${ctx.targetDir}`);
  const stack = ctx.flags.stack
    ? { id: ctx.flags.stack, stackLabel: ctx.flags.stack, language: 'unknown', packageManager: '(none)',
        cmdInstall: '(configure)', cmdDev: '(configure)', cmdTest: '(configure)', cmdLint: '(configure)', cmdTypecheck: '(configure)' }
    : await detectStack(ctx.targetDir);
  console.log(`  stack: ${stack.stackLabel} (${stack.id})`);

  // Resolve the sibling backup directory: ../<parent>/<projectName>.
  // The 3 scripts (clone.sh, symlink.sh, delete.sh) live OUTSIDE the project so
  // running `../<parent>/<project>/clone.sh` from the project root clones CWD
  // into that backup clone directory.
  const projectName = basename(ctx.targetDir);
  let backupDir = await loadBackupDir(ctx.targetDir);
  let backupParent = null;
  if (!backupDir) {
    const dirFromFlag = ctx.flags['backup-dir'];
    const parentFromFlag = ctx.flags['backup-parent'];
    if (dirFromFlag) {
      // Option 2: full path provided directly
      backupDir = resolve(dirFromFlag.replace(/^~/, process.env.HOME || '~'));
    } else {
      const answered = ctx.flags.yes
        ? (parentFromFlag || DEFAULT_BACKUP_PARENT)
        : await ask(
            `\nBackup clone parent folder (sibling of project, holds clone.sh/symlink.sh/delete.sh)?`,
            { defaultValue: parentFromFlag || DEFAULT_BACKUP_PARENT },
          );
      backupParent = answered;
      backupDir = resolve(ctx.targetDir, '..', answered, projectName);
    }
  }
  ctx.backupDir = backupDir;
  console.log(`  backup clone dir: ${backupDir}`);

  const { changes } = await planChanges(ctx, { stack });

  if (changes.length === 0) {
    console.log('  (no changes needed for text/JSON files)');
  } else {
    console.log(formatDiff(changes));
  }

  const ok = ctx.flags.yes || await confirm('\nApply these changes + scaffold the rest?', { defaultYes: true });
  if (!ok) { console.log('Aborted.'); return; }

  await mkdir(backupDir, { recursive: true });
  await applyChanges(changes);
  if (backupParent) {
    await saveBackupConfig(ctx.targetDir, { parent: backupParent, name: projectName });
  }
  const copied = await copyStaticAssets(ctx);
  const links = await setupSymlinks(ctx);

  console.log(`\n✓ Wrote ${changes.length} merged file(s)`);
  console.log(`✓ Backup clone dir ready: ${backupDir}`);
  console.log(`✓ Copied ${copied.filter(c => c.action === 'write').length} asset(s) (${copied.filter(c => c.action === 'skip').length} skipped as existing)`);
  for (const l of links) console.log(`  ${l.action.padEnd(5)} ${l.link} → CLAUDE.md  [${l.reason}]`);
  const parentName = backupParent ?? basename(dirname(backupDir));
  const relBackup = `../${parentName}/${projectName}`;
  console.log(`\nDone. From the project root, run the backup scripts like:`);
  console.log(`  ${relBackup}/clone.sh   # clone this project into the backup dir`);
  console.log(`  ${relBackup}/symlink.sh # set up harness symlinks`);
  console.log(`  ${relBackup}/delete.sh  # tear down`);
}

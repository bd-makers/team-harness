import { basename, resolve } from 'node:path';
import { mkdir } from 'node:fs/promises';
import { detectStack } from '../detect-stack.mjs';
import {
  planChanges, applyChanges, copyStaticAssets, setupSymlinks, formatDiff,
  loadBackupDir, saveBackupConfig, DEFAULT_BACKUP_PARENT, AI_GITIGNORE_PREVIEW,
} from '../harness.mjs';
import { confirm, ask } from '../prompt.mjs';
import { ensureUsername } from '../user-config.mjs';
import { installPostCommitHook } from '../git-hooks.mjs';

export async function runInit(ctx) {
  console.log(`harness-team init → ${ctx.targetDir}`);
  const stack = ctx.flags.stack
    ? { id: ctx.flags.stack, stackLabel: ctx.flags.stack, language: 'unknown', packageManager: '(none)',
        cmdInstall: '(configure)', cmdDev: '(configure)', cmdTest: '(configure)', cmdLint: '(configure)', cmdTypecheck: '(configure)' }
    : await detectStack(ctx.targetDir);
  console.log(`  stack: ${stack.stackLabel} (${stack.id})`);

  await ensureUsername(ctx.targetDir, ctx.flags);

  // Resolve the sibling backup directory: ../<parent>/<projectName>.
  // The 3 scripts (clone.sh, symlink.sh, delete.sh) are written INTO the project
  // root with BACKUP_DIR embedded at generation time, so running `./clone.sh`
  // from the project root syncs CWD into that backup clone directory.
  const projectName = basename(ctx.targetDir);
  let saveConfig = null;

  if (ctx.flags['no-backup']) {
    ctx.backupDir = null;
    console.log('  backup: disabled');
  } else {
    let backupDir = await loadBackupDir(ctx.targetDir);
    if (!backupDir) {
      const dirFromFlag = ctx.flags['backup-dir'];
      const parentFromFlag = ctx.flags['backup-parent'];
      if (dirFromFlag) {
        backupDir = resolve(dirFromFlag.replace(/^~/, process.env.HOME || '~'));
        saveConfig = { dir: backupDir };
      } else {
        const answered = ctx.flags.yes
          ? (parentFromFlag || DEFAULT_BACKUP_PARENT)
          : await ask(
              `\nBackup clone parent folder (sibling of project, holds clone.sh/symlink.sh/delete.sh)?`,
              { defaultValue: parentFromFlag || DEFAULT_BACKUP_PARENT },
            );
        backupDir = resolve(ctx.targetDir, '..', answered, projectName);
        saveConfig = { parent: answered, name: projectName };
      }
    }
    ctx.backupDir = backupDir;
    console.log(`  backup clone dir: ${backupDir}`);
  }

  // Ask whether to add AI-tool gitignore entries.
  if (ctx.flags['gitignore-ai'] !== undefined) {
    ctx.addAiGitignore = ctx.flags['gitignore-ai'] === true || ctx.flags['gitignore-ai'] === 'true';
  } else if (!ctx.flags.yes) {
    console.log(`\nAI tool .gitignore entries to add:\n`);
    console.log(AI_GITIGNORE_PREVIEW.split('\n').map(l => `  ${l}`).join('\n'));
    ctx.addAiGitignore = await confirm('\nAdd these AI tool entries to .gitignore?', { defaultYes: false });
  } else {
    ctx.addAiGitignore = false;
  }

  const { changes } = await planChanges(ctx, { stack });

  if (changes.length === 0) {
    console.log('  (no changes needed for text/JSON files)');
  } else {
    console.log(formatDiff(changes));
  }

  const ok = ctx.flags.yes || await confirm('\nApply these changes + scaffold the rest?', { defaultYes: true });
  if (!ok) { console.log('Aborted.'); return; }

  if (ctx.backupDir) await mkdir(ctx.backupDir, { recursive: true });
  await applyChanges(changes);
  if (saveConfig) await saveBackupConfig(ctx.targetDir, saveConfig);
  const copied = await copyStaticAssets(ctx);
  const links = await setupSymlinks(ctx);
  await installPostCommitHook(ctx.targetDir);

  console.log(`\n✓ Wrote ${changes.length} merged file(s)`);
  if (ctx.backupDir) {
    console.log(`✓ Backup clone dir ready: ${ctx.backupDir}`);
    console.log(`\nDone. From the project root, run the backup scripts:`);
    console.log(`  ./clone.sh   # sync this project into the backup dir`);
    console.log(`  ./symlink.sh # create backup → project symlinks`);
    console.log(`  ./delete.sh  # tear down symlinks`);
  }
  console.log(`✓ Copied ${copied.filter(c => c.action === 'write').length} asset(s) (${copied.filter(c => c.action === 'skip').length} skipped as existing)`);
  for (const l of links) console.log(`  ${l.action.padEnd(5)} ${l.link} → CLAUDE.md  [${l.reason}]`);
}

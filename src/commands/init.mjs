import { basename, resolve, join } from 'node:path';
import { mkdir, readFile, writeFile, access, appendFile, chmod } from 'node:fs/promises';
import { execFile } from 'node:child_process';
import { promisify } from 'node:util';
import { detectStack } from '../detect-stack.mjs';
import {
  planChanges, applyChanges, copyStaticAssets, setupSymlinks, formatDiff,
  loadBackupDir, saveBackupConfig, DEFAULT_BACKUP_PARENT, AI_GITIGNORE_PREVIEW,
} from '../harness.mjs';
import { confirm, ask } from '../prompt.mjs';

const pexec = promisify(execFile);

async function ensureUsername(targetDir, flags = {}) {
  const configPath = join(targetDir, '.harness', 'config.json');
  let config = {};
  try {
    config = JSON.parse(await readFile(configPath, 'utf8'));
  } catch { /* file may not exist yet */ }

  if (config.user) return; // already configured

  let name;
  if (flags.yes) {
    // silent fallback: git config → $USER → 'unknown'
    try {
      const { stdout } = await pexec('git', ['-C', targetDir, 'config', 'user.name']);
      name = stdout.trim() || null;
    } catch { /* ignore */ }
    name = name || process.env.USER || process.env.USERNAME || 'unknown';
  } else {
    let gitName = null;
    try {
      const { stdout } = await pexec('git', ['-C', targetDir, 'config', 'user.name']);
      gitName = stdout.trim() || null;
    } catch { /* ignore */ }

    if (gitName) {
      const ok = await confirm(
        `\ndocs/ 경로에 사용할 이름이 '${gitName}'으로 설정됩니다. 맞나요?`,
        { defaultYes: true },
      );
      name = ok ? gitName : await ask('사용할 이름을 입력하세요:');
    } else {
      name = await ask('docs/ 경로에 사용할 이름을 입력하세요:');
    }
  }

  config.user = name;
  await mkdir(join(targetDir, '.harness'), { recursive: true });
  await writeFile(configPath, JSON.stringify(config, null, 2) + '\n', 'utf8');
  console.log(`  user: ${name}`);
}

const POST_COMMIT_HOOK = `#!/bin/sh
# harness: auto-update handoff on commit
harness-team handoff 2>/dev/null || true
`;

async function installPostCommitHook(targetDir) {
  const hooksDir = join(targetDir, '.git', 'hooks');
  try {
    await access(hooksDir);
  } catch {
    return; // not a git repo or no hooks dir
  }

  const hookPath = join(hooksDir, 'post-commit');
  let existing = null;
  try {
    existing = await readFile(hookPath, 'utf8');
  } catch { /* doesn't exist */ }

  if (existing !== null) {
    if (existing.includes('harness')) return; // already installed
    await appendFile(hookPath, '\n' + POST_COMMIT_HOOK);
    console.log('  post-commit hook: appended harness line');
  } else {
    await writeFile(hookPath, POST_COMMIT_HOOK, 'utf8');
    await chmod(hookPath, 0o755);
    console.log('  post-commit hook: installed');
  }
}

export async function runInit(ctx) {
  console.log(`harness-team init → ${ctx.targetDir}`);
  const stack = ctx.flags.stack
    ? { id: ctx.flags.stack, stackLabel: ctx.flags.stack, language: 'unknown', packageManager: '(none)',
        cmdInstall: '(configure)', cmdDev: '(configure)', cmdTest: '(configure)', cmdLint: '(configure)', cmdTypecheck: '(configure)' }
    : await detectStack(ctx.targetDir);
  console.log(`  stack: ${stack.stackLabel} (${stack.id})`);

  await ensureUsername(ctx.targetDir, ctx.flags);

  // Resolve the sibling backup directory: ../<parent>/<projectName>.
  // The 3 scripts (clone.sh, symlink.sh, delete.sh) live OUTSIDE the project so
  // running `../<parent>/<project>/clone.sh` from the project root clones CWD
  // into that backup clone directory.
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

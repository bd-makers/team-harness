#!/usr/bin/env node
import { fileURLToPath } from 'node:url';
import { dirname, resolve } from 'node:path';
import { runInit } from '../src/commands/init.mjs';
import { runApply } from '../src/commands/apply.mjs';
import { runBackup } from '../src/commands/backup.mjs';
import { runSync } from '../src/commands/sync.mjs';
import { runDoctor } from '../src/commands/doctor.mjs';
import { runTask, runList, runDone, runHandoffAuto, runRetro } from '../src/commands/task.mjs';
import { runClone } from '../src/commands/clone.mjs';
import { runSymlink } from '../src/commands/symlink.mjs';
import { runDelete } from '../src/commands/delete.mjs';
import { runMigrate } from '../src/commands/migrate.mjs';
import { runUpgrade } from '../src/commands/upgrade.mjs';
import { runRelease } from '../src/commands/release.mjs';

const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT = resolve(__dirname, '..');

const HELP = `harness-team — Claude-led team harness for multi-agent projects

Usage:
  harness-team <command> [options]

Commands:
  init [dir]                        Scaffold a new project with the full harness
  apply [dir]                       Apply the harness to an existing project (non-destructive)
  backup [dir]                      Move harness items to backup dir and replace with symlinks
  clone [dir]                       Sync project items to backup dir (merge, newer-wins)
  symlink [dir]                     Create backup→project symlinks
  delete [dir]                      Remove harness symlinks from project
  migrate [dir]                     Migrate to latest: backup scripts → root, task structure (→0.6, →0.7 artifact.md split)
  upgrade [dir]                     Migrate real files → symlinks in one step (v0.3.x → v0.4+)
  sync [dir]                        Re-sync symlinks, cursor rules, opencode config
  doctor [dir]                      Diagnose harness integrity
  task <name>                       Create or activate a task
  list                              List all tasks
  done [--force]                    Complete the active task (--force bypasses the completion guard)
  handoff                           Update handoff from latest commit (post-commit hook)
  retro [text]                      Append a dated Learnings entry to the active task's artifact.md
  release [patch|minor|major|x.y.z] [--dry-run] [--skip-cache]   Bump 3 manifests + sync plugin cache/marketplace/installed_plugins.json
  help                              Show this help

Options:
  --stack <name>       Force stack (react-native|react|next|node|python|generic)
  --yes                Non-interactive
  --member <name>      Override member (default: git config user.name, else $USER)
  --no-symlinks        Copy files instead of symlinking (Windows)
  --no-backup          Skip backup dir setup entirely (init/apply only)
  --target <dir>       Target directory (default: cwd)
  --gitignore-ai       Add AI tool entries to .gitignore without prompting
  --no-gitignore-ai    Skip AI gitignore entries without prompting
`;

function parseArgs(argv) {
  const out = { cmd: null, positional: [], flags: {} };
  out.cmd = argv[0];
  for (let i = 1; i < argv.length; i++) {
    const a = argv[i];
    if (a.startsWith('--')) {
      const [k, v] = a.slice(2).split('=');
      if (v !== undefined) out.flags[k] = v;
      else if (argv[i + 1] && !argv[i + 1].startsWith('--') && !['init','apply','sync','doctor','task','list','done','handoff','retro','release','help'].includes(argv[i+1])) {
        // flags that take values: stack, member, target
        if (['stack', 'member', 'target', 'backup-parent', 'backup-dir'].includes(k)) { out.flags[k] = argv[++i]; }
        else if (k === 'no-backup') out.flags['no-backup'] = true;
        else if (k === 'no-gitignore-ai') out.flags['gitignore-ai'] = false;
        else out.flags[k] = true;
      } else out.flags[k] = true;
    } else out.positional.push(a);
  }
  return out;
}

async function main() {
  const argv = process.argv.slice(2);
  const parsed = parseArgs(argv);
  const { cmd, positional, flags } = parsed;

  const taskCmds = new Set(['task', 'list', 'done', 'handoff', 'retro', 'release']);
  const target = flags.target || (taskCmds.has(cmd) ? process.cwd() : positional[0]) || process.cwd();
  const ctx = {
    root: ROOT,
    targetDir: resolve(process.cwd(), target),
    flags,
    taskArgs: (cmd === 'task' || cmd === 'retro' || cmd === 'release') ? positional : [],
  };

  switch (cmd) {
    case 'init': return runInit(ctx);
    case 'apply': return runApply(ctx);
    case 'backup': return runBackup(ctx);
    case 'clone': return runClone(ctx);
    case 'symlink': return runSymlink(ctx);
    case 'delete': return runDelete(ctx);
    case 'migrate': return runMigrate(ctx);
    case 'upgrade': return runUpgrade(ctx);
    case 'sync': return runSync(ctx);
    case 'doctor': return runDoctor(ctx);
    case 'task': return runTask(ctx);
    case 'list': return runList(ctx);
    case 'done': return runDone(ctx);
    case 'handoff': return runHandoffAuto(ctx);
    case 'retro': return runRetro(ctx);
    case 'release': return runRelease(ctx);
    case 'help':
    case '--help':
    case '-h':
    case undefined:
      console.log(HELP);
      return;
    default:
      console.error(`Unknown command: ${cmd}\n`);
      console.log(HELP);
      process.exit(1);
  }
}

main().catch(err => {
  console.error(err.stack || err.message || err);
  process.exit(1);
});

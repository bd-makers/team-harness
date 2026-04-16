#!/usr/bin/env node
import { fileURLToPath } from 'node:url';
import { dirname, resolve } from 'node:path';
import { runInit } from '../src/commands/init.mjs';
import { runApply } from '../src/commands/apply.mjs';
import { runSync } from '../src/commands/sync.mjs';
import { runDoctor } from '../src/commands/doctor.mjs';
import { runTask } from '../src/commands/task.mjs';

const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT = resolve(__dirname, '..');

const HELP = `harness-team — Claude-led team harness for multi-agent projects

Usage:
  harness-team <command> [options]

Commands:
  init [dir]                        Scaffold a new project with the full harness
  apply [dir]                       Apply the harness to an existing project (non-destructive)
  sync [dir]                        Re-sync symlinks, cursor rules, opencode config
  doctor [dir]                      Diagnose harness integrity
  task new <feature|fix> <name>     Create a per-member per-task doc folder + set active
  task list                         List all tasks
  task switch <id>                  Switch active task
  task done                         Auto-collect git/test results into artifact.md
  help                              Show this help

Options:
  --stack <name>       Force stack (react-native|react|next|node|python|generic)
  --yes                Non-interactive
  --member <name>      Override member (default: git config user.name, else $USER)
  --no-symlinks        Copy files instead of symlinking (Windows)
  --target <dir>       Target directory (default: cwd)
`;

function parseArgs(argv) {
  const out = { cmd: null, positional: [], flags: {} };
  out.cmd = argv[0];
  for (let i = 1; i < argv.length; i++) {
    const a = argv[i];
    if (a.startsWith('--')) {
      const [k, v] = a.slice(2).split('=');
      if (v !== undefined) out.flags[k] = v;
      else if (argv[i + 1] && !argv[i + 1].startsWith('--') && !['init','apply','sync','doctor','task','help','new','list','switch','done'].includes(argv[i+1])) {
        // flags that take values: stack, member, target
        if (['stack', 'member', 'target', 'backup-parent', 'backup-dir'].includes(k)) { out.flags[k] = argv[++i]; }
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

  const target = flags.target || (cmd === 'task' ? process.cwd() : positional[0]) || process.cwd();
  const ctx = {
    root: ROOT,
    targetDir: resolve(process.cwd(), target),
    flags,
    taskArgs: cmd === 'task' ? positional : [],
  };

  switch (cmd) {
    case 'init': return runInit(ctx);
    case 'apply': return runApply(ctx);
    case 'sync': return runSync(ctx);
    case 'doctor': return runDoctor(ctx);
    case 'task': return runTask(ctx);
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

#!/usr/bin/env node
import { fileURLToPath } from 'node:url';
import { readFile } from 'node:fs/promises';
import { dirname, resolve } from 'node:path';
import { resolveInvocation } from '../src/cli-args.mjs';
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
import { runSessionContext } from '../src/commands/session-context.mjs';
import { runContext } from '../src/commands/context.mjs';
import { runBoundary } from '../src/commands/boundary.mjs';

const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT = resolve(__dirname, '..');

async function main() {
  const argv = process.argv.slice(2);

  // Resolve what the invocation is before anything can act on it. `--help`
  // anywhere, `--version`, an unknown command, and an unrecognized flag all
  // return here without reaching the router below — see src/cli-args.mjs for
  // why that ordering is the whole point.
  const invocation = resolveInvocation(argv);
  if (invocation.kind === 'help') {
    console.log(invocation.text);
    return;
  }
  if (invocation.kind === 'version') {
    const pkg = JSON.parse(await readFile(resolve(ROOT, 'package.json'), 'utf8'));
    console.log(pkg.version);
    return;
  }
  if (invocation.kind === 'error') {
    console.error(`${invocation.message}\n`);
    console.error(invocation.text);
    process.exit(invocation.code);
  }

  const { cmd, positional, flags } = invocation;

  const taskCmds = new Set(['task', 'list', 'done', 'handoff', 'retro', 'release', 'context', 'boundary', 'session-context']);
  const target = flags.target || (taskCmds.has(cmd) ? process.cwd() : positional[0]) || process.cwd();
  const ctx = {
    root: ROOT,
    targetDir: resolve(process.cwd(), target),
    flags,
    taskArgs: (cmd === 'task' || cmd === 'retro' || cmd === 'release' || cmd === 'context' || cmd === 'boundary') ? positional : [],
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
    case 'context': return runContext(ctx);
    case 'boundary': return runBoundary(ctx);
    case 'session-context': return runSessionContext(ctx);
    case 'retro': return runRetro(ctx);
    case 'release': return runRelease(ctx);
    // Unreachable: resolveInvocation answers help/version, rejects unknown
    // commands, and only returns `run` for a name listed in COMMANDS. A miss
    // here means the table and the router drifted apart.
    default:
      throw new Error(`Unrouted command: ${cmd}`);
  }
}

main().catch(err => {
  console.error(err.stack || err.message || err);
  process.exit(1);
});

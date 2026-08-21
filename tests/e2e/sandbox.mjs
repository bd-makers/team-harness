// E2E sandbox harness: spins up an ephemeral target project, runs the REAL
// `bin/harness-team.mjs` against it via child_process (high fidelity — exercises
// arg parsing + the actual binary path, unlike unit tests that import src directly).
//
// Each sandbox is a fresh git repo with a stack signature package.json. A PATH
// shim makes `harness-team` resolvable so the installed post-commit hook fires on
// a real `git commit`. Everything (incl. backup dir) stays inside the temp dir so
// cleanup is a single rm.
import { mkdtemp, mkdir, writeFile, rm, chmod } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join, resolve, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { spawn } from 'node:child_process';

export const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), '..', '..');
export const BIN = join(ROOT, 'bin', 'harness-team.mjs');

// Stack matrix — each entry is a minimal detect-stack signature.
export const STACKS = [
  { id: 'node', label: 'bare-node', pkg: { name: 'bare-app', version: '0.0.0', dependencies: {} } },
  { id: 'next', label: 'next', pkg: { name: 'next-app', version: '0.0.0', dependencies: { next: '14.0.0', react: '18.0.0' } } },
  { id: 'react-native', label: 'react-native', pkg: { name: 'rn-app', version: '0.0.0', dependencies: { expo: '51.0.0', 'react-native': '0.74.0' } } },
];

export function run(cmd, args, opts = {}) {
  return new Promise((res) => {
    const { input, ...spawnOpts } = opts;
    const child = spawn(cmd, args, { stdio: ['pipe', 'pipe', 'pipe'], ...spawnOpts });
    let stdout = '', stderr = '';
    child.stdout.on('data', (d) => { stdout += d; });
    child.stderr.on('data', (d) => { stderr += d; });
    child.on('close', (code) => res({ code, stdout, stderr }));
    child.on('error', (err) => res({ code: -1, stdout, stderr: String(err.stack || err) }));
    child.stdin.end(input);
  });
}

export async function createSandbox(stack) {
  const dir = await mkdtemp(join(tmpdir(), `harness-e2e-${stack.label}-`));

  // PATH shim so the post-commit hook (`harness-team handoff`) resolves.
  const binDir = join(dir, '.bin');
  await mkdir(binDir, { recursive: true });
  const shim = join(binDir, 'harness-team');
  await writeFile(shim, `#!/bin/sh\nexec node ${JSON.stringify(BIN)} "$@"\n`);
  await chmod(shim, 0o755);
  // CLAUDE_PLUGINS_ROOT points doctor's checkCliDrift at a path inside the
  // sandbox (nonexistent → drift check no-ops, same as CI). Without it the
  // spawned CLI reads the dev machine's real ~/.claude/plugins/
  // installed_plugins.json, and any version drift there fails these tests.
  const env = {
    ...process.env,
    PATH: `${binDir}:${process.env.PATH}`,
    CLAUDE_PLUGINS_ROOT: join(dir, '.plugins-isolated'),
  };

  await writeFile(join(dir, 'package.json'), JSON.stringify(stack.pkg, null, 2));
  await run('git', ['init', '-q'], { cwd: dir, env });
  // `apply --yes` pins the docs member to git user.name (see ensureUsername),
  // so set it to a known value the tests can assert against.
  await run('git', ['config', 'user.email', 'tester@e2e.io'], { cwd: dir, env });
  await run('git', ['config', 'user.name', 'tester'], { cwd: dir, env });
  await run('git', ['config', 'commit.gpgsign', 'false'], { cwd: dir, env });

  const cli = (args, extra = {}) => run('node', [BIN, ...args], { cwd: dir, env, ...extra });
  const gitCommit = async (msg) => {
    await run('git', ['add', '-A'], { cwd: dir, env });
    return run('git', ['commit', '-q', '-m', msg], { cwd: dir, env });
  };
  const cleanup = () => rm(dir, { recursive: true, force: true });
  return { dir, env, cli, gitCommit, cleanup };
}

// Sandbox with the harness already applied non-interactively. backup-dir is kept
// inside the sandbox so doctor's required `.harness/backup.json` check passes.
export async function appliedSandbox(stack) {
  const sb = await createSandbox(stack);
  const applyResult = await sb.cli([
    'apply', '--yes', '--backup-dir', join(sb.dir, '.hbackup'),
  ]);
  return { ...sb, applyResult };
}

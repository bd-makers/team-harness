import { test } from 'node:test';
import assert from 'node:assert/strict';
import { resolve, dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { readFile } from 'node:fs/promises';
import { execFile } from 'node:child_process';
import { promisify } from 'node:util';
import { COMMANDS, GLOBAL_FLAGS, FLAG_ALIASES, resolveInvocation, parseArgs } from '../src/cli-args.mjs';

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const pexec = promisify(execFile);

// These assert on the pure resolver rather than spawning the CLI on purpose.
// `harness-team release` mutates this repo's own manifests and ~/.claude, so a
// spawn test for "release --help must not release" would perform a release on
// the very run where the guard is broken. The resolver is the guard; proving it
// never returns `run` for a help invocation proves the property without risk.
test('cli-args: --help after a command asks for usage, never a run', () => {
  const invocation = resolveInvocation(['release', '--help']);
  assert.equal(invocation.kind, 'help');
  assert.match(invocation.text, /harness-team release/);
});

test('cli-args: every command answers --help instead of running', () => {
  for (const command of COMMANDS) {
    for (const argv of [[command.name, '--help'], [command.name, '-h']]) {
      assert.equal(resolveInvocation(argv).kind, 'help', `${argv.join(' ')} must resolve to help`);
    }
  }
});

// The trailing position matters: an agent that appends --help to a remembered
// invocation would otherwise run the remembered command.
test('cli-args: --help wins over the rest of the argv', () => {
  assert.equal(resolveInvocation(['release', 'major', '--help']).kind, 'help');
  assert.equal(resolveInvocation(['delete', '--include-real', '--help']).kind, 'help');
});

// A typo in a flag used to be accepted as `true` and the command ran with its
// defaults — on `release` that is a live version bump, on `delete` a removal.
test('cli-args: an unknown flag is a usage error, not a default run', () => {
  for (const argv of [['release', '--dryrun'], ['release', '--dry_run'], ['delete', '--include-reals']]) {
    const invocation = resolveInvocation(argv);
    assert.equal(invocation.kind, 'error', `${argv.join(' ')} must not run`);
    assert.equal(invocation.code, 2);
    assert.match(invocation.message, /unknown flag/);
  }
});

test('cli-args: a dangling value flag is rejected before path resolution', () => {
  const invocation = resolveInvocation(['doctor', '--target']);
  assert.equal(invocation.kind, 'error');
  assert.equal(invocation.code, 2);
  assert.match(invocation.message, /--target requires a value/);
});

test('cli-args: unknown command still exits 1 with the full help', () => {
  for (const argv of [['relase'], ['relase', '--help']]) {
    const invocation = resolveInvocation(argv);
    assert.equal(invocation.kind, 'error', `${argv.join(' ')} must not succeed`);
    assert.equal(invocation.code, 1, 'a missing command is exit 1 regardless of --help');
    assert.match(invocation.message, /Unknown command: relase/);
  }
});

// `--` ends flag parsing, so free text that starts with a dash reaches the
// command instead of being read as a malformed flag.
test('cli-args: -- passes the rest through as positional text', () => {
  const invocation = resolveInvocation(['retro', '--', '--help', '-h', 'text']);
  assert.equal(invocation.kind, 'run');
  assert.deepEqual(invocation.positional, ['--help', '-h', 'text']);
});

// A help token consumed as the value of a value flag is data, not a request.
test('cli-args: -h in a value position is a value', () => {
  const invocation = resolveInvocation(['doctor', '--target', '-h']);
  assert.equal(invocation.kind, 'run');
  assert.equal(invocation.flags.target, '-h');
});

// Asking how to use a command has to work while the rest of the argv is wrong.
test('cli-args: --help outranks a parse error on the same line', () => {
  assert.equal(resolveInvocation(['doctor', '--target', '--help']).kind, 'help');
  assert.equal(resolveInvocation(['release', '--dryrun', '--help']).kind, 'help');
});

test('cli-args: --version is answered without touching a command', () => {
  assert.equal(resolveInvocation(['--version']).kind, 'version');
  assert.equal(resolveInvocation(['-v']).kind, 'version');
});

test('cli-args: bare and `help <command>` forms render help', () => {
  assert.equal(resolveInvocation([]).kind, 'help');
  assert.equal(resolveInvocation(['help']).kind, 'help');
  assert.match(resolveInvocation(['help', 'release']).text, /harness-team release/);
});

// Guarding the guard: the accepted invocations must still reach the router,
// or "nothing runs" would pass every test above.
test('cli-args: real invocations still resolve to a run', () => {
  assert.equal(resolveInvocation(['release']).kind, 'run');
  assert.equal(resolveInvocation(['release', 'minor', '--dry-run']).flags['dry-run'], true);
  assert.equal(resolveInvocation(['doctor', '--json']).kind, 'run');
  assert.deepEqual(resolveInvocation(['sync', '/tmp/x']).positional, ['/tmp/x']);

  const init = resolveInvocation(['init', '--stack', 'react-native', '/tmp/x']);
  assert.equal(init.flags.stack, 'react-native');
  assert.deepEqual(init.positional, ['/tmp/x']);
  assert.equal(resolveInvocation(['init', '--stack=next']).flags.stack, 'next');

  assert.equal(resolveInvocation(['observe']).kind, 'run');
  assert.equal(resolveInvocation(['observe', '--days', '3']).flags.days, '3');
  assert.equal(resolveInvocation(['observe', '--days=14', '--json']).flags.days, '14');
  assert.equal(resolveInvocation(['observe', '--days']).kind, 'error');
});

test('cli-args: --no-gitignore-ai normalizes to the key init reads', () => {
  assert.equal(resolveInvocation(['init', '--no-gitignore-ai']).flags['gitignore-ai'], false);
  assert.equal(resolveInvocation(['init', '--gitignore-ai']).flags['gitignore-ai'], true);
  assert.equal(resolveInvocation(['init']).flags['gitignore-ai'], undefined);
});

test('cli-args: globals are accepted on every command', () => {
  for (const command of COMMANDS.filter(c => c.name !== 'help')) {
    for (const flag of GLOBAL_FLAGS) {
      const argv = ['stack', 'member', 'target'].includes(flag)
        ? [command.name, `--${flag}`, 'x']
        : [command.name, `--${flag}`];
      assert.equal(resolveInvocation(argv).kind, 'run', `${command.name} must accept --${flag}`);
    }
  }
});

test('parseArgs: an inline value flag does not swallow the next token', () => {
  const parsed = parseArgs(['init', '--target=/tmp/x', 'extra']);
  assert.equal(parsed.flags.target, '/tmp/x');
  assert.deepEqual(parsed.positional, ['extra']);
});

// The command table drives help and validation; the switch in bin drives
// dispatch. If they drift, a listed command resolves to `run` and then hits the
// unreachable default, or a routed command is rejected as unknown.
test('cli-args: the command table and the bin router agree', async () => {
  const bin = await readFile(join(ROOT, 'bin', 'harness-team.mjs'), 'utf8');
  const routed = new Set([...bin.matchAll(/case '([a-z-]+)':/g)].map(m => m[1]));
  const listed = new Set(COMMANDS.map(c => c.name).filter(name => name !== 'help'));

  for (const name of listed) assert.ok(routed.has(name), `COMMANDS lists "${name}" but bin has no case`);
  for (const name of routed) assert.ok(listed.has(name), `bin routes "${name}" but COMMANDS omits it`);
});

// A flag that is accepted and documented but never read is the same silent
// failure this module exists to remove: the caller passes `--backup-dir B`,
// nothing errors, and the command operates on A. Each declared flag must appear
// in the module that actually handles the command.
const HANDLER = { list: 'task', done: 'task', handoff: 'task', retro: 'task' };

test('cli-args: every declared flag is read by the command that declares it', async () => {
  for (const command of COMMANDS.filter(c => c.name !== 'help' && c.flags.length > 0)) {
    const module = HANDLER[command.name] ?? command.name;
    const source = await readFile(join(ROOT, 'src/commands', `${module}.mjs`), 'utf8');
    for (const declared of command.flags) {
      const key = FLAG_ALIASES.get(declared) ?? declared;
      const read = source.includes(`flags['${key}']`) || source.includes(`flags.${key}`);
      assert.ok(read, `${command.name} accepts --${declared} but ${module}.mjs never reads flags['${key}']`);
    }
  }
});

// Wiring check on a read-only command: proves the resolver is actually consulted
// by the executable, which the pure tests above cannot show.
test('cli-args: the CLI exits 0 on --help and 2 on an unknown flag', async () => {
  const { stdout } = await pexec('node', [join(ROOT, 'bin/harness-team.mjs'), 'doctor', '--help'], { timeout: 20000 });
  assert.match(stdout, /harness-team doctor/);

  const failure = await pexec('node', [join(ROOT, 'bin/harness-team.mjs'), 'doctor', '--bogus'], { timeout: 20000 })
    .then(() => null)
    .catch(error => error);
  assert.ok(failure, 'an unknown flag must exit non-zero');
  assert.equal(failure.code, 2);
  assert.match(failure.stderr, /unknown flag --bogus/);
});

test('cli-args: rules promote 는 번호 positional 과 --name/--paths 값 플래그를 받고, dangling --name 은 오류', () => {
  const inv = resolveInvocation(['rules', 'promote', '2', '--name', 'api-errors', '--paths', 'src/**/*.ts,lib/**']);
  assert.equal(inv.kind, 'run');
  assert.deepEqual(inv.positional, ['promote', '2']);
  assert.equal(inv.flags.name, 'api-errors');
  assert.equal(inv.flags.paths, 'src/**/*.ts,lib/**');
  assert.equal(resolveInvocation(['rules', 'promote']).kind, 'run');
  assert.equal(resolveInvocation(['rules', 'promote', '1', '--name']).kind, 'error');
  assert.equal(resolveInvocation(['rules', 'promote', '--days', '3']).kind, 'error', 'rules 는 --days 를 받지 않는다');
});

test('cli-args: 전역 도움말의 --json 지원 명령 목록에 observe·rules 가 있다 (codex P3)', () => {
  const { text } = resolveInvocation(['--help']);
  assert.match(text, /--json\s+.*\(task\/retro\/release\/doctor\/summary\/observe\/rules\)/);
});

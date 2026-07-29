import { test } from 'node:test';
import assert from 'node:assert/strict';
import { mkdtemp, mkdir, readFile, rm, writeFile } from 'node:fs/promises';
import { dirname, join, resolve } from 'node:path';
import { tmpdir } from 'node:os';
import { execFile } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import { promisify } from 'node:util';
import {
  CONTEXT_MAX_BYTES,
  CONTEXT_MAX_FAILURE_CAPSULES,
  CONTEXT_MAX_NONBLANK_LINES,
  runContextCheck,
  runContextInit,
  validateContextCard,
} from '../src/commands/context.mjs';
import { taskContextTemplate } from '../src/commands/task.mjs';

const pexec = promisify(execFile);
const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), '..');

async function fixture({ active = true, card } = {}) {
  const dir = await mkdtemp(join(tmpdir(), 'harness-context-'));
  await mkdir(join(dir, '.harness'), { recursive: true });
  if (active) {
    await writeFile(join(dir, '.harness', 'active.json'), JSON.stringify({
      user: 'tester', task: 'demo', path: 'docs/tester/demo',
    }));
  }
  const taskDir = join(dir, 'docs', 'tester', 'demo');
  await mkdir(taskDir, { recursive: true });
  const path = join(taskDir, 'demo-context.md');
  if (card !== undefined) await writeFile(path, card);
  return { dir, path };
}

function captureLogs() {
  const lines = [];
  const original = console.log;
  console.log = (...args) => lines.push(args.join(' '));
  return { lines, restore: () => { console.log = original; } };
}

function cardWithEveryFailure() {
  const capsules = Array.from(
    { length: CONTEXT_MAX_FAILURE_CAPSULES + 1 },
    (_, index) => `### F-${String(index + 1).padStart(3, '0')}`,
  );
  return [
    taskContextTemplate('demo').replace('## Resume checklist', '## Missing resume heading'),
    ...capsules,
    ...Array.from({ length: CONTEXT_MAX_NONBLANK_LINES + 1 }, () => 'x'.repeat(80)),
  ].join('\n');
}

test('validateContextCard: verbatim template is valid and within both budgets', () => {
  const result = validateContextCard(taskContextTemplate('demo'), 'demo');
  assert.equal(result.valid, true);
  assert.ok(result.metrics.bytes <= CONTEXT_MAX_BYTES);
  assert.ok(result.metrics.nonblankLines <= CONTEXT_MAX_NONBLANK_LINES);
  assert.equal(result.metrics.failureCapsules, 1);
});

test('validateContextCard: size, line, heading, and capsule failures are deterministic', () => {
  const content = cardWithEveryFailure();
  const first = validateContextCard(content, 'demo');
  const second = validateContextCard(content, 'demo');

  assert.deepEqual(first, second);
  assert.equal(first.valid, false);
  assert.deepEqual(first.failures.map(failure => failure.code), [
    'size', 'nonblank-lines', 'required-headings', 'failure-capsules',
  ]);
  assert.ok(first.metrics.bytes > CONTEXT_MAX_BYTES);
  assert.ok(first.metrics.nonblankLines > CONTEXT_MAX_NONBLANK_LINES);
  assert.equal(first.metrics.failureCapsules, CONTEXT_MAX_FAILURE_CAPSULES + 2);
});

test('context init creates only a missing active-task card and then becomes a no-op', async () => {
  const { dir, path } = await fixture();
  const cap = captureLogs();
  try {
    const created = await runContextInit({ targetDir: dir });
    assert.equal(created.status, 'initialized');
    assert.equal(await readFile(path, 'utf8'), taskContextTemplate('demo'));

    await writeFile(path, '# preserved\n');
    const existing = await runContextInit({ targetDir: dir });
    assert.equal(existing.status, 'exists');
    assert.equal(await readFile(path, 'utf8'), '# preserved\n');
  } finally {
    cap.restore();
    await rm(dir, { recursive: true, force: true });
  }
});

test('context check reports every failure and never modifies the card', async () => {
  const malformed = cardWithEveryFailure();
  const { dir, path } = await fixture({ card: malformed });
  const cap = captureLogs();
  const previousExitCode = process.exitCode;
  try {
    const before = await readFile(path, 'utf8');
    const result = await runContextCheck({ targetDir: dir });
    const after = await readFile(path, 'utf8');

    assert.equal(result.status, 'invalid');
    assert.equal(after, before);
    assert.ok(cap.lines.some(line => line.startsWith('failure: size |')));
    assert.ok(cap.lines.some(line => line.startsWith('failure: nonblank-lines |')));
    assert.ok(cap.lines.some(line => line.startsWith('failure: required-headings |')));
    assert.ok(cap.lines.some(line => line.startsWith('failure: failure-capsules |')));
    assert.equal(process.exitCode, 1);
  } finally {
    cap.restore();
    process.exitCode = previousExitCode;
    await rm(dir, { recursive: true, force: true });
  }
});

test('context check reports a missing card with the concrete init action', async () => {
  const { dir } = await fixture();
  const cap = captureLogs();
  const previousExitCode = process.exitCode;
  try {
    const result = await runContextCheck({ targetDir: dir });
    assert.equal(result.status, 'missing');
    assert.ok(cap.lines.includes('next-action: harness-team context init'));
    assert.equal(process.exitCode, 1);
  } finally {
    cap.restore();
    process.exitCode = previousExitCode;
    await rm(dir, { recursive: true, force: true });
  }
});

test('context commands report no-active-task without creating a card', async () => {
  const { dir, path } = await fixture({ active: false });
  const cap = captureLogs();
  const previousExitCode = process.exitCode;
  try {
    assert.equal((await runContextInit({ targetDir: dir })).status, 'no-active-task');
    assert.equal((await runContextCheck({ targetDir: dir })).status, 'no-active-task');
    await assert.rejects(readFile(path, 'utf8'), { code: 'ENOENT' });
  } finally {
    cap.restore();
    process.exitCode = previousExitCode;
    await rm(dir, { recursive: true, force: true });
  }
});

test('CLI routes context arguments against the cwd/target task context', async () => {
  const { dir, path } = await fixture();
  try {
    const { stdout: initOut } = await pexec('node', [
      join(ROOT, 'bin', 'harness-team.mjs'), 'context', 'init', '--target', dir,
    ]);
    assert.match(initOut, /context: initialized/);
    assert.equal(await readFile(path, 'utf8'), taskContextTemplate('demo'));

    const { stdout: checkOut } = await pexec('node', [
      join(ROOT, 'bin', 'harness-team.mjs'), 'context', 'check', '--target', dir,
    ]);
    assert.match(checkOut, /context: valid/);
  } finally {
    await rm(dir, { recursive: true, force: true });
  }
});

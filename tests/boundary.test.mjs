import { test } from 'node:test';
import assert from 'node:assert/strict';
import { mkdtemp, mkdir, rm, writeFile, chmod } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { spawn } from 'node:child_process';
import { parseBoundaryDeclaration, runBoundaryCheck } from '../src/commands/boundary.mjs';

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const HOOK = join(ROOT, 'templates', '.claude', 'hooks', 'boundary-checkpoint.sh');

function declaration(boundaries) {
  return `# demo — Spec\n\n## Boundary contracts\n\n\`\`\`json\n${JSON.stringify({ version: 1, boundaries }, null, 2)}\n\`\`\`\n`;
}

function boundary(overrides = {}) {
  return {
    id: 'users',
    producer: { path: 'schemas/producer.json' },
    consumer: { path: 'schemas/consumer.json' },
    ...overrides,
  };
}

function objectSchema(properties, required = Object.keys(properties)) {
  return { type: 'object', properties, required };
}

async function fixture({ spec, producer, consumer } = {}) {
  const dir = await mkdtemp(join(tmpdir(), 'harness-boundary-'));
  const taskDir = join(dir, 'docs', 'tester', 'demo');
  await mkdir(join(dir, '.harness'), { recursive: true });
  await mkdir(join(dir, 'schemas'), { recursive: true });
  await mkdir(taskDir, { recursive: true });
  await writeFile(join(dir, '.harness', 'active.json'), JSON.stringify({ user: 'tester', task: 'demo', path: 'docs/tester/demo' }));
  await writeFile(join(taskDir, 'demo-spec.md'), spec ?? declaration([boundary()]));
  await writeFile(join(taskDir, 'demo-plan.md'), '# demo — Plan\n- [ ] verify boundary\n');
  await writeFile(join(dir, 'schemas', 'producer.json'), JSON.stringify(producer ?? objectSchema({ id: { type: 'string' } })));
  await writeFile(join(dir, 'schemas', 'consumer.json'), JSON.stringify(consumer ?? objectSchema({ id: { type: 'string' } })));
  return { dir, taskDir };
}

function captureLogs() {
  const lines = [];
  const original = console.log;
  console.log = (...args) => lines.push(args.join(' '));
  return { lines, restore: () => { console.log = original; } };
}

async function check(fixtureOptions) {
  const setup = await fixture(fixtureOptions);
  const logs = captureLogs();
  const previousExitCode = process.exitCode;
  try {
    process.exitCode = undefined;
    const result = await runBoundaryCheck({ targetDir: setup.dir, flags: {} });
    return { ...setup, result, lines: logs.lines, exitCode: process.exitCode };
  } finally {
    logs.restore();
    process.exitCode = previousExitCode;
  }
}

async function cleanup(result) {
  await rm(result.dir, { recursive: true, force: true });
}

function runWithInput(command, args, input, options) {
  return new Promise(resolveResult => {
    const child = spawn(command, args, { stdio: ['pipe', 'pipe', 'pipe'], ...options });
    let stdout = '';
    let stderr = '';
    child.stdout.on('data', data => { stdout += data; });
    child.stderr.on('data', data => { stderr += data; });
    child.on('close', code => resolveResult({ code, stdout, stderr }));
    child.on('error', error => resolveResult({ code: -1, stdout, stderr: String(error) }));
    child.stdin.end(input);
  });
}

test('boundary check: declaration absent is a compatible success', async () => {
  const result = await check({ spec: '# demo — Spec\n\n## 설계\n- no boundary declaration\n' });
  try {
    assert.equal(result.result.status, 'not-configured');
    assert.equal(result.exitCode, undefined);
    assert.deepEqual(result.lines, ['boundary: not-configured']);
  } finally { await cleanup(result); }
});

test('boundary check: malformed declaration fails deterministically', async () => {
  const result = await check({ spec: '# demo — Spec\n\n## Boundary contracts\n```json\n{ bad json }\n```\n' });
  try {
    assert.equal(result.result.status, 'error');
    assert.equal(result.exitCode, 2);
    assert.match(result.lines[1], /invalid-json/);
  } finally { await cleanup(result); }
});

test('boundary check: wrapper mismatch reports the consumer field absent at producer root', async () => {
  const result = await check({
    producer: objectSchema({ data: objectSchema({ id: { type: 'string' } }) }),
    consumer: objectSchema({ id: { type: 'string' } }),
  });
  try {
    assert.equal(result.exitCode, 2);
    assert.ok(result.lines.some(line => line.includes('missing-field') && line.includes('"id"')));
  } finally { await cleanup(result); }
});

test('boundary check: snake_case producer and camelCase consumer mismatch', async () => {
  const result = await check({
    producer: objectSchema({ user_id: { type: 'string' } }),
    consumer: objectSchema({ userId: { type: 'string' } }),
  });
  try {
    assert.equal(result.exitCode, 2);
    assert.ok(result.lines.some(line => line.includes('missing-field') && line.includes('userId')));
  } finally { await cleanup(result); }
});

test('boundary check: producer field not marked required is not a consumer guarantee', async () => {
  const result = await check({
    producer: objectSchema({ id: { type: 'string' } }, []),
    consumer: objectSchema({ id: { type: 'string' } }),
  });
  try {
    assert.equal(result.exitCode, 2);
    assert.ok(result.lines.some(line => line.includes('not-guaranteed') && line.includes('"id"')));
  } finally { await cleanup(result); }
});

test('boundary check: basic type mismatch fails', async () => {
  const result = await check({
    producer: objectSchema({ id: { type: 'number' } }),
    consumer: objectSchema({ id: { type: 'string' } }),
  });
  try {
    assert.equal(result.exitCode, 2);
    assert.ok(result.lines.some(line => line.includes('type-mismatch') && line.includes('number') && line.includes('string')));
  } finally { await cleanup(result); }
});

test('boundary check: optional consumer field does not require producer support', async () => {
  const result = await check({
    producer: objectSchema({ id: { type: 'string' } }),
    consumer: objectSchema({ id: { type: 'string' }, nickname: { type: 'string' } }, ['id']),
  });
  try {
    assert.equal(result.result.status, 'pass');
    assert.equal(result.exitCode, undefined);
    assert.deepEqual(result.lines, ['boundary: pass (1 checked)']);
  } finally { await cleanup(result); }
});

test('boundary check: JSON Pointer selects a wrapped producer object', async () => {
  const result = await check({
    spec: declaration([boundary({ producer: { path: 'schemas/producer.json', pointer: '/data' } })]),
    producer: objectSchema({ data: objectSchema({ id: { type: 'string' } }) }),
    consumer: objectSchema({ id: { type: 'string' } }),
  });
  try {
    assert.equal(result.result.status, 'pass');
    assert.equal(result.exitCode, undefined);
  } finally { await cleanup(result); }
});

test('boundary check: schema paths cannot escape the project root', async () => {
  const result = await check({
    spec: declaration([boundary({ producer: { path: '../outside.json' } })]),
  });
  try {
    assert.equal(result.exitCode, 2);
    assert.ok(result.lines.some(line => line.includes('invalid-path') && line.includes('stay inside the project root')));
  } finally { await cleanup(result); }
});

test('boundary checkpoint only invokes the verifier for an Edit checkbox transition', async () => {
  const result = await check();
  const binDir = join(result.dir, '.bin');
  const shim = join(binDir, 'harness-team');
  await mkdir(binDir, { recursive: true });
  await writeFile(shim, `#!/bin/sh\nexec node ${JSON.stringify(join(ROOT, 'bin', 'harness-team.mjs'))} "$@"\n`);
  await chmod(shim, 0o755);
  const planPath = join(result.taskDir, 'demo-plan.md');
  const env = { ...process.env, PATH: `${binDir}:${process.env.PATH}` };
  try {
    const nonTransition = await runWithInput('bash', [HOOK], JSON.stringify({
      tool_name: 'Edit', tool_input: { file_path: planPath, old_string: '- [ ] untouched', new_string: '- [ ] still open' },
    }), { cwd: result.dir, env });
    assert.equal(nonTransition.code, 0);
    assert.equal(nonTransition.stdout, '');

    const transition = await runWithInput('bash', [HOOK], JSON.stringify({
      tool_name: 'Edit', tool_input: { file_path: planPath, old_string: '- [ ] verify', new_string: '- [x] verify' },
    }), { cwd: result.dir, env });
    assert.equal(transition.code, 0);
    assert.match(transition.stdout, /boundary: pass \(1 checked\)/);
  } finally { await cleanup(result); }
});

test('boundary declaration parser rejects duplicate ids before file reads', () => {
  const parsed = parseBoundaryDeclaration(declaration([boundary(), boundary()]));
  assert.equal(parsed.status, 'invalid');
  assert.ok(parsed.failures.some(item => item.code === 'duplicate-id'));
});

import { test } from 'node:test';
import assert from 'node:assert/strict';
import { mkdtemp, mkdir, writeFile, rm } from 'node:fs/promises';
import { join, resolve, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { tmpdir } from 'node:os';
import { runRelease } from '../src/commands/release.mjs';
import { runRetro, runTask } from '../src/commands/task.mjs';
import { runDoctor } from '../src/commands/doctor.mjs';
import { OBSERVATION_SCHEMA } from '../src/observation.mjs';

const ROOT_DIR = resolve(dirname(fileURLToPath(import.meta.url)), '..');

function captureJson() {
  const logs = [];
  const orig = console.log;
  console.log = (...a) => logs.push(a.join(' '));
  return {
    logs,
    restore() { console.log = orig; },
    soleEnvelope() {
      assert.equal(logs.length, 1, `정확히 한 객체여야 함, got ${logs.length}`);
      const env = JSON.parse(logs[0]);
      assert.equal(env.schema, OBSERVATION_SCHEMA);
      return env;
    },
  };
}

test('retro --json: 성공 → status success + artifacts에 artifact 경로', async () => {
  const dir = await mkdtemp(join(tmpdir(), 'harness-retro-json-'));
  await mkdir(join(dir, '.harness'), { recursive: true });
  await writeFile(join(dir, '.harness/active.json'),
    JSON.stringify({ user: 'tester', task: 'demo', path: 'docs/tester/demo' }));
  await mkdir(join(dir, 'docs', 'tester', 'demo'), { recursive: true });
  const cap = captureJson();
  try {
    await runRetro({ targetDir: dir, flags: { json: true }, taskArgs: ['note'] });
    const env = cap.soleEnvelope();
    assert.equal(env.command, 'retro');
    assert.equal(env.status, 'success');
    assert.ok(env.artifacts.some(a => a.endsWith('demo-artifact.md')));
  } finally { cap.restore(); await rm(dir, { recursive: true, force: true }); }
});

test('retro --json: 활성 task 없음 → status error + 에러 계약 + exitCode 1', async () => {
  const dir = await mkdtemp(join(tmpdir(), 'harness-retro-json-noactive-'));
  const cap = captureJson();
  const prev = process.exitCode;
  try {
    await runRetro({ targetDir: dir, flags: { json: true }, taskArgs: [] });
    const env = cap.soleEnvelope();
    assert.equal(env.status, 'error');
    assert.ok(env.error.root_cause && env.error.safe_retry && env.error.stop_condition);
    assert.equal(process.exitCode, 1);
  } finally { cap.restore(); process.exitCode = prev; await rm(dir, { recursive: true, force: true }); }
});

test('release --json: 에러(빈 dir → manifest 부재) → status error + error 계약', async () => {
  const dir = await mkdtemp(join(tmpdir(), 'harness-rel-json-'));
  const cap = captureJson();
  const prev = process.exitCode;
  try {
    await runRelease({ targetDir: dir, flags: { json: true, 'dry-run': true }, taskArgs: ['patch'] });
    const env = cap.soleEnvelope();
    assert.equal(env.command, 'release');
    assert.equal(env.status, 'error');
    assert.ok(env.error && env.error.root_cause && env.error.safe_retry && env.error.stop_condition);
    assert.equal(process.exitCode, 1);
  } finally {
    cap.restore(); process.exitCode = prev;
    await rm(dir, { recursive: true, force: true });
  }
});

test('task --json: 생성 → status success + 4파일 artifacts', async () => {
  const dir = await mkdtemp(join(tmpdir(), 'harness-task-json-'));
  const cap = captureJson();
  try {
    await runTask({ targetDir: dir, flags: { json: true, member: 'tester' }, taskArgs: ['demo'] });
    const env = cap.soleEnvelope();
    assert.equal(env.command, 'task');
    assert.equal(env.status, 'success');
    assert.equal(env.artifacts.length, 4);
    assert.ok(env.artifacts.some(a => a.endsWith('demo-spec.md')));
  } finally { cap.restore(); await rm(dir, { recursive: true, force: true }); }
});

test('task --json: 잘못된 이름 → status error + 에러 계약 + exitCode 1', async () => {
  const dir = await mkdtemp(join(tmpdir(), 'harness-task-json-bad-'));
  const cap = captureJson();
  const prev = process.exitCode;
  try {
    await runTask({ targetDir: dir, flags: { json: true, member: 'tester' }, taskArgs: ['bad name!'] });
    const env = cap.soleEnvelope();
    assert.equal(env.status, 'error');
    assert.ok(env.error.root_cause && env.error.safe_retry && env.error.stop_condition);
    assert.equal(process.exitCode, 1);
  } finally { cap.restore(); process.exitCode = prev; await rm(dir, { recursive: true, force: true }); }
});

test('task (human): 잘못된 이름 → cause/retry/stop + exitCode 1', async () => {
  const dir = await mkdtemp(join(tmpdir(), 'harness-task-human-bad-'));
  const logs = [];
  const orig = console.log; console.log = (...a) => logs.push(a.join(' '));
  const prev = process.exitCode;
  try {
    await runTask({ targetDir: dir, flags: { member: 'tester' }, taskArgs: [''] });
    assert.equal(process.exitCode, 1);
    assert.ok(logs.some(l => l.startsWith('cause:')));
    assert.ok(logs.some(l => l.startsWith('retry:')));
    assert.ok(logs.some(l => l.startsWith('stop:')));
  } finally { console.log = orig; process.exitCode = prev; await rm(dir, { recursive: true, force: true }); }
});

test('doctor --json: 단일 envelope + checks 배열 + status error(빈 dir)', async () => {
  const dir = await mkdtemp(join(tmpdir(), 'harness-doctor-json-'));
  const cap = captureJson();
  const prev = process.exitCode;
  try {
    await runDoctor({ targetDir: dir, root: ROOT_DIR, flags: { json: true } });
    const env = cap.soleEnvelope();
    assert.equal(env.command, 'doctor');
    assert.equal(env.status, 'error'); // 빈 dir → 필수 파일 missing
    assert.ok(Array.isArray(env.checks) && env.checks.length > 0);
    assert.ok(env.checks.some(c => c.status === 'fail'));
    assert.ok(env.checks.every(c => typeof c.label === 'string' && typeof c.status === 'string'));
    // invariant: status==='error' ⟺ error!=null (uniform with release/retro/task)
    assert.ok(env.error && env.error.root_cause && env.error.safe_retry && env.error.stop_condition,
      'status:error envelope must carry a non-null error contract');
    assert.equal(process.exitCode, 1);
  } finally { cap.restore(); process.exitCode = prev; await rm(dir, { recursive: true, force: true }); }
});

// Build a valid 3-manifest fixture so release() succeeds (mirrors release.test.mjs makeRoot).
async function makeReleaseRoot(version = '1.2.3') {
  const root = await mkdtemp(join(tmpdir(), 'harness-rel-ok-'));
  const name = 'harness-aijient-team';
  await mkdir(join(root, '.claude-plugin'), { recursive: true });
  await mkdir(join(root, 'commands'), { recursive: true });
  await writeFile(join(root, 'package.json'), JSON.stringify({ name, version }, null, 2) + '\n');
  await writeFile(join(root, '.claude-plugin/plugin.json'),
    JSON.stringify({ name, version, commands: ['./commands/harness-release.md'] }, null, 2) + '\n');
  await writeFile(join(root, '.claude-plugin/marketplace.json'),
    JSON.stringify({ name: 'harness-aijient-team-marketplace', plugins: [{ name, version }] }, null, 2) + '\n');
  await writeFile(join(root, 'commands/harness-release.md'), '# release\n');
  return root;
}

test('release --json: dry-run 성공 → status success + error null + artifacts []', async () => {
  const root = await makeReleaseRoot('1.2.3');
  const cap = captureJson();
  try {
    await runRelease({ targetDir: root, flags: { json: true, 'dry-run': true, 'skip-cache': true }, taskArgs: ['patch'] });
    const env = cap.soleEnvelope();
    assert.equal(env.command, 'release');
    assert.equal(env.status, 'success');
    assert.equal(env.error, null);
    assert.match(env.summary, /1\.2\.3 → 1\.2\.4/);
    assert.deepEqual(env.artifacts, []); // dry-run writes nothing
  } finally { cap.restore(); await rm(root, { recursive: true, force: true }); }
});

test('task --json: 기존 task 재활성화 → status success + summary activated:', async () => {
  const dir = await mkdtemp(join(tmpdir(), 'harness-task-json-act-'));
  // First create the task (human mode), then re-activate it with --json.
  await runTask({ targetDir: dir, flags: { member: 'tester' }, taskArgs: ['demo'] });
  const cap = captureJson();
  try {
    await runTask({ targetDir: dir, flags: { json: true, member: 'tester' }, taskArgs: ['demo'] });
    const env = cap.soleEnvelope();
    assert.equal(env.command, 'task');
    assert.equal(env.status, 'success');
    assert.match(env.summary, /^activated:/);
    assert.ok(env.artifacts.some(a => a.endsWith('tester/demo')));
  } finally { cap.restore(); await rm(dir, { recursive: true, force: true }); }
});

import { test } from 'node:test';
import assert from 'node:assert/strict';
import { mkdtemp, mkdir, writeFile, rm } from 'node:fs/promises';
import { join } from 'node:path';
import { tmpdir } from 'node:os';
import { runRelease } from '../src/commands/release.mjs';
import { runRetro } from '../src/commands/task.mjs';
import { OBSERVATION_SCHEMA } from '../src/observation.mjs';

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

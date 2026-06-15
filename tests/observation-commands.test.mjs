import { test } from 'node:test';
import assert from 'node:assert/strict';
import { mkdtemp, mkdir, writeFile, rm } from 'node:fs/promises';
import { join } from 'node:path';
import { tmpdir } from 'node:os';
import { runRelease } from '../src/commands/release.mjs';
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

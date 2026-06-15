import { test } from 'node:test';
import assert from 'node:assert/strict';
import { OBSERVATION_SCHEMA, buildEnvelope, emitObservation } from '../src/observation.mjs';

test('buildEnvelope: 성공 기본값 (error null, 배열 기본 [])', () => {
  const env = buildEnvelope({ command: 'task', status: 'success', summary: 'created' });
  assert.equal(env.schema, OBSERVATION_SCHEMA);
  assert.equal(env.command, 'task');
  assert.equal(env.status, 'success');
  assert.equal(env.summary, 'created');
  assert.deepEqual(env.next_actions, []);
  assert.deepEqual(env.artifacts, []);
  assert.equal(env.error, null);
});

test('buildEnvelope: 에러 객체 매핑 (root_cause/safe_retry/stop_condition)', () => {
  const env = buildEnvelope({
    command: 'release', status: 'error', summary: 'failed',
    error: { root_cause: 'rc', safe_retry: 'sr', stop_condition: 'sc' },
  });
  assert.equal(env.status, 'error');
  assert.deepEqual(env.error, { root_cause: 'rc', safe_retry: 'sr', stop_condition: 'sc' });
});

test('buildEnvelope: extra 병합 (doctor checks)', () => {
  const env = buildEnvelope({
    command: 'doctor', status: 'warning', summary: '1 warning',
    extra: { checks: [{ label: 'AGENTS.md', status: 'pass' }] },
  });
  assert.equal(env.checks.length, 1);
  assert.equal(env.checks[0].label, 'AGENTS.md');
});

test('emitObservation: stdout에 단일 유효 JSON 객체만', () => {
  const logs = [];
  const orig = console.log;
  console.log = (...a) => logs.push(a.join(' '));
  try {
    emitObservation(buildEnvelope({ command: 'task', status: 'success', summary: 's' }));
  } finally { console.log = orig; }
  assert.equal(logs.length, 1, '정확히 한 번 출력');
  const parsed = JSON.parse(logs[0]);
  assert.equal(parsed.schema, OBSERVATION_SCHEMA);
});

import { test } from 'node:test';
import assert from 'node:assert/strict';
import { OBSERVATION_SCHEMA, buildEnvelope, buildErrorPacket, emitObservation, renderErrorPacket } from '../src/observation.mjs';

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

// escalation packet (권고 ③) — PDF §V.A의 5항목 중 "시도한 대안"과 "무응답 시 안전 기본값".
// 강제는 이 헬퍼가 전담한다. buildEnvelope는 error를 그대로 통과시키는 성질을 유지한다.
test('buildErrorPacket: 5키 패킷 — alternatives 기본값은 빈 배열', () => {
  const packet = buildErrorPacket({ cause: 'c', retry: 'r', safeDefault: 'd', stop: 's' });
  assert.deepEqual(packet, {
    root_cause: 'c',
    safe_retry: 'r',
    alternatives: [],
    safe_default: 'd',
    stop_condition: 's',
  });
});

test('buildErrorPacket: 필수 필드 누락·빈 문자열·잘못된 타입은 throw (생산자 실수를 개발 시점에)', () => {
  assert.throws(() => buildErrorPacket({ cause: 'c', retry: 'r', stop: 's' }), /safeDefault/);
  assert.throws(() => buildErrorPacket({ cause: '', retry: 'r', safeDefault: 'd', stop: 's' }), /cause/);
  assert.throws(() => buildErrorPacket({ cause: [], retry: 'r', safeDefault: 'd', stop: 's' }), /cause/);
  assert.throws(() => buildErrorPacket({ cause: 'c', retry: 'r', safeDefault: 'd', stop: '' }), /stop/);
  assert.throws(
    () => buildErrorPacket({ cause: 'c', retry: 'r', safeDefault: 'd', stop: 's', alternatives: 'x' }),
    /alternatives/,
  );
});

test('renderErrorPacket: alternatives가 비면 그 줄 자체를 찍지 않는다', () => {
  const lines = renderErrorPacket(buildErrorPacket({ cause: 'c', retry: 'r', safeDefault: 'd', stop: 's' }));
  assert.deepEqual(lines, ['cause: c', 'retry: r', 'default: d', 'stop: s']);
});

test('renderErrorPacket: alternatives는 항목마다 한 줄', () => {
  const lines = renderErrorPacket(buildErrorPacket({
    cause: 'c', retry: 'r', alternatives: ['a1', 'a2'], safeDefault: 'd', stop: 's',
  }));
  assert.deepEqual(lines, ['cause: c', 'retry: r', 'alternatives: a1', 'alternatives: a2', 'default: d', 'stop: s']);
});

// runDone 가드는 issue마다 cause 줄을 찍는다 — 배열 cause가 그 출력을 보존한다(text 전용).
test('renderErrorPacket: cause가 배열이면 항목마다 cause 줄', () => {
  const lines = renderErrorPacket(buildErrorPacket({
    cause: ['i1', 'i2'], retry: 'r', safeDefault: 'd', stop: 's',
  }));
  assert.deepEqual(lines, ['cause: i1', 'cause: i2', 'retry: r', 'default: d', 'stop: s']);
});

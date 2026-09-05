import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readdir, readFile } from 'node:fs/promises';
import { join, resolve, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { OBSERVATION_SCHEMA, buildEnvelope, buildErrorPacket, emitObservation, renderErrorPacket } from '../src/observation.mjs';

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), '..');

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

// 생산자가 error 객체를 리터럴로 만들면 새 필드를 빠뜨린 채 통과한다 — 강제 지점은
// buildErrorPacket 하나여야 한다. observation.mjs 자신과 테스트는 정당한 예외라
// scope를 src/commands/ 로 한정한다.
test('pin: src/commands/*.mjs 는 리터럴 root_cause: 를 쓰지 않는다 (헬퍼 경유만)', async () => {
  const dir = join(ROOT, 'src', 'commands');
  const files = (await readdir(dir)).filter(f => f.endsWith('.mjs'));
  assert.ok(files.length >= 6, `명령 파일이 있어야 함, got ${files.length}`);
  const offenders = [];
  for (const f of files) {
    if (/root_cause\s*:/.test(await readFile(join(dir, f), 'utf8'))) offenders.push(f);
  }
  assert.deepEqual(offenders, [], `리터럴 root_cause: 를 쓰는 생산자: ${offenders.join(', ')}`);
});

// buildEnvelope가 error를 정규화하지 않는다는 사실이 기존 deepEqual 3키 계약(위 테스트)을
// 살리는 근거다. 이 테스트는 그 pass-through만 고정한다 — "배열 cause가 엔벨로프로 나가지
// 않는다"는 규칙은 여기서 강제할 수 없고(엔벨로프는 무엇이든 통과시킨다), 실제 JSON 생산자의
// root_cause 타입을 보는 tests/observation-commands.test.mjs·tests/rules.test.mjs가 고정한다.
test('pin: buildEnvelope는 error를 정규화하지 않는다 (pass-through)', () => {
  const packet = buildErrorPacket({ cause: 'c', retry: 'r', safeDefault: 'd', stop: 's' });
  const env = buildEnvelope({ command: 'x', status: 'error', summary: 's', error: packet });
  assert.equal(env.error, packet, 'buildEnvelope는 같은 객체를 그대로 통과시킨다');
});

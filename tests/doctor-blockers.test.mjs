import { test } from 'node:test';
import assert from 'node:assert/strict';
import { doctorBlockers, isolationEnv } from './e2e/sandbox.mjs';

const check = (label, status) => ({ label, status, detail: '' });

test('doctorBlockers: 선언 빈칸만 있으면 green이다', () => {
  assert.deepEqual(doctorBlockers({ checks: [check('env declarations', 'warning'), check('hooks', 'pass')] }), []);
});

test('doctorBlockers: 그 밖의 warning과 fail은 막는다', () => {
  const trust = check('Codex hook trust', 'warning');
  const failed = check('hooks', 'fail');
  assert.deepEqual(doctorBlockers({ checks: [check('env declarations', 'warning'), trust, failed] }), [trust, failed]);
});

test('doctorBlockers: 면제는 warning에만 적용된다', () => {
  const failed = check('env declarations', 'fail');
  assert.deepEqual(doctorBlockers({ checks: [failed] }), [failed]);
});

test('isolationEnv: doctor가 읽는 개발 머신 설정 경로를 모두 샌드박스 안으로 돌린다', () => {
  const env = isolationEnv('/sandbox');
  for (const key of ['CLAUDE_PLUGINS_ROOT', 'CLAUDE_CONFIG_DIR', 'CODEX_HOME']) {
    assert.ok(env[key]?.startsWith('/sandbox/'), key);
  }
});

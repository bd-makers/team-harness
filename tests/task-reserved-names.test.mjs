// `task list` 처럼 하위명령 이름을 task 인자로 넘기면 이름 규칙은 통과한다 — 새로 만들지 않고 거부한다.
// 이미 그 이름의 task(spec 마커)가 있으면 종전대로 활성화한다(소비자 프로젝트 호환).
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { mkdtemp, mkdir, readFile, writeFile, rm } from 'node:fs/promises';
import { join } from 'node:path';
import { tmpdir } from 'node:os';
import { runTask } from '../src/commands/task.mjs';
import { exists } from '../src/fsx.mjs';

const noRemote = { doneOnMain: async () => null };

// process.exitCode 는 전역이다 — 실패 경로 테스트가 남기면 러너 전체가 실패로 끝난다.
async function task(dir, name, flags = {}) {
  const logs = [];
  const orig = console.log;
  const before = process.exitCode;
  console.log = (...a) => logs.push(a.join(' '));
  try {
    await runTask({ targetDir: dir, flags: { member: 'tester', ...flags }, taskArgs: [name] }, noRemote);
    return { logs, exitCode: process.exitCode ?? 0 };
  } finally {
    console.log = orig;
    process.exitCode = before;
  }
}

test('명령 이름으로는 새 task 를 만들지 않는다 — exit 1, 무쓰기, 뜻했을 명령을 안내한다', async () => {
  for (const name of ['list', 'done', 'handoff', 'summary']) {
    const dir = await mkdtemp(join(tmpdir(), 'harness-reserved-'));
    try {
      const r = await task(dir, name);
      assert.equal(r.exitCode, 1, name);
      assert.equal(r.logs[0], '✗ task: 명령 이름은 task 이름으로 쓸 수 없음', name);
      assert.ok(r.logs.some(l => l.includes(`harness-team ${name}`)), name);
      assert.equal(await exists(join(dir, 'docs/tester', name)), false, name);
      assert.equal(await exists(join(dir, '.harness/active.json')), false, name);

      const j = await task(dir, name, { json: true });
      assert.equal(j.exitCode, 1, name);
      const env = JSON.parse(j.logs[0]);
      assert.equal(env.status, 'error', name);
      assert.ok(env.error.safe_retry && env.error.safe_default && env.error.stop_condition && env.error.alternatives.length, name);
      assert.equal(await exists(join(dir, 'docs/tester', name)), false, name);
    } finally { await rm(dir, { recursive: true, force: true }); }
  }
});

test('이미 있는 같은 이름의 task 는 종전대로 활성화한다', async () => {
  const dir = await mkdtemp(join(tmpdir(), 'harness-reserved-'));
  try {
    await mkdir(join(dir, 'docs/tester/review'), { recursive: true });
    await writeFile(join(dir, 'docs/tester/review/review-spec.md'), '# review — Spec\n');
    const r = await task(dir, 'review');
    assert.equal(r.exitCode, 0);
    const active = JSON.parse(await readFile(join(dir, '.harness/active.json'), 'utf8'));
    assert.equal(active.task, 'review');
  } finally { await rm(dir, { recursive: true, force: true }); }
});

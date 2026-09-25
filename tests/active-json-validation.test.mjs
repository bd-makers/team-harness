// `.harness/active.json` 의 user·task 는 context·boundary·review·done 이 그대로 `docs/<user>/<task>/` 경로를 조립한다.
// `task` 는 이제 검증된 값만 쓰지만(config-user-validation) 손으로 고친 포인터는 그 검증을 거치지 않는다.
// `readActive` 가 경로 세그먼트 하나가 아닌 값을 "활성 task 없음" 으로 보고, doctor 도 같은 판독을 쓴다.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { mkdtemp, mkdir, writeFile, rm } from 'node:fs/promises';
import { join } from 'node:path';
import { tmpdir } from 'node:os';
import { readActive } from '../src/commands/task.mjs';
import { checkActiveSpecGate, checkActiveDoneOnMain } from '../src/commands/doctor.mjs';

async function withActive(active, fn) {
  const dir = await mkdtemp(join(tmpdir(), 'harness-active-validation-'));
  const errs = [];
  const orig = console.error;
  console.error = (...a) => errs.push(a.join(' '));
  try {
    await mkdir(join(dir, '.harness'), { recursive: true });
    await writeFile(join(dir, '.harness/active.json'), typeof active === 'string' ? active : JSON.stringify(active));
    return await fn(dir, errs);
  } finally {
    console.error = orig;
    await rm(dir, { recursive: true, force: true });
  }
}

for (const active of [
  { user: '../../x', task: 'foo' },
  { user: 'hslee', task: '..' },
  { user: 'hslee', task: 'a/b' },
  { user: 42, task: 'foo' },
]) {
  test(`readActive 는 ${JSON.stringify(active)} 를 활성 task 없음(null)으로 보고 경고한다`, () => withActive(active, async (dir, errs) => {
    assert.equal(await readActive(dir), null);
    assert.match(errs.join('\n'), /active\.json/);
  }));
}

test('readActive 는 정상 포인터·한글 user·빈 placeholder 를 종전대로 돌려준다', async () => {
  await withActive({ user: 'hslee', task: 'foo' }, async dir => assert.deepEqual(await readActive(dir), { user: 'hslee', task: 'foo' }));
  await withActive({ user: '이한상', task: 'foo' }, async dir => assert.deepEqual(await readActive(dir), { user: '이한상', task: 'foo' }));
  await withActive('{}\n', async (dir, errs) => {
    assert.deepEqual(await readActive(dir), {});
    assert.deepEqual(errs, [], 'init 의 빈 placeholder 는 경고 대상이 아니다');
  });
  await withActive('null\n', async dir => assert.equal(await readActive(dir), null));
});

test('doctor 는 경로를 벗어나는 active 포인터로 파일을 찾지 않는다', () => withActive({ user: '../../x', task: 'foo' }, async dir => {
  assert.equal(await checkActiveSpecGate(dir), null);
  let called = false;
  assert.equal(await checkActiveDoneOnMain(dir, { doneOnMain: async () => { called = true; return { ref: 'origin/main', closedAt: null }; } }), null);
  assert.equal(called, false);
}));

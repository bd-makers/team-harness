// `.harness/config.json` 의 user 가 raw 로 `docs/<user>/` 경로 조립에 쓰여, `../../x` 면 task 파일이 프로젝트 root 밖에
// 생겼다(PR #98 codex 3차 P1). 결정된 user(어느 출처든)가 경로 세그먼트 하나가 아니면 `task` 는 아무것도 쓰기 전에 거부한다.
// 한글·공백 이름은 실제 입력이라 계속 통과한다.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { mkdtemp, mkdir, readdir, writeFile, rm } from 'node:fs/promises';
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
    await runTask({ targetDir: dir, flags, taskArgs: [name] }, noRemote);
    return { logs, exitCode: process.exitCode ?? 0 };
  } finally {
    console.log = orig;
    process.exitCode = before;
  }
}

// root 를 한 단계 안쪽(<tmp>/proj)에 둬서 root 밖으로 새는 쓰기도 <tmp> 안에서 잡힌다.
async function fixture(user) {
  const base = await mkdtemp(join(tmpdir(), 'harness-user-validation-'));
  const dir = join(base, 'proj');
  await mkdir(join(dir, '.harness'), { recursive: true });
  await writeFile(join(dir, '.harness/config.json'), JSON.stringify({ user }) + '\n');
  return { base, dir };
}

for (const user of ['../../x', '..', '.hidden', 'a/b', 'a\\b', 'a\u0000b']) {
  test(`config user ${JSON.stringify(user)} 는 거부하고 아무것도 쓰지 않는다`, async () => {
    const { base, dir } = await fixture(user);
    try {
      const { logs, exitCode } = await task(dir, 'foo');
      assert.equal(exitCode, 1);
      assert.match(logs.join('\n'), /user/);
      assert.deepEqual(await readdir(base), ['proj'], 'root 밖에 아무것도 생기지 않는다');
      assert.equal(await exists(join(dir, 'docs')), false);
      assert.equal(await exists(join(dir, '.harness/active.json')), false);
    } finally { await rm(base, { recursive: true, force: true }); }
  });
}

// falsy(null·false·0·'')는 종전대로 미설정 → 폴백이다(init 의 `if (config.user)` 와 같은 기준). truthy 비문자열만 거부.
test('config user 가 truthy 비문자열이면 거부한다', async () => {
  const { base, dir } = await fixture({ name: 'x' });
  try {
    const { exitCode } = await task(dir, 'foo');
    assert.equal(exitCode, 1);
    assert.equal(await exists(join(dir, '.harness/active.json')), false);
  } finally { await rm(base, { recursive: true, force: true }); }
});

test('--member 가 sanitize 뒤에도 `..` 이면 거부한다', async () => {
  const { base, dir } = await fixture('chad');
  try {
    const { exitCode } = await task(dir, 'foo', { member: '..' });
    assert.equal(exitCode, 1);
    assert.deepEqual(await readdir(base), ['proj']);
    assert.equal(await exists(join(dir, 'foo')), false);
  } finally { await rm(base, { recursive: true, force: true }); }
});

for (const user of ['이한상', 'Chad Lee', 'a..b']) {
  test(`config user ${JSON.stringify(user)} 는 종전대로 통과한다`, async () => {
    const { base, dir } = await fixture(user);
    try {
      const { exitCode } = await task(dir, 'foo');
      assert.equal(exitCode, 0);
      assert.equal(await exists(join(dir, 'docs', user, 'foo', 'foo-spec.md')), true);
    } finally { await rm(base, { recursive: true, force: true }); }
  });
}

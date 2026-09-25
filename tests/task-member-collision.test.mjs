// member 를 추론(.harness/config.json user → git → $USER)했을 때 다른 member 에 같은 이름의 task 가 있으면
// 새로 만들지 않는다 — 한 머신에 두 정체성이 있을 때 `task <name>` 이 별개 스캐폴드를 만들던 사고.
// `--member` 는 README 의 식별 규칙대로 config user 보다 우선하며, 명시하면 가드 없이 진행한다.
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
    await runTask({ targetDir: dir, flags, taskArgs: [name] }, noRemote);
    return { logs, exitCode: process.exitCode ?? 0 };
  } finally {
    console.log = orig;
    process.exitCode = before;
  }
}

// config user=chad 인 checkout 에 hslee 의 task `foo` 가 있다 — 집 머신 main 과 같은 모양.
async function fixture() {
  const dir = await mkdtemp(join(tmpdir(), 'harness-member-collision-'));
  await mkdir(join(dir, '.harness'), { recursive: true });
  await writeFile(join(dir, '.harness/config.json'), '{ "user": "chad" }\n');
  await mkdir(join(dir, 'docs/hslee/foo'), { recursive: true });
  await writeFile(join(dir, 'docs/hslee/foo/foo-spec.md'), '# foo — Spec\n');
  return dir;
}

const active = async dir => JSON.parse(await readFile(join(dir, '.harness/active.json'), 'utf8'));

test('추론한 member 로는 다른 member 에 있는 같은 이름의 task 를 새로 만들지 않는다', async () => {
  const dir = await fixture();
  try {
    const r = await task(dir, 'foo');
    assert.equal(r.exitCode, 1);
    assert.equal(r.logs[0], '✗ task: 다른 member 에 같은 이름의 task 가 있음');
    assert.ok(r.logs.some(l => l.includes('--member hslee')));
    assert.equal(await exists(join(dir, 'docs/chad/foo')), false);
    assert.equal(await exists(join(dir, '.harness/active.json')), false);

    const j = await task(dir, 'foo', { json: true });
    assert.equal(j.exitCode, 1);
    const env = JSON.parse(j.logs[0]);
    assert.equal(env.status, 'error');
    assert.ok(env.error.safe_retry && env.error.safe_default && env.error.stop_condition && env.error.alternatives.length);
    assert.equal(await exists(join(dir, 'docs/chad/foo')), false);
  } finally { await rm(dir, { recursive: true, force: true }); }
});

test('--member 는 config user 보다 우선한다 — 그 member 의 기존 task 를 활성화한다', async () => {
  const dir = await fixture();
  try {
    const r = await task(dir, 'foo', { member: 'hslee' });
    assert.equal(r.exitCode, 0);
    assert.deepEqual([(await active(dir)).user, (await active(dir)).task], ['hslee', 'foo']);
    assert.equal(await exists(join(dir, 'docs/chad/foo')), false);
  } finally { await rm(dir, { recursive: true, force: true }); }
});

test('--member 를 명시하면 같은 이름이 다른 member 에 있어도 새로 만든다', async () => {
  const dir = await fixture();
  try {
    const r = await task(dir, 'foo', { member: 'chad' });
    assert.equal(r.exitCode, 0);
    assert.equal(await exists(join(dir, 'docs/chad/foo/foo-spec.md')), true);
    assert.equal((await active(dir)).user, 'chad');
  } finally { await rm(dir, { recursive: true, force: true }); }
});

test('추론한 member 에 이미 같은 이름의 task 가 있으면 종전대로 활성화한다', async () => {
  const dir = await fixture();
  try {
    await mkdir(join(dir, 'docs/chad/foo'), { recursive: true });
    await writeFile(join(dir, 'docs/chad/foo/foo-spec.md'), '# foo — Spec\n');
    const r = await task(dir, 'foo');
    assert.equal(r.exitCode, 0);
    assert.equal((await active(dir)).user, 'chad');
  } finally { await rm(dir, { recursive: true, force: true }); }
});

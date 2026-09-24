// `task` 의 "기존 task" 판정은 `<name>-spec.md` 마커다 — `list` 가 쓰는 `listTaskRefs` 와 같은 기준
// (docs/spec-monorepo-scope.md §6 R1). spec 이 있는 task 의 동작은 tests/e2e/task-paths-golden.test.mjs 가 지킨다.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { mkdtemp, mkdir, readdir, readFile, writeFile, rm } from 'node:fs/promises';
import { join } from 'node:path';
import { tmpdir } from 'node:os';
import { runTask, runList } from '../src/commands/task.mjs';
import { exists } from '../src/fsx.mjs';

const noRemote = { doneOnMain: async () => null };

function capture() {
  const logs = [];
  const orig = console.log;
  console.log = (...a) => logs.push(a.join(' '));
  return { logs, restore: () => { console.log = orig; } };
}

// process.exitCode 는 전역이다 — 실패 경로 테스트가 남기면 러너 전체가 실패로 끝난다.
async function task(dir, name, flags = {}) {
  const cap = capture();
  const before = process.exitCode;
  try {
    await runTask({ targetDir: dir, flags: { member: 'tester', ...flags }, taskArgs: [name] }, noRemote);
    return { logs: cap.logs, exitCode: process.exitCode ?? 0 };
  } finally {
    cap.restore();
    process.exitCode = before;
  }
}

async function list(dir) {
  const cap = capture();
  try { await runList({ targetDir: dir, flags: { member: 'tester' } }); return cap.logs; } finally { cap.restore(); }
}

async function put(dir, rel, content) {
  const p = join(dir, rel);
  await mkdir(join(p, '..'), { recursive: true });
  await writeFile(p, content);
}

test('spec 마커 없는 기존 디렉터리는 --area 유무와 무관하게 exit 1 이고 아무것도 쓰지 않는다', async () => {
  const cases = [
    // 재현 사례: user 디렉터리를 task 이름으로 준 경우(`task hslee --member web-next`)
    { name: 'hslee', flags: {}, files: { 'docs/tester/hslee/todo-list/todo-list-spec.md': '# s\n' } },
    // 0.41.0 채택 분기가 meta 를 써 넣던 경우
    { name: 'web-notes', flags: { area: 'web' }, files: { 'docs/tester/web-notes/notes.txt': 'x\n' } },
    // spec 만 잃은 task — scaffold 하면 남은 plan 을 템플릿으로 덮어쓴다
    { name: 'lost', flags: {}, files: { 'docs/tester/lost/lost-plan.md': '# lost — Plan\n- [x] kept\n' } },
  ];
  for (const c of cases) {
    const dir = await mkdtemp(join(tmpdir(), 'harness-spec-marker-'));
    try {
      for (const [rel, content] of Object.entries(c.files)) await put(dir, rel, content);
      const taskDir = join(dir, 'docs/tester', c.name);
      const before = await readdir(taskDir);

      const r = await task(dir, c.name, c.flags);
      assert.equal(r.exitCode, 1, c.name);
      assert.equal(r.logs[0], '✗ task: 기존 디렉터리가 task 가 아님', c.name);
      assert.deepEqual(await readdir(taskDir), before, c.name);
      assert.equal(await exists(join(dir, '.harness/active.json')), false, c.name);
      for (const [rel, content] of Object.entries(c.files)) assert.equal(await readFile(join(dir, rel), 'utf8'), content, c.name);
      assert.deepEqual(await list(dir), ['(no tasks)'], c.name);

      // --json 도 같은 거부 — 단일 error 엔벨로프에 5필드 패킷, 여전히 무쓰기
      const j = await task(dir, c.name, { ...c.flags, json: true });
      assert.equal(j.exitCode, 1, c.name);
      assert.equal(j.logs.length, 1, c.name);
      const env = JSON.parse(j.logs[0]);
      assert.equal(env.status, 'error', c.name);
      assert.match(env.error.root_cause, new RegExp(`${c.name}-spec\\.md`), c.name);
      assert.ok(env.error.safe_retry && env.error.safe_default && env.error.stop_condition && env.error.alternatives.length, c.name);
      assert.deepEqual(await readdir(taskDir), before, c.name);
      assert.equal(await exists(join(dir, '.harness/active.json')), false, c.name);
    } finally { await rm(dir, { recursive: true, force: true }); }
  }
});

test('빈 디렉터리는 task 가 없는 자리로 보고 종전대로 새로 만든다', async () => {
  const dir = await mkdtemp(join(tmpdir(), 'harness-spec-marker-'));
  try {
    await mkdir(join(dir, 'docs/tester/fresh'), { recursive: true });
    const r = await task(dir, 'fresh');
    assert.equal(r.exitCode, 0);
    assert.equal(r.logs[0], 'created: docs/tester/fresh/');
    assert.equal(await exists(join(dir, 'docs/tester/fresh/fresh-spec.md')), true);
  } finally { await rm(dir, { recursive: true, force: true }); }
});

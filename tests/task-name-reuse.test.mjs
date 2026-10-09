// task-folder-removal(C2a): 원장에 `✅ done` 행이 있는데 task 폴더가 없으면 그 이름으로 task 를 새로 만들지 않는다.
// 지워진 이름을 다시 쓰면 위키 컴파일 단락의 키(`task=<user>/<task>`)와 원장 행이 겹친다. 폴더가 있으면 종전대로 reopen 이다.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { mkdtemp, mkdir, readFile, writeFile, rm } from 'node:fs/promises';
import { join } from 'node:path';
import { tmpdir } from 'node:os';
import { runTask } from '../src/commands/task.mjs';
import { exists } from '../src/fsx.mjs';

const noRemote = { doneOnMain: async () => null };
const LEDGER = '# Task Summary\n\n| User | Task | Status | Created |\n|------|------|--------|---------|\n| chad | x | ✅ done | 2026-09-01 |\n';

// process.exitCode 는 전역이다 — 실패 경로 테스트가 남기면 러너 전체가 실패로 끝난다.
async function task(dir, name, flags = { member: 'chad' }) {
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

async function fixture() {
  const dir = await mkdtemp(join(tmpdir(), 'harness-name-reuse-'));
  await mkdir(join(dir, 'docs'), { recursive: true });
  await writeFile(join(dir, 'docs/task_summary.md'), LEDGER);
  return dir;
}

test('task: refuses to reuse the name of a done task whose folder is gone', async () => {
  const dir = await fixture();
  try {
    const r = await task(dir, 'x');
    assert.equal(r.exitCode, 1);
    const out = r.logs.join('\n');
    assert.match(out, /종결된 task/);
    assert.match(out, /다른 이름/, '다른 이름으로 다시 실행하라고 안내한다');
    assert.match(out, /git log -- docs\/chad\/x/, '원문은 git 이력에서 찾는다');
    assert.equal(await exists(join(dir, 'docs/chad/x')), false, 'task 디렉터리를 만들지 않는다');
    assert.equal(await exists(join(dir, '.harness/active.json')), false, '활성 task 를 바꾸지 않는다');

    const other = await task(dir, 'y');
    assert.equal(other.exitCode, 0, '원장에 없는 이름은 종전대로 만든다');
  } finally { await rm(dir, { recursive: true, force: true }); }
});

test('task: a done task whose folder exists still reopens', async () => {
  const dir = await fixture();
  try {
    await mkdir(join(dir, 'docs/chad/x'), { recursive: true });
    await writeFile(join(dir, 'docs/chad/x/x-spec.md'), '# x — Spec\n');
    await writeFile(join(dir, 'docs/chad/x/x-meta.json'), JSON.stringify({
      user: 'chad', task: 'x', created: '2026-09-01', status: 'done', closedAt: '2026-09-02T00:00:00.000Z',
    }, null, 2) + '\n');
    const r = await task(dir, 'x');
    assert.equal(r.exitCode, 0);
    assert.ok(r.logs.some(l => l.startsWith('reopened:')), '기존 reopen 흐름 그대로');
    const meta = JSON.parse(await readFile(join(dir, 'docs/chad/x/x-meta.json'), 'utf8'));
    assert.equal(meta.status, 'open');
    assert.ok(meta.reopenedAt, 'reopenedAt 이 기록돼 done-on-main 소음 끄기가 동작한다');
  } finally { await rm(dir, { recursive: true, force: true }); }
});

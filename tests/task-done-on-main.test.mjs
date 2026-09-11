import { test } from 'node:test';
import assert from 'node:assert/strict';
import { mkdtemp, mkdir, writeFile, rm, readFile } from 'node:fs/promises';
import { join } from 'node:path';
import { tmpdir } from 'node:os';
import { runTask } from '../src/commands/task.mjs';

const VERDICT = { ref: 'origin/main', closedAt: '2026-09-08T10:00:00.000Z' };

function captureLogs() {
  const logs = [];
  const orig = console.log;
  console.log = (...a) => logs.push(a.join(' '));
  return { logs, restore: () => { console.log = orig; } };
}
async function baseDir() {
  const dir = await mkdtemp(join(tmpdir(), 'harness-task-dom-'));
  await mkdir(join(dir, '.harness'), { recursive: true });
  return dir;
}

test('task <name> 생성(created) 시 origin/<default> 에 이미 done 이면 첫 줄이 nudge, 생성은 막지 않는다', async () => {
  const dir = await baseDir();
  const cap = captureLogs();
  try {
    const calls = [];
    await runTask({ targetDir: dir, flags: { member: 'tester' }, taskArgs: ['demo'] },
      { doneOnMain: async (t, u, n) => { calls.push([t, u, n]); return VERDICT; } });
    assert.deepEqual(calls, [[dir, 'tester', 'demo']]);
    assert.match(cap.logs[0], /^\[harness\] ⚠ task tester\/demo 는 origin\/main 에서 2026-09-08T10:00:00\.000Z 에 이미 종결됨/);
    assert.equal(cap.logs[1], 'created: docs/tester/demo/');
    const meta = JSON.parse(await readFile(join(dir, 'docs/tester/demo/demo-meta.json'), 'utf8'));
    assert.equal(meta.status, 'open');
  } finally { cap.restore(); await rm(dir, { recursive: true, force: true }); }
});

test('task <name> 재활성화(activated) 시에도 같은 nudge 가 첫 줄에 온다', async () => {
  const dir = await baseDir();
  const cap = captureLogs();
  try {
    await runTask({ targetDir: dir, flags: { member: 'tester' }, taskArgs: ['demo'] }, { doneOnMain: async () => null });
    await runTask({ targetDir: dir, flags: { member: 'tester' }, taskArgs: ['other'] }, { doneOnMain: async () => null });
    cap.logs.length = 0;
    await runTask({ targetDir: dir, flags: { member: 'tester' }, taskArgs: ['demo'] }, { doneOnMain: async () => VERDICT });
    assert.match(cap.logs[0], /^\[harness\] ⚠ task tester\/demo 는 origin\/main/);
    assert.equal(cap.logs[1], 'activated: tester/demo');
  } finally { cap.restore(); await rm(dir, { recursive: true, force: true }); }
});

test('판정 null(비-git 기본 경로 포함)·예외 → nudge 줄 없이 종전 출력', async () => {
  const dir = await baseDir();
  const cap = captureLogs();
  try {
    await runTask({ targetDir: dir, flags: { member: 'tester' }, taskArgs: ['demo'] }); // tmpdir 은 git 저장소가 아니다
    assert.equal(cap.logs[0], 'created: docs/tester/demo/');
    cap.logs.length = 0;
    await runTask({ targetDir: dir, flags: { member: 'tester' }, taskArgs: ['demo'] }, { doneOnMain: async () => { throw new Error('git exploded'); } });
    assert.equal(cap.logs[0], 'activated: tester/demo');
  } finally { cap.restore(); await rm(dir, { recursive: true, force: true }); }
});

test('--json: created·activated envelope 최상위에 doneOnMain 이 붙고, 판정 null 이면 키 자체가 없다', async () => {
  const dir = await baseDir();
  const cap = captureLogs();
  try {
    await runTask({ targetDir: dir, flags: { member: 'tester', json: true }, taskArgs: ['demo'] }, { doneOnMain: async () => VERDICT });
    const created = JSON.parse(cap.logs.join('\n'));
    assert.equal(created.summary, 'created: docs/tester/demo/');
    assert.deepEqual(created.doneOnMain, VERDICT);
    cap.logs.length = 0;
    await runTask({ targetDir: dir, flags: { member: 'tester', json: true }, taskArgs: ['demo'] }, { doneOnMain: async () => VERDICT });
    const activated = JSON.parse(cap.logs.join('\n'));
    assert.equal(activated.summary, 'activated: tester/demo');
    assert.deepEqual(activated.doneOnMain, VERDICT);
    cap.logs.length = 0;
    await runTask({ targetDir: dir, flags: { member: 'tester', json: true }, taskArgs: ['demo'] }, { doneOnMain: async () => null });
    assert.equal('doneOnMain' in JSON.parse(cap.logs.join('\n')), false);
  } finally { cap.restore(); await rm(dir, { recursive: true, force: true }); }
});

// `--area` — 모노레포 task 를 앱·서비스 단위로 묶는 기계 판독 라벨(docs/spec-monorepo-scope.md §4.2 B).
// 경로는 바꾸지 않는다. 플래그를 쓰지 않은 설치본의 바이트 동일성은 tests/e2e/task-paths-golden.test.mjs 가 지킨다.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { mkdtemp, mkdir, readFile, writeFile, rm } from 'node:fs/promises';
import { join } from 'node:path';
import { tmpdir } from 'node:os';
import { runTask, runList } from '../src/commands/task.mjs';
import { collectTasks, renderTaskSummary, readLedger } from '../src/commands/summary.mjs';
import { exists } from '../src/fsx.mjs';

const noRemote = { doneOnMain: async () => null };

function capture() {
  const logs = [];
  const orig = console.log;
  console.log = (...a) => logs.push(a.join(' '));
  return { logs, restore: () => { console.log = orig; } };
}

async function fixture() {
  const dir = await mkdtemp(join(tmpdir(), 'harness-area-'));
  await mkdir(join(dir, '.harness'), { recursive: true });
  return dir;
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

async function list(dir, flags = {}) {
  const cap = capture();
  try { await runList({ targetDir: dir, flags }); return cap.logs; } finally { cap.restore(); }
}

const metaPath = (dir, name) => join(dir, 'docs/tester', name, `${name}-meta.json`);
const readMeta = async (dir, name) => JSON.parse(await readFile(metaPath(dir, name), 'utf8'));

test('새 task + --area: meta 에 task 다음 키로 area 가 들어가고, 경로·active.json·stdout 은 플래그 없을 때와 같다', async () => {
  const dir = await fixture();
  try {
    const r = await task(dir, 'web-next-login', { area: 'web-next' });
    assert.equal(r.exitCode, 0);
    assert.equal(r.logs[0], 'created: docs/tester/web-next-login/');
    const meta = await readMeta(dir, 'web-next-login');
    assert.equal(meta.area, 'web-next');
    assert.deepEqual(Object.keys(meta).slice(0, 3), ['user', 'task', 'area']);
    const active = JSON.parse(await readFile(join(dir, '.harness/active.json'), 'utf8'));
    assert.deepEqual(Object.keys(active), ['user', 'task', 'path', 'switchedAt']);
    assert.equal(active.path, 'docs/tester/web-next-login');
  } finally { await rm(dir, { recursive: true, force: true }); }
});

test('플래그 없는 새 task 의 meta 에는 area 키가 없다', async () => {
  const dir = await fixture();
  try {
    await task(dir, 'plain');
    assert.equal('area' in await readMeta(dir, 'plain'), false);
  } finally { await rm(dir, { recursive: true, force: true }); }
});

test('이름이 <area>- 로 시작하지 않으면 exit 1 이고 아무것도 만들지 않는다', async () => {
  const dir = await fixture();
  try {
    for (const name of ['login', 'web-next', 'web-nextlogin']) {
      const r = await task(dir, name, { area: 'web-next' });
      assert.equal(r.exitCode, 1, name);
      assert.equal(await exists(join(dir, 'docs')), false, name);
      assert.equal(await exists(join(dir, '.harness/active.json')), false, name);
    }
  } finally { await rm(dir, { recursive: true, force: true }); }
});

test('area 형식 위반(점·선행 하이픈·빈 값)은 exit 1 이고 아무것도 만들지 않는다', async () => {
  const dir = await fixture();
  try {
    for (const area of ['web.next', '-web', '']) {
      const r = await task(dir, `${area}-x`, { area });
      assert.equal(r.exitCode, 1, JSON.stringify(area));
    }
    assert.equal(await exists(join(dir, 'docs')), false);
  } finally { await rm(dir, { recursive: true, force: true }); }
});

test('기존 task 를 --area 없이 활성화하면 meta 바이트가 그대로다', async () => {
  const dir = await fixture();
  try {
    await task(dir, 'web-next-login', { area: 'web-next' });
    await task(dir, 'other');
    const before = await readFile(metaPath(dir, 'web-next-login'), 'utf8');
    const r = await task(dir, 'web-next-login');
    assert.equal(r.logs[0], 'activated: tester/web-next-login');
    assert.equal(await readFile(metaPath(dir, 'web-next-login'), 'utf8'), before);
  } finally { await rm(dir, { recursive: true, force: true }); }
});

test('채택: area 없는 접두 task 에 --area 를 주면 meta 에 area 만 더하고 판정 창 필드는 그대로다', async () => {
  const dir = await fixture();
  try {
    await task(dir, 'web-next-old');
    const before = await readMeta(dir, 'web-next-old');
    const r = await task(dir, 'web-next-old', { area: 'web-next' });
    assert.equal(r.exitCode, 0);
    assert.deepEqual(r.logs.slice(0, 2), ['activated: tester/web-next-old', 'area adopted: web-next']);
    assert.deepEqual(await readMeta(dir, 'web-next-old'), { ...before, area: 'web-next' });
  } finally { await rm(dir, { recursive: true, force: true }); }
});

test('이미 다른 area 인 task 에 --area 를 주면 exit 1 이고 meta·active 가 바뀌지 않는다 (접두만 겹치는 web vs web-next)', async () => {
  const dir = await fixture();
  try {
    await task(dir, 'web-next-login', { area: 'web-next' });
    await task(dir, 'other');
    const meta = await readFile(metaPath(dir, 'web-next-login'), 'utf8');
    const active = await readFile(join(dir, '.harness/active.json'), 'utf8');
    const r = await task(dir, 'web-next-login', { area: 'web' });
    assert.equal(r.exitCode, 1);
    assert.equal(await readFile(metaPath(dir, 'web-next-login'), 'utf8'), meta);
    assert.equal(await readFile(join(dir, '.harness/active.json'), 'utf8'), active);
  } finally { await rm(dir, { recursive: true, force: true }); }
});

test('--json: area 오류도 error envelope 로 답한다', async () => {
  const dir = await fixture();
  try {
    const r = await task(dir, 'login', { area: 'web', json: true });
    assert.equal(r.exitCode, 1);
    const env = JSON.parse(r.logs.join('\n'));
    assert.equal(env.command, 'task');
    assert.equal(env.status, 'error');
  } finally { await rm(dir, { recursive: true, force: true }); }
});

test('list: area 가 있는 task 줄에만 [area] 가 붙고, --area 는 그 area 만 보인다', async () => {
  const dir = await fixture();
  try {
    await task(dir, 'core');
    await task(dir, 'web-next-login', { area: 'web-next' });
    await task(dir, 'admin-audit', { area: 'admin' });
    const all = await list(dir);
    assert.ok(all.includes('  tester/core'), JSON.stringify(all));
    assert.ok(all.includes('  tester/web-next-login  [web-next]'), JSON.stringify(all));
    assert.ok(all.includes('* tester/admin-audit  [admin]'), JSON.stringify(all));
    assert.deepEqual(await list(dir, { area: 'web-next' }), ['  tester/web-next-login  [web-next]']);
    assert.deepEqual(await list(dir, { area: 'nope' }), ['(no tasks)']);
  } finally { await rm(dir, { recursive: true, force: true }); }
});

test('summary: area 가 하나도 없으면 원장이 종전과 같고, 있으면 Area 열이 맨 뒤에 붙으며 역파싱이 보존된다', async () => {
  const dir = await fixture();
  try {
    await task(dir, 'core');
    const plain = renderTaskSummary(await collectTasks(dir));
    assert.match(plain, /^\| User \| Task \| Status \| Created \|$/m);
    assert.doesNotMatch(plain, /Area/);

    await task(dir, 'web-next-login', { area: 'web-next' });
    const withArea = renderTaskSummary(await collectTasks(dir));
    assert.match(withArea, /^\| User \| Task \| Status \| Created \| Area \|$/m);
    assert.match(withArea, /^\| tester \| web-next-login \| 🔄 open \| \d{4}-\d{2}-\d{2} \| web-next \|$/m);
    assert.match(withArea, /^\| tester \| core \| 🔄 open \| \d{4}-\d{2}-\d{2} \|  \|$/m);

    await writeFile(join(dir, 'docs/task_summary.md'), withArea);
    const ledger = await readLedger(dir);
    assert.equal(ledger.summaryRows.get('tester/web-next-login').created, (await readMeta(dir, 'web-next-login')).created);
  } finally { await rm(dir, { recursive: true, force: true }); }
});

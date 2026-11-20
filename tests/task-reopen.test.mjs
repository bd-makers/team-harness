// done-derive R5·R6 (S2): 재개는 "기본 브랜치에서 종결 + 작업 트리에서도 아직 종결"일 때만 일어난다.
// `task <name>` 과 `reopen <name>` 이 같은 전이를 공유하고, reopen 은 종결된 task 에만 동작한다.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { mkdtemp, mkdir, readFile, writeFile, rm } from 'node:fs/promises';
import { join } from 'node:path';
import { tmpdir } from 'node:os';
import { execFile } from 'node:child_process';
import { promisify } from 'node:util';
import { runTask, runReopen, addReopenStep, REOPEN_DEFAULT_REASON } from '../src/commands/task.mjs';
import { readTaskMeta } from '../src/commands/summary.mjs';
import { taskClosure } from '../src/task-closure.mjs';
import { exists } from '../src/fsx.mjs';
import { resolveInvocation } from '../src/cli-args.mjs';

const pexec = promisify(execFile);
const GIT_ID = ['-c', 'user.name=t', '-c', 'user.email=t@t', '-c', 'commit.gpgsign=false'];
const git = (dir, args) => pexec('git', ['-C', dir, ...GIT_ID, ...args]).then(r => r.stdout);

const noRemote = { doneOnMain: async () => null };
const PLAN_OPEN = '# demo — Plan\n\n## 단계\n- [x] 1. 구현\n- [ ] 2. ship 완료\n\n## 참고\n- 메모\n';
const PLAN_DONE = PLAN_OPEN.replace('- [ ] 2.', '- [x] 2.');

// process.exitCode 는 전역이다 — 실패 경로가 남기면 러너 전체가 실패로 끝난다.
async function run(fn, dir, name, flags = {}, deps = noRemote) {
  const logs = [];
  const orig = console.log;
  const before = process.exitCode;
  console.log = (...a) => logs.push(a.join(' '));
  try {
    await fn({ targetDir: dir, flags: { member: 'chad', ...flags }, taskArgs: [name] }, deps);
    return { logs, exitCode: process.exitCode ?? 0 };
  } finally {
    console.log = orig;
    process.exitCode = before;
  }
}

async function fixture({ plan = PLAN_DONE } = {}) {
  const dir = await mkdtemp(join(tmpdir(), 'harness-reopen-'));
  await run(runTask, dir, 'demo');
  const td = join(dir, 'docs', 'chad', 'demo');
  await writeFile(join(td, 'demo-plan.md'), plan);
  return { dir, td, planPath: join(td, 'demo-plan.md') };
}

// ---- addReopenStep ----

test('addReopenStep: `## 단계` 끝(다음 제목·꼬리 빈 줄 앞)에 미완 항목을 넣는다', () => {
  const out = addReopenStep(PLAN_DONE, '회귀 발견');
  assert.equal(out, PLAN_DONE.replace('- [x] 2. ship 완료\n', '- [x] 2. ship 완료\n- [ ] 재개: 회귀 발견\n'));
});

test('addReopenStep: 사유 없음은 기본 문구, 줄바꿈은 한 줄로 접는다', () => {
  assert.match(addReopenStep(PLAN_DONE, undefined), new RegExp(`- \\[ \\] 재개: ${REOPEN_DEFAULT_REASON.replace(/[()]/g, '\\$&')}\\n`));
  assert.match(addReopenStep(PLAN_DONE, ' a\nb\t '), /- \[ \] 재개: a b\n/);
});

test('addReopenStep: `## 단계` 제목이 없으면 파일 끝에 절을 만든다', () => {
  assert.equal(addReopenStep('# p\n- [x] 끝\n\n', 'x'), '# p\n- [x] 끝\n\n## 단계\n- [ ] 재개: x\n');
});

// ---- reopen <name> (git 아님 → 작업 트리가 R 을 대신한다) ----

test('reopen (S2): 종결된 task → reopened, reopenedAt 기록, plan 재개 항목으로 판정이 open', async () => {
  const { dir, planPath } = await fixture();
  try {
    assert.equal((await taskClosure(dir, 'chad', 'demo')).closed, true);
    const r = await run(runReopen, dir, 'demo', { reason: '회귀 발견' });
    assert.equal(r.exitCode, 0, r.logs.join('\n'));
    assert.ok(r.logs.some(l => l.startsWith('reopened: chad/demo')), r.logs.join('\n'));
    const meta = await readTaskMeta(dir, 'chad', 'demo');
    assert.ok(meta.reopenedAt);
    assert.equal(meta.status, 'open');
    assert.match(await readFile(planPath, 'utf8'), /- \[x\] 2\. ship 완료\n- \[ \] 재개: 회귀 발견\n/);
    assert.equal((await taskClosure(dir, 'chad', 'demo')).closed, false);
    const active = JSON.parse(await readFile(join(dir, '.harness', 'active.json'), 'utf8'));
    assert.equal(active.task, 'demo');
  } finally { await rm(dir, { recursive: true, force: true }); }
});

test('reopen: 열린 task → exit 1, meta·plan·활성 포인터 무변경', async () => {
  const { dir, td, planPath } = await fixture({ plan: PLAN_OPEN });
  try {
    const metaPath = join(td, 'demo-meta.json');
    const activePath = join(dir, '.harness', 'active.json');
    const before = await Promise.all([metaPath, planPath, activePath].map(p => readFile(p, 'utf8')));
    const r = await run(runReopen, dir, 'demo');
    assert.equal(r.exitCode, 1);
    assert.equal(r.logs[0], '✗ task: 종결되지 않은 task 는 다시 열 수 없음');
    assert.deepEqual(await Promise.all([metaPath, planPath, activePath].map(p => readFile(p, 'utf8'))), before);
  } finally { await rm(dir, { recursive: true, force: true }); }
});

test('reopen: 없는 task → exit 1, 디렉터리를 만들지 않는다', async () => {
  const dir = await mkdtemp(join(tmpdir(), 'harness-reopen-'));
  try {
    const r = await run(runReopen, dir, 'ghost');
    assert.equal(r.exitCode, 1);
    assert.equal(r.logs[0], '✗ task: 재개할 task 가 없음');
    assert.equal(await exists(join(dir, 'docs', 'chad', 'ghost')), false);
    assert.equal(await exists(join(dir, '.harness', 'active.json')), false);
  } finally { await rm(dir, { recursive: true, force: true }); }
});

test('task <name> 두 번: 첫 번째만 재개하고 두 번째는 activate — 재개 항목이 쌓이지 않는다', async () => {
  const { dir, planPath } = await fixture();
  try {
    assert.ok((await run(runTask, dir, 'demo')).logs.some(l => l.startsWith('reopened:')));
    const after1 = await readFile(planPath, 'utf8');
    const meta1 = await readTaskMeta(dir, 'chad', 'demo');
    assert.ok((await run(runTask, dir, 'demo')).logs.some(l => l.startsWith('activated:')));
    assert.equal(await readFile(planPath, 'utf8'), after1);
    assert.deepEqual(await readTaskMeta(dir, 'chad', 'demo'), meta1);
    assert.equal((after1.match(/재개:/g) || []).length, 1);
  } finally { await rm(dir, { recursive: true, force: true }); }
});

// ---- 기본 브랜치(R) 판정: refs/remotes/origin/main 을 직접 옮겨 머지 전·후를 만든다 ----

test('R5·R6: R 에서 미종결(머지 전)이면 activate, R 에 머지되면 재개, 재개 뒤 재실행은 activate', async () => {
  const { dir, planPath } = await fixture({ plan: PLAN_OPEN });
  try {
    await git(dir, ['init', '-q', '-b', 'main']);
    await git(dir, ['add', '-A']);
    await git(dir, ['commit', '-q', '-m', 'open']);
    await git(dir, ['update-ref', 'refs/remotes/origin/main', 'HEAD']);
    await writeFile(planPath, PLAN_DONE);
    await git(dir, ['commit', '-q', '-am', 'ship']);

    // 브랜치에서 ship(전부 체크)했지만 R 은 아직 열린 plan — 리뷰 수정 라운드다.
    const r1 = await run(runTask, dir, 'demo');
    assert.ok(r1.logs.some(l => l.startsWith('activated:')), r1.logs.join('\n'));
    assert.equal(await readFile(planPath, 'utf8'), PLAN_DONE);
    assert.equal((await run(runReopen, dir, 'demo')).exitCode, 1, 'R 에서 미종결이면 reopen 도 거부');

    // 머지 = R 이 ship 커밋을 가리킨다.
    await git(dir, ['update-ref', 'refs/remotes/origin/main', 'HEAD']);
    const r2 = await run(runTask, dir, 'demo');
    assert.ok(r2.logs.some(l => l.startsWith('reopened:')), r2.logs.join('\n'));
    assert.match(await readFile(planPath, 'utf8'), /- \[ \] 재개: /);

    // R 은 재개 MR 이 머지될 때까지 closed 다 — 작업 트리가 열렸으므로 다시 재개하지 않는다.
    const r3 = await run(runTask, dir, 'demo');
    assert.ok(r3.logs.some(l => l.startsWith('activated:')), r3.logs.join('\n'));
    assert.equal(((await readFile(planPath, 'utf8')).match(/재개:/g) || []).length, 1);
  } finally { await rm(dir, { recursive: true, force: true }); }
});

test('done-derive 4단계: 실제 원격 판정 — main 을 가져온 클론의 `task <name>` 은 nudge 없이 재개한다', async () => {
  const { dir, planPath } = await fixture();
  try {
    await git(dir, ['init', '-q', '-b', 'main']);
    await git(dir, ['add', '-A']);
    await git(dir, ['commit', '-q', '-m', 'ship']);
    await git(dir, ['update-ref', 'refs/remotes/origin/main', 'HEAD']); // 머지된 main 을 가져온 상태
    const r = await run(runTask, dir, 'demo', {}, {}); // done-on-main 판정·재개 판정 모두 기본(실 git)
    assert.equal(r.exitCode, 0, r.logs.join('\n'));
    assert.ok(r.logs.some(l => l.startsWith('reopened: chad/demo')), r.logs.join('\n'));
    assert.ok(!r.logs.some(l => l.includes('이미 종결')), `재개 직전에 nudge 가 찍히면 안 된다:\n${r.logs.join('\n')}`);
    assert.match(await readFile(planPath, 'utf8'), /- \[ \] 재개: /);
  } finally { await rm(dir, { recursive: true, force: true }); }
});

// codex 리뷰 P1(2026-11-19): 재개 → 재개 항목 체크(re-ship) → 머지 전 `task <name>` 은 리뷰 수정 라운드다. R 은 아직 첫 종결 커밋이고
// 작업 트리도 종결이지만 그 종결은 마지막 재개보다 앞선다 — activate 만 한다. 재개 MR 이 머지되면(R 의 종결이 재개보다 나중) 다시 재개할 수 있다.
test('재개 뒤 re-ship 한 리뷰 수정 라운드는 다시 재개하지 않고, 재개 MR 머지 뒤에는 재개한다', async () => {
  const { dir, planPath } = await fixture();
  try {
    await git(dir, ['init', '-q', '-b', 'main']);
    await git(dir, ['add', '-A']);
    await pexec('git', ['-C', dir, ...GIT_ID, 'commit', '-q', '-m', 'ship'], { env: { ...process.env, GIT_COMMITTER_DATE: '2026-01-01T00:00:00Z' } });
    await git(dir, ['update-ref', 'refs/remotes/origin/main', 'HEAD']);
    assert.ok((await run(runTask, dir, 'demo', {}, { doneOnMain: async () => null })).logs.some(l => l.startsWith('reopened:')));

    await git(dir, ['switch', '-q', '-c', 'fix']);
    await writeFile(planPath, (await readFile(planPath, 'utf8')).replace('- [ ] 재개:', '- [x] 재개:'));
    await git(dir, ['add', '-A']);
    // 커밋 시각은 초 단위라 재개(ms) 직후 같은 초에 찍히면 비교가 흔들린다 — 실제로는 재개와 re-ship 사이에 작업이 있다.
    const later = { env: { ...process.env, GIT_COMMITTER_DATE: new Date(Date.now() + 5000).toISOString() } };
    await pexec('git', ['-C', dir, ...GIT_ID, 'commit', '-q', '-m', 're-ship'], later);
    const round = await run(runTask, dir, 'demo');
    assert.ok(round.logs.some(l => l.startsWith('activated:')), round.logs.join('\n'));
    assert.equal((await run(runReopen, dir, 'demo')).exitCode, 1, 'reopen 도 거부한다 — R 의 종결은 이미 다시 연 옛 종결이다');
    assert.equal(((await readFile(planPath, 'utf8')).match(/재개:/g) || []).length, 1);

    await git(dir, ['update-ref', 'refs/remotes/origin/main', 'HEAD']); // 재개 MR 머지
    const again = await run(runTask, dir, 'demo');
    assert.ok(again.logs.some(l => l.startsWith('reopened:')), again.logs.join('\n'));
  } finally { await rm(dir, { recursive: true, force: true }); }
});

// codex 리뷰 P2(2026-11-19, spec R2): origin 이 없으면 R 은 로컬 기본 브랜치다 — 기능 브랜치에서 ship 만 한 task 는 재개 대상이 아니다.
test('origin 없음: R 은 로컬 main — 기능 브랜치에서만 종결된 task 는 reopen 거부, main 에 들어가면 재개', async () => {
  const { dir } = await fixture({ plan: PLAN_OPEN });
  try {
    await git(dir, ['init', '-q', '-b', 'main']);
    await git(dir, ['add', '-A']);
    await git(dir, ['commit', '-q', '-m', 'open']);
    await git(dir, ['switch', '-q', '-c', 'feat']);
    await writeFile(join(dir, 'docs', 'chad', 'demo', 'demo-plan.md'), PLAN_DONE);
    await git(dir, ['commit', '-q', '-am', 'ship']);
    assert.equal((await run(runReopen, dir, 'demo')).exitCode, 1);
    assert.ok((await run(runTask, dir, 'demo')).logs.some(l => l.startsWith('activated:')));
    await git(dir, ['update-ref', 'refs/heads/main', 'HEAD']);
    assert.ok((await run(runReopen, dir, 'demo')).logs.some(l => l.startsWith('reopened:')));
  } finally { await rm(dir, { recursive: true, force: true }); }
});

test('레거시: meta 없는 task 는 작업 트리·R 모두 원장 `✅ done` 행으로 종결을 읽어 재개한다', async () => {
  const dir = await mkdtemp(join(tmpdir(), 'harness-reopen-legacy-'));
  try {
    const td = join(dir, 'docs', 'chad', 'old');
    await mkdir(td, { recursive: true });
    await writeFile(join(td, 'old-spec.md'), '# old — Spec\n');
    await writeFile(join(td, 'old-plan.md'), PLAN_OPEN);
    await writeFile(join(dir, 'docs', 'task_summary.md'),
      '| User | Task | Status | Created |\n|------|------|--------|---------|\n| chad | old | ✅ done | 2026-01-01 |\n');
    await git(dir, ['init', '-q', '-b', 'main']);
    await git(dir, ['add', '-A']);
    await git(dir, ['commit', '-q', '-m', 'legacy']);
    await git(dir, ['update-ref', 'refs/remotes/origin/main', 'HEAD']);
    const r = await run(runTask, dir, 'old');
    assert.ok(r.logs.some(l => l.startsWith('reopened: chad/old')), r.logs.join('\n'));
    const meta = await readTaskMeta(dir, 'chad', 'old');
    assert.equal(meta.status, 'open');
    assert.ok(meta.reopenedAt);
  } finally { await rm(dir, { recursive: true, force: true }); }
});

test('CLI: reopen 은 이름 인자와 --reason 값을 받는다', () => {
  const inv = resolveInvocation(['reopen', 'demo', '--reason', '회귀']);
  assert.equal(inv.kind, 'run');
  assert.equal(inv.cmd, 'reopen');
  assert.deepEqual(inv.positional, ['demo']);
  assert.equal(inv.flags.reason, '회귀');
});

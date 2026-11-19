import { test } from 'node:test';
import assert from 'node:assert/strict';
import { mkdtemp, mkdir, writeFile, rm } from 'node:fs/promises';
import { join } from 'node:path';
import { tmpdir } from 'node:os';
import { execFile } from 'node:child_process';
import { promisify } from 'node:util';
import { closureFromContent, taskClosure } from '../src/task-closure.mjs';

const pexec = promisify(execFile);
const GIT_ID = ['-c', 'user.name=t', '-c', 'user.email=t@t', '-c', 'commit.gpgsign=false'];
async function git(dir, args) {
  const { stdout } = await pexec('git', ['-C', dir, ...GIT_ID, ...args]);
  return stdout;
}

const plan = steps => `# t — Plan\n\n## 단계\n${steps}\n\n## 참고\n- \`- [ ]\` 산문 언급은 단계가 아니다\n`;
const DONE_PLAN = plan('- [x] 1. 구현\n- [x] 2. ship 완료');

// ---- closureFromContent: R1 판정 표 ----

test('closure: plan 전부 [x] + [x] ≥ 1 → closed(plan)', () => {
  assert.deepEqual(closureFromContent({ plan: DONE_PLAN, meta: { status: 'open' } }), { closed: true, source: 'plan' });
});

test('closure: 미완 단계 → open', () => {
  assert.deepEqual(closureFromContent({ plan: plan('- [x] 1. 구현\n- [ ] 2. ship 완료'), meta: null }), { closed: false, source: null });
});

test('closure (S4b): plan 없음·빈 plan·체크박스 없음·빈 `- [ ]`만 → 모두 open', () => {
  for (const p of [null, '', '   \n', plan('- 1. 산문 단계'), plan('- [ ]')]) {
    assert.equal(closureFromContent({ plan: p, meta: null }).closed, false, JSON.stringify(p));
  }
});

test('closure: 대문자 [X]·들여쓴 체크박스도 체크로 센다', () => {
  assert.equal(closureFromContent({ plan: plan('- [X] 1. 구현\n  - [x] 1-a. 세부'), meta: null }).closed, true);
});

test('closure: 다이어그램 미실행 규약(- [x] … — 미실행)은 체크 상태라 종결을 막지 않는다', () => {
  const p = plan('- [x] spec/plan 다이어그램 — 미실행(도구 없음)\n- [x] 1. 구현');
  assert.equal(closureFromContent({ plan: p, meta: null }).closed, true);
});

test('closure (S4): 레거시 meta status done → closed(legacy-meta) — plan에 미완이 남아 있어도', () => {
  const meta = { status: 'done', closedAt: '2026-09-08T10:00:00.000Z' };
  assert.deepEqual(closureFromContent({ plan: plan('- [ ] 미실행 단계'), meta }), { closed: true, source: 'legacy-meta' });
});

test('closure: 레거시 done이지만 그 뒤에 재개됨(reopenedAt > closedAt) → 레거시로 닫지 않는다', () => {
  const meta = { status: 'done', closedAt: '2026-09-08T10:00:00.000Z', reopenedAt: '2026-09-09T00:00:00.000Z' };
  assert.equal(closureFromContent({ plan: plan('- [ ] 재개: x'), meta }).closed, false);
});

test('closure: 재개 뒤 옛 CLI가 다시 done(closedAt > reopenedAt) → closed(legacy-meta)', () => {
  const meta = { status: 'done', closedAt: '2026-09-10T00:00:00.000Z', reopenedAt: '2026-09-09T00:00:00.000Z' };
  assert.equal(closureFromContent({ plan: plan('- [ ] 남은 단계'), meta }).source, 'legacy-meta');
});

test('closure: 유효한 우회 기록(forcedAt, 재개 이력 없음) → closed(forced)', () => {
  const meta = { status: 'open', forcedAt: '2026-11-01T00:00:00.000Z', forcedIssues: ['x'] };
  assert.deepEqual(closureFromContent({ plan: plan('- [ ] 남은 단계'), meta }), { closed: true, source: 'forced' });
});

test('closure: forcedAt < reopenedAt(우회 뒤 재개) → 우회로 닫지 않는다', () => {
  const meta = { status: 'open', forcedAt: '2026-11-01T00:00:00.000Z', reopenedAt: '2026-11-02T00:00:00.000Z' };
  assert.equal(closureFromContent({ plan: plan('- [ ] 재개: x'), meta }).closed, false);
});

test('closure: plan이 이미 닫혔으면 source는 plan이 우선한다', () => {
  const meta = { status: 'done', closedAt: '2026-09-08T10:00:00.000Z' };
  assert.equal(closureFromContent({ plan: DONE_PLAN, meta }).source, 'plan');
});

// ---- taskClosure: 작업 트리 / ref 입력, closedAt ----

async function fixture() {
  const dir = await mkdtemp(join(tmpdir(), 'task-closure-'));
  await git(dir, ['init', '-q', '-b', 'main']);
  const tdir = join(dir, 'docs', 'u', 't');
  await mkdir(tdir, { recursive: true });
  await writeFile(join(tdir, 't-spec.md'), '# t — Spec\n');
  await writeFile(join(tdir, 't-plan.md'), plan('- [x] 1. 구현\n- [ ] 2. ship 완료'));
  await git(dir, ['add', '-A']);
  await git(dir, ['commit', '-q', '-m', 'open']);
  return { dir, tdir };
}

test('taskClosure: 작업 트리 — 체크를 켜면 closed, closedAt은 마지막 커밋 시각', async () => {
  const { dir, tdir } = await fixture();
  try {
    assert.equal((await taskClosure(dir, 'u', 't')).closed, false);
    await writeFile(join(tdir, 't-plan.md'), DONE_PLAN);
    await git(dir, ['commit', '-q', '-am', 'ship']);
    const r = await taskClosure(dir, 'u', 't');
    assert.equal(r.closed, true);
    assert.equal(r.source, 'plan');
    const at = new Date((await git(dir, ['log', '-1', '--format=%cI'])).trim()).toISOString();
    assert.equal(r.closedAt, at);
  } finally { await rm(dir, { recursive: true, force: true }); }
});

test('taskClosure: ref 입력 — 그 커밋의 plan으로 판정하고 작업 트리는 보지 않는다', async () => {
  const { dir, tdir } = await fixture();
  try {
    await git(dir, ['branch', 'base']);
    await writeFile(join(tdir, 't-plan.md'), DONE_PLAN);
    await git(dir, ['commit', '-q', '-am', 'ship']);
    assert.equal((await taskClosure(dir, 'u', 't', { ref: 'refs/heads/base' })).closed, false);
    assert.equal((await taskClosure(dir, 'u', 't', { ref: 'refs/heads/main' })).closed, true);
  } finally { await rm(dir, { recursive: true, force: true }); }
});

test('taskClosure: ref에 task가 없으면 open', async () => {
  const { dir } = await fixture();
  try {
    assert.deepEqual(await taskClosure(dir, 'u', 'nope', { ref: 'refs/heads/main' }), { closed: false, source: null, closedAt: null });
  } finally { await rm(dir, { recursive: true, force: true }); }
});

test('taskClosure: 레거시 meta closedAt이 있으면 그 값을 쓴다', async () => {
  const { dir, tdir } = await fixture();
  try {
    await writeFile(join(tdir, 't-meta.json'), JSON.stringify({ status: 'done', closedAt: '2026-09-08T10:00:00.000Z' }));
    assert.deepEqual(await taskClosure(dir, 'u', 't'), { closed: true, source: 'legacy-meta', closedAt: '2026-09-08T10:00:00.000Z' });
  } finally { await rm(dir, { recursive: true, force: true }); }
});

test('taskClosure: git이 아닌 디렉터리 — 작업 트리로 판정, closedAt null', async () => {
  const dir = await mkdtemp(join(tmpdir(), 'task-closure-nogit-'));
  try {
    const tdir = join(dir, 'docs', 'u', 't');
    await mkdir(tdir, { recursive: true });
    await writeFile(join(tdir, 't-plan.md'), DONE_PLAN);
    assert.deepEqual(await taskClosure(dir, 'u', 't'), { closed: true, source: 'plan', closedAt: null });
  } finally { await rm(dir, { recursive: true, force: true }); }
});

// codex 리뷰 P1(2026-11-19): `<ref>:<rel>` 은 저장소 루트 기준이다 — 하네스를 하위 디렉터리에 설치하면 ref 판정이 task 를 놓쳤다.
test('taskClosure: 하네스를 저장소 하위 디렉터리에 설치해도 ref 판정이 작업 트리 판정과 같다', async () => {
  const root = await mkdtemp(join(tmpdir(), 'harness-closure-sub-'));
  try {
    const sub = join(root, 'sub');
    const tdir = join(sub, 'docs', 'u', 't');
    await mkdir(tdir, { recursive: true });
    await git(root, ['init', '-q', '-b', 'main']);
    await writeFile(join(tdir, 't-plan.md'), DONE_PLAN);
    await git(root, ['add', '-A']);
    await git(root, ['commit', '-q', '-m', 'ship']);
    const atRef = await taskClosure(sub, 'u', 't', { ref: 'refs/heads/main' });
    assert.equal(atRef.closed, true);
    assert.equal(atRef.source, 'plan');
    assert.equal((await taskClosure(sub, 'u', 't')).closed, true);
  } finally { await rm(root, { recursive: true, force: true }); }
});

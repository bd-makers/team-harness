import { test } from 'node:test';
import assert from 'node:assert/strict';
import { mkdtemp, mkdir, writeFile, rm } from 'node:fs/promises';
import { join } from 'node:path';
import { tmpdir } from 'node:os';
import { execFile } from 'node:child_process';
import { promisify } from 'node:util';
import {
  resolveDefaultRef, readRemoteTaskMeta, doneOnMainVerdict, renderDoneOnMainNudge, checkDoneOnMain,
} from '../src/commands/remote-task.mjs';

const pexec = promisify(execFile);
const GIT_ID = ['-c', 'user.name=t', '-c', 'user.email=t@t', '-c', 'commit.gpgsign=false'];
async function git(dir, args) {
  const { stdout } = await pexec('git', ['-C', dir, ...GIT_ID, ...args]);
  return stdout;
}

const DONE = { status: 'done', closedAt: '2026-09-08T10:00:00.000Z' };
const remote = (meta, ref = 'origin/main') => ({ ref, meta });

// ---- doneOnMainVerdict: 판정 표 ----

test('verdict: 원격 meta 없음 → null', () => {
  assert.equal(doneOnMainVerdict({ localMeta: { status: 'open' }, remote: null }), null);
});

test('verdict: 원격 open → null', () => {
  assert.equal(doneOnMainVerdict({ localMeta: { status: 'open' }, remote: remote({ status: 'open' }) }), null);
});

test('verdict: 원격 done + 로컬 open(reopenedAt 없음) → { ref, closedAt }', () => {
  assert.deepEqual(
    doneOnMainVerdict({ localMeta: { status: 'open' }, remote: remote(DONE) }),
    { ref: 'origin/main', closedAt: DONE.closedAt },
  );
});

test('verdict: 원격 done + 로컬 meta 없음(생성 직전) → nudge', () => {
  assert.deepEqual(doneOnMainVerdict({ localMeta: null, remote: remote(DONE) }), { ref: 'origin/main', closedAt: DONE.closedAt });
});

test('verdict: 원격 done + 로컬 done → null (재개 후보 판정이 처리)', () => {
  assert.equal(doneOnMainVerdict({ localMeta: { status: 'done' }, remote: remote(DONE) }), null);
});

test('verdict: 고의 재개 — 로컬 reopenedAt 이 원격 closedAt 보다 나중 → null', () => {
  const localMeta = { status: 'open', reopenedAt: '2026-09-09T00:00:00.000Z' };
  assert.equal(doneOnMainVerdict({ localMeta, remote: remote(DONE) }), null);
});

test('verdict: 로컬 reopenedAt 이 원격 closedAt 보다 먼저 → nudge (그 뒤에 main 이 다시 닫음)', () => {
  const localMeta = { status: 'open', reopenedAt: '2026-09-07T00:00:00.000Z' };
  assert.deepEqual(doneOnMainVerdict({ localMeta, remote: remote(DONE) }), { ref: 'origin/main', closedAt: DONE.closedAt });
});

test('verdict: 원격 done 인데 closedAt 없음(구 meta) → closedAt null 로 nudge', () => {
  assert.deepEqual(doneOnMainVerdict({ localMeta: null, remote: remote({ status: 'done' }) }), { ref: 'origin/main', closedAt: null });
});

test('render: user/task·ref·closedAt·복구 경로가 한 줄에 들어간다', () => {
  const line = renderDoneOnMainNudge({ user: 'chad', task: 'demo', ref: 'origin/main', closedAt: DONE.closedAt });
  assert.match(line, /^\[harness\] ⚠ task chad\/demo/);
  assert.match(line, /origin\/main/);
  assert.match(line, /2026-09-08T10:00:00\.000Z/);
  assert.match(line, /harness-team task demo/);
  assert.equal(line.split('\n').length, 1);
});

// ---- 실 git 통합: fetch 없이 로컬 refs/remotes/origin 만 본다 ----

async function repoWithOrigin() {
  const root = await mkdtemp(join(tmpdir(), 'harness-remote-task-'));
  const work = join(root, 'work');
  const bare = join(root, 'origin.git');
  await mkdir(work, { recursive: true });
  await pexec('git', ['init', '-q', '--bare', bare]);
  await git(work, ['init', '-q']);
  await git(work, ['symbolic-ref', 'HEAD', 'refs/heads/main']);
  const td = join(work, 'docs', 'chad', 'demo');
  await mkdir(td, { recursive: true });
  await writeFile(join(td, 'demo-meta.json'), JSON.stringify({ user: 'chad', task: 'demo', ...DONE }, null, 2) + '\n');
  await git(work, ['add', '-A']);
  await git(work, ['commit', '-q', '-m', 'done on main']);
  await git(work, ['remote', 'add', 'origin', bare]);
  await git(work, ['push', '-q', 'origin', 'main']);
  await git(work, ['remote', 'set-head', 'origin', 'main']);
  return { root, work };
}

test('git: origin/HEAD 가 있으면 그 브랜치, 지우면 origin/main 폴백, 원격 자체가 없으면 null', async () => {
  const { root, work } = await repoWithOrigin();
  try {
    assert.equal(await resolveDefaultRef(work), 'origin/main');
    await git(work, ['remote', 'set-head', 'origin', '-d']);
    assert.equal(await resolveDefaultRef(work), 'origin/main');
    await git(work, ['remote', 'remove', 'origin']);
    assert.equal(await resolveDefaultRef(work), null);
  } finally { await rm(root, { recursive: true, force: true }); }
});

test('git: 원격 커밋의 meta 를 fetch 없이 읽고, 없는 task 경로는 null', async () => {
  const { root, work } = await repoWithOrigin();
  try {
    const got = await readRemoteTaskMeta(work, 'chad', 'demo');
    assert.equal(got.ref, 'origin/main');
    assert.equal(got.meta.status, 'done');
    assert.equal(got.meta.closedAt, DONE.closedAt);
    assert.equal(await readRemoteTaskMeta(work, 'chad', 'nope'), null);
  } finally { await rm(root, { recursive: true, force: true }); }
});

test('git: 로컬 브랜치 `origin/main` 이 있어도 원격 meta 는 refs/remotes/origin/main 에서 읽는다', async () => {
  const { root, work } = await repoWithOrigin();
  try {
    // meta 가 없는 빈 트리 커밋을 가리키는 로컬 `refs/heads/origin/main`. 짧은 이름으로 풀면 그쪽을 읽어 null 이 된다.
    const empty = (await git(work, ['commit-tree', '4b825dc642cb6eb9a060e54bf8d69288fbee4904', '-m', 'empty'])).trim();
    await git(work, ['branch', 'origin/main', empty]);
    const got = await readRemoteTaskMeta(work, 'chad', 'demo');
    assert.equal(got?.meta.status, 'done');
    assert.equal(got.ref, 'origin/main');
  } finally { await rm(root, { recursive: true, force: true }); }
});

test('git: 로컬 작업 트리에서 task 를 다시 열어도(로컬 open) 원격은 done → checkDoneOnMain 이 nudge', async () => {
  const { root, work } = await repoWithOrigin();
  try {
    // 클론이 같은 task 를 로컬에서 open 으로 가진 상황 — 커밋하지 않은 작업 트리 상태
    await writeFile(join(work, 'docs/chad/demo/demo-meta.json'), JSON.stringify({ user: 'chad', task: 'demo', status: 'open', closedAt: null }) + '\n');
    assert.deepEqual(await checkDoneOnMain(work, 'chad', 'demo'), { ref: 'origin/main', closedAt: DONE.closedAt });
  } finally { await rm(root, { recursive: true, force: true }); }
});

test('git 저장소가 아니면 조용히 null (예외 없음)', async () => {
  const dir = await mkdtemp(join(tmpdir(), 'harness-remote-task-nogit-'));
  try {
    assert.equal(await resolveDefaultRef(dir), null);
    assert.equal(await readRemoteTaskMeta(dir, 'chad', 'demo'), null);
    assert.equal(await checkDoneOnMain(dir, 'chad', 'demo'), null);
  } finally { await rm(dir, { recursive: true, force: true }); }
});

test('git: partial clone(blob:none)에서는 lazy fetch 대신 null — "fetch 없음" 계약 (GIT_NO_LAZY_FETCH)', async () => {
  const { root, work } = await repoWithOrigin();
  try {
    const bare = join(root, 'origin.git');
    // file:// 서버는 기본으로 filter 를 무시한다("filtering not recognized by server") — 켜야 진짜 partial clone 이 된다
    await pexec('git', ['-C', bare, 'config', 'uploadpack.allowFilter', 'true']);
    const partial = join(root, 'partial');
    await pexec('git', ['clone', '-q', '--filter=blob:none', '--no-checkout', `file://${bare}`, partial]);
    // 대조군: 같은 명령을 lazy fetch 허용으로 돌리면 blob을 가져와 읽힌다 — 즉 아래 null 은 "경로 없음"이 아니라 계약의 결과다
    const { stdout } = await pexec('git', ['-C', partial, 'show', 'origin/main:docs/chad/demo/demo-meta.json'],
      { env: { ...process.env, GIT_NO_LAZY_FETCH: '0' } });
    assert.equal(JSON.parse(stdout).status, 'done');
    const partial2 = join(root, 'partial2');
    await pexec('git', ['clone', '-q', '--filter=blob:none', '--no-checkout', `file://${bare}`, partial2]);
    assert.equal(await readRemoteTaskMeta(partial2, 'chad', 'demo'), null);
  } finally { await rm(root, { recursive: true, force: true }); }
});

// ---- 원장 폴백 (task-folder-removal, C2a): main 에서 task 폴더가 지워진 뒤에도 종결을 안다 ----

const DELETED_AT = '2026-09-10T00:00:00.000Z';

// origin/main: chad/x 를 종결하고(원장 ✅ done) 폴더를 지운 상태. 지운 커밋의 committer 시각이 DELETED_AT 이다.
async function repoWithDeletedTask() {
  const root = await mkdtemp(join(tmpdir(), 'harness-remote-ledger-'));
  const work = join(root, 'work');
  const bare = join(root, 'origin.git');
  await mkdir(join(work, 'docs', 'chad', 'x'), { recursive: true });
  await pexec('git', ['init', '-q', '--bare', bare]);
  await git(work, ['init', '-q']);
  await git(work, ['symbolic-ref', 'HEAD', 'refs/heads/main']);
  await writeFile(join(work, 'docs', 'chad', 'x', 'x-spec.md'), '# x — Spec\n');
  await writeFile(join(work, 'docs', 'task_summary.md'),
    '# Task Summary\n\n| User | Task | Status | Created |\n|------|------|--------|---------|\n| chad | x | ✅ done | 2026-09-01 |\n');
  await git(work, ['add', '-A']);
  await git(work, ['commit', '-q', '-m', 'close x']);
  await git(work, ['rm', '-rq', 'docs/chad/x']);
  await pexec('git', ['-C', work, ...GIT_ID, 'commit', '-q', '-m', 'remove x folder'],
    { env: { ...process.env, GIT_COMMITTER_DATE: '2026-09-10T09:00:00+09:00' } });
  await git(work, ['remote', 'add', 'origin', bare]);
  await git(work, ['push', '-q', 'origin', 'main']);
  return { root, work };
}

test('remote-task: falls back to the default-ref ledger when the task folder is gone', async () => {
  const { root, work } = await repoWithDeletedTask();
  try {
    const got = await readRemoteTaskMeta(work, 'chad', 'x');
    assert.deepEqual(got, { ref: 'origin/main', meta: { status: 'done', closedAt: DELETED_AT }, source: 'ledger' });
    const verdict = await checkDoneOnMain(work, 'chad', 'x');
    assert.deepEqual(verdict, { ref: 'origin/main', closedAt: DELETED_AT, source: 'ledger' });
    assert.equal(await readRemoteTaskMeta(work, 'chad', 'nope'), null, '원장에 행이 없으면 모른다');

    const line = renderDoneOnMainNudge({ user: 'chad', task: 'x', ...verdict });
    assert.match(line, /^\[harness\] ⚠ task chad\/x/);
    assert.match(line, /새 이름/, '폴더가 지워진 task 는 새 이름으로 이어가라고 안내한다');
    assert.match(line, /git log origin\/main -- docs\/chad\/x/);
    assert.doesNotMatch(line, /harness-team task x /, '다시 열기 안내는 막힌 길이다(이름 재사용 가드)');
    assert.equal(line.split('\n').length, 1);

    // meta 출처(source 없음)의 문구는 종전 그대로 — 다시 열기 안내를 유지한다.
    const metaLine = renderDoneOnMainNudge({ user: 'chad', task: 'x', ref: 'origin/main', closedAt: DELETED_AT });
    assert.match(metaLine, /harness-team task x 로 다시 연다\(reopened\)\.$/);
    assert.doesNotMatch(metaLine, /새 이름|폴더가 지워짐/);
  } finally { await rm(root, { recursive: true, force: true }); }
});

test('remote-task: a deliberate reopen silences the ledger-sourced nudge', async () => {
  const { root, work } = await repoWithDeletedTask();
  try {
    const td = join(work, 'docs', 'chad', 'x');
    await mkdir(td, { recursive: true });
    const localMeta = reopenedAt => writeFile(join(td, 'x-meta.json'),
      JSON.stringify({ user: 'chad', task: 'x', status: 'open', closedAt: null, reopenedAt }) + '\n');
    await localMeta('2026-09-11T00:00:00.000Z');
    assert.equal(await checkDoneOnMain(work, 'chad', 'x'), null, '삭제 커밋 뒤의 재개는 고의다');
    await localMeta('2026-09-09T00:00:00.000Z');
    assert.deepEqual(await checkDoneOnMain(work, 'chad', 'x'), { ref: 'origin/main', closedAt: DELETED_AT, source: 'ledger' },
      '그보다 먼저 연 것은 main 이 나중에 닫은 것이다');
  } finally { await rm(root, { recursive: true, force: true }); }
});

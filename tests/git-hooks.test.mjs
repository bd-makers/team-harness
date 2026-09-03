// installPostCommitHook joined `.git/hooks` by hand, so in a git worktree (`.git` is a
// file) it returned silently and under `core.hooksPath` (husky, lefthook) it wrote a hook
// git never reads. It also treated any file containing the word "harness" as installed.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { execFile } from 'node:child_process';
import { promisify } from 'node:util';
import { mkdtemp, mkdir, readFile, writeFile, rm, stat, access, realpath } from 'node:fs/promises';
import { constants } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { installPostCommitHook, resolveHooksDir, POST_COMMIT_MARKER, POST_COMMIT_HOOK } from '../src/git-hooks.mjs';

const pexec = promisify(execFile);
const git = (cwd, ...args) => pexec('git', ['-C', cwd, ...args]);

async function repo() {
  const dir = await mkdtemp(join(tmpdir(), 'harness-githooks-'));
  await git(dir, 'init', '-q');
  await git(dir, 'config', 'user.email', 't@e2e.io');
  await git(dir, 'config', 'user.name', 'tester');
  await git(dir, 'config', 'commit.gpgsign', 'false');
  return dir;
}

test('일반 저장소: .git/hooks/post-commit에 설치하고 실행 비트를 준다', async () => {
  const dir = await repo();
  try {
    await installPostCommitHook(dir);
    const hook = join(dir, '.git/hooks/post-commit');
    assert.equal(await readFile(hook, 'utf8'), POST_COMMIT_HOOK);
    await access(hook, constants.X_OK);
  } finally { await rm(dir, { recursive: true, force: true }); }
});

test('worktree(.git이 파일): 메인 저장소의 hooks 디렉터리에 설치한다', async () => {
  const main = await repo();
  const wt = join(main, '..', `${main.split('/').pop()}-wt`);
  try {
    await writeFile(join(main, 'a.txt'), 'a\n');
    await git(main, 'add', 'a.txt');
    await git(main, 'commit', '-q', '-m', 'init');
    await git(main, 'worktree', 'add', '-q', wt, '-b', 'wt-branch');
    assert.ok((await stat(join(wt, '.git'))).isFile(), '.git은 파일(worktree)');

    await installPostCommitHook(wt);
    const hooksDir = await resolveHooksDir(wt);
    // macOS tmpdir is a symlink (/var → /private/var); compare real paths.
    assert.equal(await realpath(hooksDir), await realpath(join(main, '.git/hooks')), 'worktree의 hooks 디렉터리는 메인 저장소 것');
    assert.match(await readFile(join(hooksDir, 'post-commit'), 'utf8'), /harness-team handoff/);
  } finally {
    await git(main, 'worktree', 'remove', '--force', wt).catch(() => {});
    await rm(main, { recursive: true, force: true });
    await rm(wt, { recursive: true, force: true });
  }
});

test('core.hooksPath: git이 실제로 읽는 디렉터리에 설치한다', async () => {
  const dir = await repo();
  try {
    await mkdir(join(dir, '.husky'), { recursive: true });
    await git(dir, 'config', 'core.hooksPath', '.husky');
    await installPostCommitHook(dir);
    assert.match(await readFile(join(dir, '.husky/post-commit'), 'utf8'), /harness-team handoff/);
    const stale = await access(join(dir, '.git/hooks/post-commit')).then(() => true, () => false);
    assert.equal(stale, false, '.git/hooks에는 쓰지 않는다 — git이 읽지 않는 곳');
  } finally { await rm(dir, { recursive: true, force: true }); }
});

test('core.hooksPath가 존재하지 않는 디렉터리면 안내하고 건너뛴다', async () => {
  const dir = await repo();
  const lines = [];
  const orig = console.log; console.log = (l) => lines.push(String(l));
  try {
    await git(dir, 'config', 'core.hooksPath', 'missing-hooks');
    await installPostCommitHook(dir);
    assert.ok(lines.some(l => /hooks dir not found/.test(l)), '조용히 사라지지 않고 한 줄 안내');
  } finally { console.log = orig; await rm(dir, { recursive: true, force: true }); }
});

test('기존 훅이 "harness"라는 단어만 담고 있어도 설치된 것으로 오판하지 않는다', async () => {
  const dir = await repo();
  try {
    const hook = join(dir, '.git/hooks/post-commit');
    await writeFile(hook, '#!/bin/sh\n# our harness for lint\necho lint\n', { mode: 0o644 });
    await installPostCommitHook(dir);
    const body = await readFile(hook, 'utf8');
    assert.match(body, /echo lint/, '기존 내용 보존');
    assert.match(body, new RegExp(POST_COMMIT_MARKER), '마커 줄 append');
    await access(hook, constants.X_OK);
    // idempotent
    await installPostCommitHook(dir);
    assert.equal((await readFile(hook, 'utf8')).split(POST_COMMIT_MARKER).length - 1, 1, '두 번째 실행은 append하지 않는다');
  } finally { await rm(dir, { recursive: true, force: true }); }
});

test('주석에만 harness-team handoff가 있는 훅은 설치된 것이 아니다 — 실행 줄을 append한다', async () => {
  const dir = await repo();
  try {
    const hook = join(dir, '.git/hooks/post-commit');
    await writeFile(hook, '#!/bin/sh\n# harness-team handoff (disabled for now)\necho lint\n', { mode: 0o755 });
    await installPostCommitHook(dir);
    const live = (await readFile(hook, 'utf8')).split('\n').filter(l => !/^\s*#/.test(l) && l.includes(POST_COMMIT_MARKER));
    assert.equal(live.length, 1, '실행 줄이 정확히 하나 추가된다');
  } finally { await rm(dir, { recursive: true, force: true }); }
});

test('git 저장소가 아니면 아무것도 만들지 않는다', async () => {
  const dir = await mkdtemp(join(tmpdir(), 'harness-githooks-plain-'));
  try {
    await installPostCommitHook(dir);
    const made = await access(join(dir, '.git')).then(() => true, () => false);
    assert.equal(made, false);
  } finally { await rm(dir, { recursive: true, force: true }); }
});

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
import { installPostCommitHook, installPrePushHook, checkPrePushHook, resolveHooksDir, POST_COMMIT_MARKER, POST_COMMIT_HOOK, PRE_PUSH_HOOK, PRE_PUSH_MARKER, PRE_PUSH_BLOCK } from '../src/git-hooks.mjs';

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

test('.git/hooks가 없으면 만들어서 설치한다 — core.hooksPath 미설정', async () => {
  // bodoc4 실측(2026-09-21): hooks 디렉터리가 없는 저장소에서 조용히 건너뛰어, 미러는 성공을
  // 보고했는데 훅은 한 번도 깔리지 않았다. 기본 경로는 git이 실제로 읽는 곳이므로 우리가 만든다.
  const dir = await repo();
  try {
    await rm(join(dir, '.git/hooks'), { recursive: true, force: true });
    await installPostCommitHook(dir);
    assert.match(await readFile(join(dir, '.git/hooks/post-commit'), 'utf8'), /harness-team handoff/);
    await access(join(dir, '.git/hooks/post-commit'), constants.X_OK);
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
    assert.match(body, new RegExp(POST_COMMIT_MARKER), '마커 줄 삽입');
    await access(hook, constants.X_OK);
    // idempotent
    await installPostCommitHook(dir);
    assert.equal((await readFile(hook, 'utf8')).split(POST_COMMIT_MARKER).length - 1, 1, '두 번째 실행은 다시 넣지 않는다');
  } finally { await rm(dir, { recursive: true, force: true }); }
});

test('주석에만 harness-team handoff가 있는 훅은 설치된 것이 아니다 — 실행 줄을 넣는다', async () => {
  const dir = await repo();
  try {
    const hook = join(dir, '.git/hooks/post-commit');
    await writeFile(hook, '#!/bin/sh\n# harness-team handoff (disabled for now)\necho lint\n', { mode: 0o755 });
    await installPostCommitHook(dir);
    const live = (await readFile(hook, 'utf8')).split('\n').filter(l => !/^\s*#/.test(l) && l.includes(POST_COMMIT_MARKER));
    assert.equal(live.length, 1, '실행 줄이 정확히 하나 추가된다');
  } finally { await rm(dir, { recursive: true, force: true }); }
});

// post-commit 도 pre-push 와 같이 맨 위(shebang 다음)에 넣는다 — 끝에 붙이면 앞선 `exit`·`exec` 뒤에서 handoff 가 조용히
// 안 돌고(git-lfs 훅은 lfs 가 없으면 `exit 2`), python·node 훅은 셸 줄 때문에 문법 오류로 죽었다(followups 13).
const captureLogs = async (fn) => {
  const logs = [];
  const orig = console.log;
  console.log = (...a) => logs.push(a.join(' '));
  try { await fn(); } finally { console.log = orig; }
  return logs;
};

test('post-commit: `exit 0` 으로 끝나는 기존 훅에서도 handoff 가 돌고, 기존 줄도 그대로 돈다', async () => {
  const dir = await repo();
  try {
    const hook = join(dir, '.git/hooks/post-commit');
    const mine = join(dir, 'mine.txt');
    const ran = join(dir, 'handoff.txt');
    await writeFile(hook, `#!/bin/sh\necho mine > "${mine}"\nexit 0\n`, { mode: 0o755 });
    const logs = await captureLogs(() => installPostCommitHook(dir));
    assert.ok(logs.some(l => /inserted harness block at top/.test(l)));
    const body = await readFile(hook, 'utf8');
    assert.ok(body.startsWith('#!/bin/sh\n# harness: auto-update handoff'), 'shebang 바로 다음');
    assert.match(body, /exit 0\n$/, '기존 내용 보존');

    const bin = join(dir, 'bin');
    await mkdir(bin);
    await writeFile(join(bin, 'harness-team'), `#!/bin/sh\n[ "$1" = handoff ] && echo ok > "${ran}"\n`, { mode: 0o755 });
    await pexec(hook, [], { env: { PATH: `${bin}:/usr/bin:/bin` } });
    assert.equal(await readFile(ran, 'utf8'), 'ok\n', 'handoff 실행');
    assert.equal(await readFile(mine, 'utf8'), 'mine\n', '기존 줄 실행');
    // CLI 가 없어도 기존 줄을 막지 않는다 — `sh -e` 에서도.
    await rm(mine);
    await pexec('sh', ['-e', hook], { env: { PATH: '/usr/bin:/bin' } });
    assert.equal(await readFile(mine, 'utf8'), 'mine\n', 'CLI 없음 + sh -e 에서도 기존 줄 실행');
  } finally { await rm(dir, { recursive: true, force: true }); }
});

test('post-commit: 기존 훅이 셸 스크립트가 아니면 건너뛰고 handoff 직접 호출을 처방한다', async () => {
  const dir = await repo();
  try {
    const hook = join(dir, '.git/hooks/post-commit');
    const original = '#!/usr/bin/env node\nconsole.log("hi")\n';
    await writeFile(hook, original, { mode: 0o755 });
    const logs = await captureLogs(() => installPostCommitHook(dir));
    assert.equal(await readFile(hook, 'utf8'), original);
    const line = logs.find(l => /셸 스크립트가 아님/.test(l));
    assert.ok(line, '건너뛴 사유 안내');
    assert.match(line, /`harness-team handoff`/);
    assert.doesNotMatch(line, /--pre-push/, 'pre-push 처방이 새지 않는다');
  } finally { await rm(dir, { recursive: true, force: true }); }
});

test('post-commit: shebang 변형 — 없으면 맨 앞, bash·sh -e 는 첫 줄 유지', async () => {
  const dir = await repo();
  const hook = join(dir, '.git/hooks/post-commit');
  try {
    for (const [original, head] of [
      ['echo plain\n', '# harness: auto-update handoff'],
      ['#!/usr/bin/env bash\necho b\n', '#!/usr/bin/env bash\n# harness:'],
      ['#!/bin/sh -e\necho e\n', '#!/bin/sh -e\n# harness:'],
    ]) {
      await writeFile(hook, original, { mode: 0o755 });
      await installPostCommitHook(dir);
      const body = await readFile(hook, 'utf8');
      assert.ok(body.startsWith(head), `${JSON.stringify(original)} → ${JSON.stringify(body.slice(0, 40))}`);
      assert.ok(body.endsWith(original.split('\n').slice(original.startsWith('#!') ? 1 : 0).join('\n')), '기존 본문 보존');
    }
  } finally { await rm(dir, { recursive: true, force: true }); }
});

// 개행 없는 shebang 한 줄짜리 훅은 `#!/bin/sh# harness: …` 가 됐다(2026-10-06 재현) — shebang 을 공백까지 읽는 커널은
// 인터프리터 `/bin/sh#` 를 찾는다(macOS 는 그래도 실행해서 첫 줄만 비교한다).
test('개행 없는 shebang 한 줄짜리 훅: shebang 을 깨지 않고 다음 줄에 넣는다 (post-commit·pre-push)', async () => {
  const dir = await repo();
  try {
    for (const [name, install, marker] of [
      ['post-commit', installPostCommitHook, POST_COMMIT_MARKER],
      ['pre-push', installPrePushHook, PRE_PUSH_MARKER],
    ]) {
      const hook = join(dir, '.git/hooks', name);
      await writeFile(hook, '#!/bin/sh', { mode: 0o755 });
      await install(dir);
      const body = await readFile(hook, 'utf8');
      assert.equal(body.split('\n', 1)[0], '#!/bin/sh', `${name}: shebang 줄 그대로`);
      assert.ok(body.includes(marker));
      await pexec('sh', ['-n', hook]); // 문법 검사
    }
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

// pre-push 는 post-commit 과 같은 설치기를 쓰되, 기존 훅에는 **맨 위**(shebang 다음)에 넣는다 — 뒤에 붙이면 앞선 줄이
// stdin 을 소비하거나 `exit 0` 으로 끝나 검사가 사라졌다(리뷰 2026-10-06).
test('pre-push: 새로 설치하고, 기존 sh 훅에는 shebang 다음에 넣으며, 다시 실행해도 한 번만 있다', async () => {
  const dir = await repo();
  try {
    await installPrePushHook(dir);
    const hook = join(dir, '.git/hooks/pre-push');
    assert.equal(await readFile(hook, 'utf8'), PRE_PUSH_HOOK);
    await access(hook, constants.X_OK);

    await writeFile(hook, '#!/bin/sh\n# harness-team pr-check (disabled)\necho other\nexit 0\n', { mode: 0o644 });
    await installPrePushHook(dir);
    await installPrePushHook(dir);
    const body = await readFile(hook, 'utf8');
    assert.ok(body.startsWith('#!/bin/sh\n# harness: PR 필수'), 'shebang 바로 다음에 들어간다');
    assert.ok(body.indexOf(PRE_PUSH_MARKER) < body.indexOf('echo other'), '기존 줄보다 앞');
    assert.match(body, /echo other\nexit 0\n$/, '기존 내용 보존');
    const live = body.split('\n').filter(l => !/^\s*#/.test(l) && l.includes(PRE_PUSH_MARKER));
    assert.equal(live.length, 1, '실행 줄은 정확히 하나');
    await access(hook, constants.X_OK);
    // post-commit 은 따로 설치된다 — 서로의 마커로 오판하지 않는다.
    await installPostCommitHook(dir);
    assert.equal(await readFile(join(dir, '.git/hooks/post-commit'), 'utf8'), POST_COMMIT_HOOK);
  } finally { await rm(dir, { recursive: true, force: true }); }
});

test('pre-push: 기존 훅의 실패는 그대로 실패로 끝나고, 기존 줄은 같은 stdin 을 읽는다', async () => {
  const dir = await repo();
  try {
    const hook = join(dir, '.git/hooks/pre-push');
    await writeFile(hook, '#!/bin/sh\nfalse\n', { mode: 0o755 });
    await installPrePushHook(dir);
    const env = { ...process.env, PATH: '/usr/bin:/bin' }; // harness-team 없음 — 블록 본문은 건너뛴다
    assert.equal(await pexec('sh', [hook], { env }).then(() => 0, err => err.code), 1);
  } finally { await rm(dir, { recursive: true, force: true }); }
});

// 셸 줄을 python·node 훅에 넣으면 문법 오류로 모든 push 가 막힌다(리뷰 2026-10-06 재현) — 건드리지 않고 안내한다.
test('pre-push: 기존 훅이 셸 스크립트가 아니면 건너뛰고 파일을 바꾸지 않는다', async () => {
  const dir = await repo();
  try {
    const hook = join(dir, '.git/hooks/pre-push');
    const original = '#!/usr/bin/env python3\nimport sys\nsys.exit(0)\n';
    await writeFile(hook, original, { mode: 0o755 });
    const logs = [];
    const orig = console.log;
    console.log = (...a) => logs.push(a.join(' '));
    try { await installPrePushHook(dir); } finally { console.log = orig; }
    assert.equal(await readFile(hook, 'utf8'), original);
    assert.ok(logs.some(l => /셸 스크립트가 아님/.test(l)));
  } finally { await rm(dir, { recursive: true, force: true }); }
});

// doctor 용 판정(followups 11) — 훅 관리자가 훅 파일을 다시 써 블록이 사라져도 알 수 있어야 한다.
// 처방은 sync 가 실제로 고치는 경우에만 sync 다.
test('checkPrePushHook: 설치 직후 pass, 훅 파일이 다시 쓰이면 warning + sync 처방', async () => {
  const dir = await repo();
  try {
    await installPrePushHook(dir);
    assert.equal((await checkPrePushHook(dir)).status, 'pass');
    // 관리자 재생성 흉내: 블록 없이 덮어쓴다(주석에 명령 이름만 남은 경우도 설치가 아니다).
    await writeFile(join(dir, '.git/hooks/pre-push'), '#!/bin/sh\n# harness-team pr-check\nexit 0\n');
    const r = await checkPrePushHook(dir);
    assert.equal(r.status, 'warning');
    assert.match(r.detail, /run: harness-team sync/);
    // 관리자 사용자에게는 블록을 처방한다 — 맨 명령 한 줄은 구버전 팀원의 push 를 막고 stdin 을 소비한다.
    assert.match(r.detail, /pre-push 블록/, '관리자 사용자에게는 stdin 을 보존하는 블록을 처방한다');
  } finally { await rm(dir, { recursive: true, force: true }); }
});

test('checkPrePushHook: 훅 파일이 없으면 warning + sync 처방', async () => {
  const dir = await repo();
  try {
    const r = await checkPrePushHook(dir);
    assert.equal(r.status, 'warning');
    assert.match(r.detail, /pre-push 훅 없음/);
    assert.match(r.detail, /run: harness-team sync/);
  } finally { await rm(dir, { recursive: true, force: true }); }
});

test('checkPrePushHook: 셸이 아닌 훅은 sync 대신 직접 호출을 처방한다 — 설치기가 다시 건너뛰므로', async () => {
  const dir = await repo();
  try {
    await writeFile(join(dir, '.git/hooks/pre-push'), '#!/usr/bin/env python3\nimport sys\n', { mode: 0o755 });
    const r = await checkPrePushHook(dir);
    assert.equal(r.status, 'warning');
    assert.match(r.detail, /셸 스크립트가 아님/);
    assert.doesNotMatch(r.detail, /run: harness-team sync/);
  } finally { await rm(dir, { recursive: true, force: true }); }
});

test('checkPrePushHook: core.hooksPath 는 관리자 소유 — 마커가 없으면 경고 대신 skip 안내, 있으면 pass', async () => {
  const dir = await repo();
  try {
    await mkdir(join(dir, '.husky/_'), { recursive: true });
    await git(dir, 'config', 'core.hooksPath', '.husky/_');
    // husky v9 모양: 생성 파일은 사용자 설정(.husky/pre-push)을 부를 뿐이라 마커가 없다.
    await writeFile(join(dir, '.husky/_/pre-push'), '#!/usr/bin/env sh\n. "$(dirname "$0")/h"\n', { mode: 0o755 });
    const r = await checkPrePushHook(dir);
    assert.equal(r.status, 'skip');
    assert.match(r.detail, /core\.hooksPath/);
    assert.match(r.detail, /pre-push 블록/);
    await installPrePushHook(dir);
    assert.equal((await checkPrePushHook(dir)).status, 'pass');
  } finally { await rm(dir, { recursive: true, force: true }); }
});

test('checkPrePushHook: git 저장소가 아니면 null', async () => {
  const dir = await mkdtemp(join(tmpdir(), 'harness-githooks-nogit-'));
  try {
    assert.equal(await checkPrePushHook(dir), null);
  } finally { await rm(dir, { recursive: true, force: true }); }
});

// 관리자 설정(husky 는 `sh -e`)에도 이 블록을 그대로 넣으라고 처방한다. 맨 명령 한 줄은 CLI 부재·구버전 팀원의 push 를 막고
// stdin 을 소비해 뒤 명령(git-lfs 등)이 EOF 를 받았다(2026-10-06 실측·codex P2).
test('PRE_PUSH_BLOCK: sh -e 에서 CLI 없음·구버전은 통과, 지원 CLI 의 실패는 막고, 뒤 명령은 같은 stdin 을 읽는다', async () => {
  const dir = await mkdtemp(join(tmpdir(), 'harness-githooks-block-'));
  try {
    const hook = join(dir, 'pre-push');
    const input = join(dir, 'refs.txt');
    const downstream = join(dir, 'downstream.txt');
    await writeFile(hook, `${PRE_PUSH_BLOCK}cat > "${downstream}"\n`);
    await writeFile(input, 'refs/heads/a 111 refs/heads/a 000\n');
    const run = (bin) => pexec('sh', ['-c', `sh -e "${hook}" < "${input}"`], { env: { PATH: `${bin}:/usr/bin:/bin` } })
      .then(() => 0, err => err.code);
    const shim = async (name, body) => {
      await mkdir(join(dir, name), { recursive: true });
      await writeFile(join(dir, name, 'harness-team'), `#!/bin/sh\n${body}\n`, { mode: 0o755 });
      return join(dir, name);
    };
    const help = 'if [ "$1" = --help ]; then echo "  pr-check [dir]"; exit 0; fi';
    assert.equal(await run(join(dir, 'none')), 0, 'CLI 없음');
    assert.equal(await run(await shim('old', 'if [ "$1" = --help ]; then echo "  handoff"; exit 0; fi\nexit 1')), 0, 'pr-check 모르는 구버전');
    assert.equal(await run(await shim('pass', `${help}\ncat > /dev/null`)), 0);
    assert.equal(await readFile(downstream, 'utf8'), 'refs/heads/a 111 refs/heads/a 000\n', '검사 뒤 명령도 같은 ref 목록을 읽는다');
    assert.equal(await run(await shim('fail', `${help}\ncat > /dev/null\nexit 1`)), 1, '검사 실패는 push 를 막는다');
  } finally { await rm(dir, { recursive: true, force: true }); }
});

test('README 의 훅 관리자용 블록이 PRE_PUSH_BLOCK 과 같다 — 처방 원문이 갈라지지 않게', async () => {
  const readme = await readFile(new URL('../README.md', import.meta.url), 'utf8');
  const indented = PRE_PUSH_BLOCK.trimEnd().split('\n').map(line => `  ${line}`).join('\n');
  assert.ok(readme.includes(indented), 'README pr-check 절의 블록을 PRE_PUSH_BLOCK 으로 갱신하세요');
});

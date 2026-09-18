// `origin/HEAD` 읽기가 저장소에 세 벌 있었고 플래그도 파싱도 달랐다(`-q` 전체 ref slice /
// `--short` origin 접두 replace / 같은 값을 refs/remotes 로 재조립). 그 읽기를 이 모듈로 모았으므로
// 파싱 규약이 여기서 고정된다. **폴백은 여기 없다** — 호출자마다 다르고 그 차이는 의도된 것이다.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { execFile } from 'node:child_process';
import { promisify } from 'node:util';
import { mkdtemp, rm, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { readOriginHead } from '../src/git-default-branch.mjs';

const pexec = promisify(execFile);
const git = (cwd, ...args) => pexec('git', ['-C', cwd, ...args]);
// 실제 호출자들이 쓰는 모양 그대로: 인수 배열을 받아 stdout 을 준다.
const execIn = (dir) => async (args) => (await git(dir, ...args)).stdout;

async function repo(branch = 'main') {
  const dir = await mkdtemp(join(tmpdir(), 'harness-originhead-'));
  await git(dir, 'init', '-q', '-b', branch);
  await git(dir, 'config', 'user.email', 't@e.com');
  await git(dir, 'config', 'user.name', 't');
  await writeFile(join(dir, 'a.txt'), 'a\n');
  await git(dir, 'add', '-A');
  await git(dir, 'commit', '-qm', 'base');
  return dir;
}

async function withOrigin(dir, branch) {
  const bare = await mkdtemp(join(tmpdir(), 'harness-originhead-remote-'));
  await pexec('git', ['init', '-q', '--bare', '-b', branch, bare]);
  await git(dir, 'remote', 'add', 'origin', bare);
  await git(dir, 'push', '-q', 'origin', branch);
  await git(dir, 'symbolic-ref', 'refs/remotes/origin/HEAD', `refs/remotes/origin/${branch}`);
  return bare;
}

test('origin/HEAD 가 가리키는 브랜치 이름을 준다 (origin/ 접두는 벗긴다)', async () => {
  const dir = await repo('develop');
  let bare;
  try {
    bare = await withOrigin(dir, 'develop');
    assert.equal(await readOriginHead(execIn(dir)), 'develop');
  } finally {
    await rm(dir, { recursive: true, force: true });
    if (bare) await rm(bare, { recursive: true, force: true });
  }
});

// 브랜치 이름에 슬래시가 들어갈 수 있다. `origin/` 접두만 벗겨야지 첫 슬래시에서 자르면 안 된다.
test('슬래시가 든 브랜치 이름을 온전히 준다', async () => {
  const branch = 'release/2026-09';
  const dir = await repo(branch);
  let bare;
  try {
    bare = await withOrigin(dir, branch);
    assert.equal(await readOriginHead(execIn(dir)), branch);
  } finally {
    await rm(dir, { recursive: true, force: true });
    if (bare) await rm(bare, { recursive: true, force: true });
  }
});

test('origin/HEAD 가 없으면 null — 무엇으로 대신할지는 호출자가 정한다', async () => {
  const dir = await repo('main');
  try {
    assert.equal(await readOriginHead(execIn(dir)), null, 'origin 자체가 없는 경우');
    const bare = await withOrigin(dir, 'main');
    await git(dir, 'symbolic-ref', '-d', 'refs/remotes/origin/HEAD');
    assert.equal(await readOriginHead(execIn(dir)), null, 'origin 은 있지만 HEAD 미설정');
    await rm(bare, { recursive: true, force: true });
  } finally { await rm(dir, { recursive: true, force: true }); }
});

// dangling 은 여기서 거르지 않는다 — symbolic-ref 는 가리키는 대상의 존재를 확인하지 않고,
// 그 검증은 base 로 쓰기 직전에 호출자가 한다(review.mjs 의 resolveScope).
test('dangling origin/HEAD 도 이름 그대로 준다 (존재 검증은 호출자 몫)', async () => {
  const dir = await repo('main');
  let bare;
  try {
    bare = await withOrigin(dir, 'main');
    await git(dir, 'symbolic-ref', 'refs/remotes/origin/HEAD', 'refs/remotes/origin/gone');
    assert.equal(await readOriginHead(execIn(dir)), 'gone');
  } finally {
    await rm(dir, { recursive: true, force: true });
    if (bare) await rm(bare, { recursive: true, force: true });
  }
});

// codex P2: 손으로 `origin/HEAD → refs/heads/<branch>` 를 만든 저장소에서 `--short` 는 **로컬**
// 브랜치 이름을 준다. 옛 defaultBranchCandidates 만 그 값을 받아들였고(['develop']), 옛
// resolveDefaultRef 는 거절했다 — 저장소가 이미 자기모순이었다. 이제 셋 다 거절한다: 로컬 브랜치가
// 원격 기본 브랜치 행세를 하면 쓰기 가드가 잘못된 기준으로 열린다. 의도된 동작 변화다.
test('origin/HEAD 가 로컬 ref(refs/heads/...) 를 가리키면 채택하지 않는다', async () => {
  const dir = await repo('develop');
  try {
    await git(dir, 'symbolic-ref', 'refs/remotes/origin/HEAD', 'refs/heads/develop');
    assert.equal(
      (await git(dir, 'symbolic-ref', '--short', 'refs/remotes/origin/HEAD')).stdout.trim(),
      'develop',
      '전제: --short 는 로컬 브랜치 이름을 그대로 준다',
    );
    assert.equal(await readOriginHead(execIn(dir)), null);
  } finally { await rm(dir, { recursive: true, force: true }); }
});

test('git 저장소가 아니면 null — 던지지 않는다', async () => {
  const dir = await mkdtemp(join(tmpdir(), 'harness-originhead-nogit-'));
  try {
    assert.equal(await readOriginHead(execIn(dir)), null);
  } finally { await rm(dir, { recursive: true, force: true }); }
});

// exec 주입이 계약이다 — remote-task 는 GIT_NO_LAZY_FETCH·timeout 을 건 실행기를, summary 는
// plain 실행기를 넘긴다. 프리미티브가 실행 정책을 정하면 두 호출자의 동작이 바뀐다.
test('exec 주입: 명령은 symbolic-ref --quiet --short 한 줄이다', async () => {
  const calls = [];
  const name = await readOriginHead(async (args) => { calls.push(args); return 'origin/main\n'; });
  assert.equal(name, 'main');
  assert.deepEqual(calls, [['symbolic-ref', '--quiet', '--short', 'refs/remotes/origin/HEAD']]);
});

// git 이 만드는 origin/HEAD 는 항상 `origin/` 모양이다. 아닌 값을 이름으로 채택하면 호출자가
// 없는 ref 를 base 나 브랜치 이름으로 삼는다 — 옛 remote-task 구현도 접두를 확인하고서야 채택했다.
test('origin/ 으로 시작하지 않는 응답은 채택하지 않는다', async () => {
  for (const raw of ['refs/heads/main\n', 'main\n', '\n', '']) {
    assert.equal(await readOriginHead(async () => raw), null, `"${raw.trim()}" 를 채택했다`);
  }
});

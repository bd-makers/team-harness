// 기본 브랜치 판정이 저장소에 세 벌 있었고 규칙이 갈렸다: remote-task.mjs 의 resolveDefaultRef 는
// `origin/HEAD` 를 보는데 review.mjs 의 resolveScope 는 `origin/main` 을 하드코딩했다. 기본 브랜치가
// master·develop 인 저장소에서 `review --scope diff` 가 엉뚱한 base 를 잡는다 — 동명의 낡은 로컬
// 브랜치가 있으면 조용히 잘못된 diff 를 리뷰한다. 이 파일이 그 판정과 `scope` 커맨드를 함께 고정한다.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { spawn, execFile } from 'node:child_process';
import { promisify } from 'node:util';
import { mkdtemp, rm, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { resolveScope } from '../src/commands/review.mjs';

const pexec = promisify(execFile);
const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const BIN = join(ROOT, 'bin', 'harness-team.mjs');

const git = (cwd, ...args) => pexec('git', ['-C', cwd, ...args]);

// origin 없는 단독 저장소. 기본 브랜치 이름을 인수로 받는다.
async function repo(branch = 'main') {
  const dir = await mkdtemp(join(tmpdir(), 'harness-scope-'));
  await git(dir, 'init', '-q', '-b', branch);
  await git(dir, 'config', 'user.email', 't@e.com');
  await git(dir, 'config', 'user.name', 't');
  await writeFile(join(dir, 'a.txt'), 'a\n');
  await git(dir, 'add', '-A');
  await git(dir, 'commit', '-qm', 'base');
  return dir;
}

// 로컬 bare 저장소를 origin 으로 붙이고 origin/HEAD 를 그 기본 브랜치로 세운다 (네트워크 없음).
async function withOrigin(dir, branch) {
  const bare = await mkdtemp(join(tmpdir(), 'harness-scope-origin-'));
  await pexec('git', ['init', '-q', '--bare', '-b', branch, bare]);
  await git(dir, 'remote', 'add', 'origin', bare);
  await git(dir, 'push', '-q', 'origin', branch);
  await git(dir, 'symbolic-ref', `refs/remotes/origin/HEAD`, `refs/remotes/origin/${branch}`);
  return bare;
}

function cli(args) {
  return new Promise((resolvePromise, reject) => {
    const child = spawn(process.execPath, [BIN, ...args], { cwd: ROOT });
    let stdout = '';
    let stderr = '';
    child.stdout.on('data', d => { stdout += d; });
    child.stderr.on('data', d => { stderr += d; });
    child.on('error', reject);
    child.on('close', code => resolvePromise({ code, stdout, stderr }));
  });
}

// 회귀 고정: 기본 브랜치가 master 인 저장소에서 base 는 origin/master 여야 한다.
// 고치기 전에는 `main` 을 잡아 "base ref 를 찾을 수 없음" 으로 죽었다.
test('resolveScope: origin/HEAD 가 가리키는 브랜치를 base 로 잡는다 (main 하드코딩 아님)', async () => {
  const dir = await repo('master');
  let bare;
  try {
    bare = await withOrigin(dir, 'master');
    await git(dir, 'checkout', '-qb', 'feature');
    await writeFile(join(dir, 'b.txt'), 'b\n');
    await git(dir, 'add', '-A');
    await git(dir, 'commit', '-qm', 'feat');

    const r = await resolveScope({ targetDir: dir });
    assert.equal(r.error, undefined, `에러 없이 판정해야 한다: ${r.error}`);
    assert.equal(r.scope, 'diff');
    assert.equal(r.base, 'origin/master');
  } finally {
    await rm(dir, { recursive: true, force: true });
    if (bare) await rm(bare, { recursive: true, force: true });
  }
});

// 기존 동작 보존: origin 이 없으면 resolveDefaultRef 가 null 을 주므로 `main` 으로 떨어진다.
test('resolveScope: origin 이 없으면 main 폴백을 유지한다', async () => {
  const dir = await repo('main');
  try {
    await git(dir, 'checkout', '-qb', 'feature');
    await writeFile(join(dir, 'b.txt'), 'b\n');
    await git(dir, 'add', '-A');
    await git(dir, 'commit', '-qm', 'feat');

    const r = await resolveScope({ targetDir: dir });
    assert.equal(r.scope, 'diff');
    assert.equal(r.base, 'main');
  } finally { await rm(dir, { recursive: true, force: true }); }
});

// codex P2: origin/HEAD 가 삭제된 브랜치를 가리킨 채 남아 있으면(기본 브랜치 개명·정리 후 흔하다)
// 그 이름을 base 로 써서, 유효한 origin/main 이 있는데도 "base ref 를 찾을 수 없음" 으로 죽었다.
// origin/HEAD 를 보게 만든 이번 변경이 들여온 실패 모드다 — 실재하는 후보만 채택한다.
test('resolveScope: dangling origin/HEAD 는 건너뛰고 실재하는 후보로 내려간다', async () => {
  const dir = await repo('main');
  let bare;
  try {
    bare = await withOrigin(dir, 'main');
    // origin/HEAD 를 존재하지 않는 origin/master 로 돌려놓는다
    await git(dir, 'symbolic-ref', 'refs/remotes/origin/HEAD', 'refs/remotes/origin/master');
    await git(dir, 'checkout', '-qb', 'feature');
    await writeFile(join(dir, 'b.txt'), 'b\n');
    await git(dir, 'add', '-A');
    await git(dir, 'commit', '-qm', 'feat');

    const r = await resolveScope({ targetDir: dir });
    assert.equal(r.error, undefined, `dangling origin/HEAD 로 죽으면 안 된다: ${r.error}`);
    assert.equal(r.base, 'origin/main');
  } finally {
    await rm(dir, { recursive: true, force: true });
    if (bare) await rm(bare, { recursive: true, force: true });
  }
});

// codex P2: `review` 는 task-docs 를 framing/--prompt-file 없이는 즉시 거절한다(review.mjs:404).
// 실행되지 않는 명령은 안내가 아니다.
test('CLI scope: task-docs 안내는 framing 이 필요하다는 사실을 담는다', async () => {
  const dir = await repo('main');
  try {
    const { stdout } = await cli(['scope', '--json', '--scope', 'task-docs', '--target', dir]);
    const hint = JSON.parse(stdout).next_actions.join('\n');
    assert.match(hint, /--framing/);
    assert.doesNotMatch(hint, /--scope task-docs/, '그대로 따라 하면 거절당하는 명령을 안내하지 않는다');
  } finally { await rm(dir, { recursive: true, force: true }); }
});

test('resolveScope: 명시한 --base 가 origin/HEAD 를 이긴다', async () => {
  const dir = await repo('master');
  let bare;
  try {
    bare = await withOrigin(dir, 'master');
    const first = (await git(dir, 'rev-parse', 'HEAD')).stdout.trim();
    await git(dir, 'checkout', '-qb', 'feature');
    await writeFile(join(dir, 'b.txt'), 'b\n');
    await git(dir, 'add', '-A');
    await git(dir, 'commit', '-qm', 'feat');

    const r = await resolveScope({ targetDir: dir, base: first });
    assert.equal(r.scope, 'diff');
    assert.equal(r.base, first);
  } finally {
    await rm(dir, { recursive: true, force: true });
    if (bare) await rm(bare, { recursive: true, force: true });
  }
});

// codex P1: origin 은 있는데 origin/HEAD 도 origin/main 도 없으면 로컬 `main` 으로 떨어졌다.
// 기본 브랜치가 develop 이고 낡은 로컬 main 이 남아 있으면 **이 판정이 없애려던 바로 그 실패 모드**가
// 그대로 되살아난다 — 조용히 엉뚱한 diff 를 리뷰한다. 모르면 때우지 말고 물어야 한다.
test('resolveScope: origin 이 있는데 기본 브랜치를 못 찾으면 로컬 main 으로 때우지 않고 error 다', async () => {
  const dir = await repo('develop');
  let bare;
  try {
    bare = await withOrigin(dir, 'develop');
    await git(dir, 'symbolic-ref', '-d', 'refs/remotes/origin/HEAD');
    await git(dir, 'branch', '-q', 'main', 'HEAD');   // 낡은 로컬 main
    await git(dir, 'checkout', '-qb', 'feature');
    await writeFile(join(dir, 'b.txt'), 'b\n');
    await git(dir, 'add', '-A');
    await git(dir, 'commit', '-qm', 'feat');

    const r = await resolveScope({ targetDir: dir });
    assert.ok(r.error, '로컬 main 을 base 로 삼아 success 를 내면 안 된다');
    assert.match(r.error, /기본 브랜치를 판정하지 못함/);
    assert.notEqual(r.base, 'main');
  } finally {
    await rm(dir, { recursive: true, force: true });
    if (bare) await rm(bare, { recursive: true, force: true });
  }
});

// codex P1: 원격 브랜치 이름은 우리가 만든 값이 아니고 `$`·백틱·괄호를 담을 수 있다. 인용 없이
// 안내하면 그 줄을 셸에 붙여넣는 순간 command substitution 이 실행된다.
test('CLI scope: 안내 문구의 base 는 셸 인용된다', async () => {
  const branch = 'release$(whoami)';
  const dir = await repo(branch);
  let bare;
  try {
    bare = await withOrigin(dir, branch);
    await git(dir, 'checkout', '-qb', 'feature');
    await writeFile(join(dir, 'b.txt'), 'b\n');
    await git(dir, 'add', '-A');
    await git(dir, 'commit', '-qm', 'feat');

    const { stdout } = await cli(['scope', '--json', '--target', dir]);
    const hint = JSON.parse(stdout).next_actions.join('\n');
    assert.match(hint, /--base 'origin\/release\$\(whoami\)'/);
  } finally {
    await rm(dir, { recursive: true, force: true });
    if (bare) await rm(bare, { recursive: true, force: true });
  }
});

test('CLI scope: diff 판정을 envelope 로 보고한다', async () => {
  const dir = await repo('master');
  let bare;
  try {
    bare = await withOrigin(dir, 'master');
    await git(dir, 'checkout', '-qb', 'feature');
    await writeFile(join(dir, 'b.txt'), 'b\n');
    await git(dir, 'add', '-A');
    await git(dir, 'commit', '-qm', 'feat');

    const { code, stdout } = await cli(['scope', '--json', '--target', dir]);
    assert.equal(code, 0);
    const env = JSON.parse(stdout);
    assert.equal(env.command, 'scope');
    assert.equal(env.status, 'success');
    assert.equal(env.scope, 'diff');
    assert.equal(env.base, 'origin/master');
    assert.equal(env.tip.length, 40);
  } finally {
    await rm(dir, { recursive: true, force: true });
    if (bare) await rm(bare, { recursive: true, force: true });
  }
});

test('CLI scope: dirty 워킹트리는 worktree 로 보고하고 base 는 비운다', async () => {
  const dir = await repo('main');
  try {
    await writeFile(join(dir, 'a.txt'), 'changed\n');
    const { code, stdout } = await cli(['scope', '--json', '--target', dir]);
    assert.equal(code, 0);
    const env = JSON.parse(stdout);
    assert.equal(env.scope, 'worktree');
    assert.equal(env.base, null);
  } finally { await rm(dir, { recursive: true, force: true }); }
});

// 빈 diff 는 실패가 아니다 — 리뷰할 것이 없다는 관측이다. ship 이 여기서 "ship 할 것 없음"으로 멈춘다.
test('CLI scope: diff 가 비면 warning 으로 알리되 exit 0 이다', async () => {
  const dir = await repo('main');
  try {
    const { code, stdout } = await cli(['scope', '--json', '--target', dir]);
    assert.equal(code, 0);
    const env = JSON.parse(stdout);
    assert.equal(env.status, 'warning');
    assert.equal(env.scope, null, '리뷰할 scope 가 없다');
    assert.match(env.summary, /비어/);
  } finally { await rm(dir, { recursive: true, force: true }); }
});

test('CLI scope: 없는 base 는 error 패킷과 exit 1 이다', async () => {
  const dir = await repo('main');
  try {
    const { code, stdout } = await cli(['scope', '--json', '--scope', 'diff', '--base', 'nope', '--target', dir]);
    assert.equal(code, 1);
    const env = JSON.parse(stdout);
    assert.equal(env.status, 'error');
    assert.ok(env.error.root_cause, 'error 패킷 5항목을 갖춘다');
    assert.ok(env.error.safe_default);
  } finally { await rm(dir, { recursive: true, force: true }); }
});

// codex P2: resolveScope 는 모르는 scope 값을 조용히 diff 로 흘린다. review 는 호출 전에 목록
// 대조로 막지만 scope 커맨드가 빠뜨려, `--scope typo` 가 성공한 diff 판정으로 나왔다.
test('CLI scope: 알 수 없는 --scope 는 판정을 내지 않고 exit 2 로 거절한다', async () => {
  const dir = await repo('main');
  try {
    const { code, stdout, stderr } = await cli(['scope', '--json', '--scope', 'typo', '--target', dir]);
    assert.equal(code, 2);
    assert.equal(stdout, '', '거절했으면 관측을 내지 않는다');
    assert.match(stderr, /알 수 없는 --scope "typo"/);
  } finally { await rm(dir, { recursive: true, force: true }); }
});

test('CLI scope: 허용 scope 값 세 개는 모두 통과한다', async () => {
  const dir = await repo('main');
  try {
    await writeFile(join(dir, 'a.txt'), 'changed\n');
    for (const scope of ['worktree', 'task-docs']) {
      const { code, stdout } = await cli(['scope', '--json', '--scope', scope, '--target', dir]);
      assert.equal(code, 0, `${scope} 에서 실패`);
      assert.equal(JSON.parse(stdout).scope, scope);
    }
  } finally { await rm(dir, { recursive: true, force: true }); }
});

test('CLI scope: git 저장소가 아니면 worktree 로 degrade 한다', async () => {
  const dir = await mkdtemp(join(tmpdir(), 'harness-scope-nogit-'));
  try {
    const { code, stdout } = await cli(['scope', '--json', '--target', dir]);
    assert.equal(code, 0);
    assert.equal(JSON.parse(stdout).scope, 'worktree');
  } finally { await rm(dir, { recursive: true, force: true }); }
});

// `scope` 는 taskCmds 가 아니라 doctor·stack 처럼 [dir] positional 을 target 으로 받는다.
test('CLI scope: [dir] positional 이 --target 과 같은 결과를 낸다', async () => {
  const dir = await repo('main');
  try {
    await writeFile(join(dir, 'a.txt'), 'changed\n');
    const viaTarget = JSON.parse((await cli(['scope', '--json', '--target', dir])).stdout);
    const viaPositional = JSON.parse((await cli(['scope', '--json', dir])).stdout);
    assert.equal(viaPositional.scope, viaTarget.scope);
    assert.equal(viaPositional.tip, viaTarget.tip);
  } finally { await rm(dir, { recursive: true, force: true }); }
});

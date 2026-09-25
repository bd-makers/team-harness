import { test } from 'node:test';
import assert from 'node:assert/strict';
import { mkdtemp, mkdir, writeFile, rm } from 'node:fs/promises';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { tmpdir } from 'node:os';
import { execFile } from 'node:child_process';
import { promisify } from 'node:util';
import { listBranchOnlyTasks } from '../src/commands/remote-task.mjs';
import { runList } from '../src/commands/task.mjs';

// `list --remote`: 머지되지 않은 원격 브랜치에만 있는 task 를 fetch 없이(마지막 fetch 기준) 보여 준다.
// 배경(2026-09-08): 열린 task 가 origin/claude/agent-harness-core-elements-fqankc 에만 있었고 "머지된 브랜치"로 오인돼
// 지워질 뻔했다. `list` 는 체크아웃한 브랜치의 docs/ 만 봤다.

const pexec = promisify(execFile);
const BIN = resolve(dirname(fileURLToPath(import.meta.url)), '..', 'bin', 'harness-team.mjs');
const GIT_ID = ['-c', 'user.name=t', '-c', 'user.email=t@t', '-c', 'commit.gpgsign=false', '-c', 'core.hooksPath=/dev/null'];
async function git(dir, args) {
  const { stdout } = await pexec('git', ['-C', dir, ...GIT_ID, ...args]);
  return stdout.trim();
}
async function put(dir, rel, body = 'x\n') {
  await mkdir(dirname(join(dir, rel)), { recursive: true });
  await writeFile(join(dir, rel), body);
}
async function commitAll(dir, msg) {
  await git(dir, ['add', '-A']);
  await git(dir, ['commit', '-q', '-m', msg]);
  return git(dir, ['rev-parse', 'HEAD']);
}
function capture() {
  const logs = [];
  const orig = console.log;
  console.log = (...a) => logs.push(a.join(' '));
  return { logs, restore: () => { console.log = orig; } };
}
async function list(dir, flags = {}) {
  const cap = capture();
  try { await runList({ targetDir: dir, flags }); return cap.logs; } finally { cap.restore(); }
}

// bare origin + 작업 저장소. 작업 트리는 C0(bob/base 만 있는 커밋) 위 dup 에서 딴 `work` 브랜치다 — main 의 머지를 모른다.
// - merged    : carol/done — origin/main 에 ff 머지됨(조상). 로컬 트리에는 없지만 표시되면 안 된다
// - feat-foo  : 머지 뒤 main 에서 딴 브랜치. alice/foo (area web) + 이름이 안 맞는 spec + 3단 경로 — 미머지, 표시 대상.
//               main 의 carol/done 도 싣고 있다 — default ref 트리에 있는 task 라 표시되면 안 된다
// - feat-foo2 : alice/foo 를 또 가진 두 번째 미머지 브랜치 — 한 줄에 브랜치를 모은다
// - dup       : dave/wip — 미머지지만 작업 트리에 이미 있으니 원격 절에 다시 나오면 안 된다
async function fixture() {
  const root = await mkdtemp(join(tmpdir(), 'harness-list-remote-'));
  const origin = join(root, 'origin.git');
  const dir = join(root, 'work');
  await pexec('git', ['init', '-q', '--bare', '-b', 'main', origin]);
  await pexec('git', ['init', '-q', '-b', 'main', dir]);
  await git(dir, ['remote', 'add', 'origin', origin]);

  await put(dir, 'docs/bob/base/base-spec.md');
  const c0 = await commitAll(dir, 'c0');
  await git(dir, ['push', '-q', 'origin', 'main']);

  await git(dir, ['switch', '-q', '-c', 'merged']);
  await put(dir, 'docs/carol/done/done-spec.md');
  await commitAll(dir, 'merged');
  await git(dir, ['push', '-q', 'origin', 'merged']);
  await git(dir, ['switch', '-q', 'main']);
  await git(dir, ['merge', '-q', '--ff-only', 'merged']);
  await git(dir, ['push', '-q', 'origin', 'main']);

  await git(dir, ['switch', '-q', '-c', 'feat-foo']);
  await put(dir, 'docs/alice/foo/foo-spec.md');
  await put(dir, 'docs/alice/foo/foo-meta.json', JSON.stringify({ area: 'web' }));
  await put(dir, 'docs/alice/bar/other-spec.md');
  await put(dir, 'docs/alice/deep/x/x-spec.md');
  await put(dir, 'docs/superpowers/plans/p.md');
  await commitAll(dir, 'foo');
  await git(dir, ['push', '-q', 'origin', 'feat-foo']);
  await git(dir, ['switch', '-q', '-c', 'feat-foo2']);
  await put(dir, 'docs/alice/foo/foo-plan.md');
  await commitAll(dir, 'foo2');
  await git(dir, ['push', '-q', 'origin', 'feat-foo2']);

  await git(dir, ['switch', '-q', '-c', 'dup', c0]);
  await put(dir, 'docs/dave/wip/wip-spec.md');
  await commitAll(dir, 'dup');
  await git(dir, ['push', '-q', 'origin', 'dup']);

  await git(dir, ['switch', '-q', '-c', 'work', 'dup']);
  await git(dir, ['remote', 'set-head', 'origin', 'main']);
  return { root, dir };
}

test('list --remote: 미머지 브랜치에만 있는 task 만, 브랜치를 모아 한 줄로 보여 준다', async () => {
  const { root, dir } = await fixture();
  try {
    const logs = await list(dir, { remote: true });
    assert.deepEqual(logs.slice(0, 2).sort(), ['  bob/base', '  dave/wip']);
    assert.deepEqual(logs.slice(2), [
      'branch-only (origin, 마지막 fetch 기준):',
      '  alice/foo  (origin/feat-foo, origin/feat-foo2)',
    ]);
  } finally { await rm(root, { recursive: true, force: true }); }
});

test('listBranchOnlyTasks: default ref 의 조상(머지된 브랜치)은 트리를 읽지도 않는다', async () => {
  const { root, dir } = await fixture();
  try {
    const calls = [];
    const spy = async (target, args) => {
      calls.push(args);
      const { stdout } = await pexec('git', ['-C', target, ...args], { env: { ...process.env, GIT_NO_LAZY_FETCH: '1' } });
      return stdout;
    };
    const result = await listBranchOnlyTasks(dir, { git: spy });
    assert.equal(result.ok, true);
    // exclude 없이 부르면 작업 트리에 있는 dave/wip 도 나온다. carol/done 은 main 트리에 있어 빠진다(feat-foo 도 싣고 있다).
    assert.deepEqual(result.tasks.map(t => `${t.user}/${t.task}`), ['alice/foo', 'dave/wip']);
    const lsTreeRefs = calls.filter(a => a[0] === 'ls-tree').map(a => a[4]);
    assert.deepEqual(lsTreeRefs, ['origin/main', 'refs/remotes/origin/dup', 'refs/remotes/origin/feat-foo', 'refs/remotes/origin/feat-foo2']);
  } finally { await rm(root, { recursive: true, force: true }); }
});

test('list --remote --area: 원격 meta.area 로 거르고, meta 가 없으면 area 없음으로 빠진다', async () => {
  const { root, dir } = await fixture();
  try {
    assert.deepEqual(await list(dir, { remote: true, area: 'web' }), [
      '(no tasks)',
      'branch-only (origin, 마지막 fetch 기준):',
      '  alice/foo  (origin/feat-foo, origin/feat-foo2)',
    ]);
    assert.deepEqual(await list(dir, { remote: true, area: 'api' }), [
      '(no tasks)',
      'branch-only (origin, 마지막 fetch 기준):',
      '  (none)',
    ]);
  } finally { await rm(root, { recursive: true, force: true }); }
});

test('list (--remote 없음): 원격 절을 출력하지 않는다', async () => {
  const { root, dir } = await fixture();
  try {
    assert.deepEqual((await list(dir)).sort(), ['  bob/base', '  dave/wip']);
  } finally { await rm(root, { recursive: true, force: true }); }
});

test('list --remote: branch-only 가 없으면 헤더 아래 (none)', async () => {
  const root = await mkdtemp(join(tmpdir(), 'harness-list-remote-'));
  const origin = join(root, 'origin.git');
  const dir = join(root, 'work');
  try {
    await pexec('git', ['init', '-q', '--bare', '-b', 'main', origin]);
    await pexec('git', ['init', '-q', '-b', 'main', dir]);
    await git(dir, ['remote', 'add', 'origin', origin]);
    await put(dir, 'docs/bob/base/base-spec.md');
    await commitAll(dir, 'c0');
    await git(dir, ['push', '-q', 'origin', 'main']);
    assert.deepEqual(await list(dir, { remote: true }), [
      '  bob/base',
      'branch-only (origin, 마지막 fetch 기준):',
      '  (none)',
    ]);
  } finally { await rm(root, { recursive: true, force: true }); }
});

test('list --remote: origin 없는 저장소 → 건너뜀 한 줄, exit 0', async () => {
  const dir = await mkdtemp(join(tmpdir(), 'harness-list-remote-'));
  try {
    await pexec('git', ['init', '-q', '-b', 'main', dir]);
    await put(dir, 'docs/bob/base/base-spec.md');
    await commitAll(dir, 'c0');
    const { stdout } = await pexec('node', [BIN, 'list', '--remote', '--target', dir, '--member', 'bob']);
    assert.deepEqual(stdout.trimEnd().split('\n'), [
      '  bob/base',
      'branch-only: 원격 스캔 건너뜀 (git·origin 없음 또는 git 오류)',
    ]);
  } finally { await rm(dir, { recursive: true, force: true }); }
});

test('list --remote: git 저장소가 아니어도 exit 0, docs/ 가 없으면 (no docs/) 뒤에 건너뜀 한 줄', async () => {
  const dir = await mkdtemp(join(tmpdir(), 'harness-list-remote-'));
  try {
    const { stdout } = await pexec('node', [BIN, 'list', '--remote', '--target', dir, '--member', 'bob']);
    assert.deepEqual(stdout.trimEnd().split('\n'), [
      '(no docs/)',
      'branch-only: 원격 스캔 건너뜀 (git·origin 없음 또는 git 오류)',
    ]);
  } finally { await rm(dir, { recursive: true, force: true }); }
});

test('listBranchOnlyTasks: 어떤 git 오류도 throw 하지 않고 { ok: false }', async () => {
  const boom = async (_dir, args) => {
    if (args[0] === 'symbolic-ref' || args[0] === 'rev-parse') return 'refs/remotes/origin/main\n';
    throw new Error('git exploded');
  };
  assert.deepEqual(await listBranchOnlyTasks('/nowhere', { git: boom }), { ok: false });
});

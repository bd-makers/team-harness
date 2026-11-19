// `harness-team clean` — task 를 시작 전 상태로 되돌린다. 전부 임시 git 저장소에서만 돈다:
// `--yes` 는 `reset --hard` 라서 실제 체크아웃에서 돌리면 작업이 사라진다.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { mkdtemp, mkdir, readFile, writeFile, rm } from 'node:fs/promises';
import { join } from 'node:path';
import { tmpdir } from 'node:os';
import { execFileSync } from 'node:child_process';
import { runTask } from '../src/commands/task.mjs';
import { runClean, backupRefName } from '../src/commands/clean.mjs';
import { findCommand } from '../src/cli-args.mjs';
import { exists } from '../src/fsx.mjs';

const noRemote = { doneOnMain: async () => null };
const git = (dir, ...args) => execFileSync('git', ['-C', dir, ...args], { encoding: 'utf8' }).trim();

async function capture(fn) {
  const logs = [];
  const orig = console.log;
  const before = process.exitCode;
  console.log = (...a) => logs.push(a.join(' '));
  try {
    await fn();
    return { out: logs.join('\n'), exitCode: process.exitCode ?? 0 };
  } finally {
    console.log = orig;
    process.exitCode = before;
  }
}

const task = (dir, name) => capture(() => runTask({ targetDir: dir, flags: { member: 'chad' }, taskArgs: [name] }, noRemote));
const clean = (dir, { name, yes = false, base, member } = {}) => capture(() => runClean({
  targetDir: dir,
  flags: { ...(yes ? { yes: true } : {}), ...(base ? { base } : {}), ...(member ? { member } : {}) },
  taskArgs: name ? [name] : [],
}));

// main 에 커밋 하나 + .gitignore, feat 브랜치에서 task x 생성 → 커밋 하나 + 미커밋 수정 + untracked + ignored.
async function fixture() {
  const dir = await mkdtemp(join(tmpdir(), 'harness-clean-'));
  git(dir, 'init', '-q', '-b', 'main');
  await writeFile(join(dir, '.gitignore'), 'ignored.txt\n.harness/active.json\ndocs/*/*-handoff.md\n');
  await writeFile(join(dir, 'app.js'), 'v1\n');
  git(dir, 'add', '-A');
  git(dir, 'commit', '-q', '-m', 'base');
  const base = git(dir, 'rev-parse', 'HEAD');
  git(dir, 'switch', '-q', '-c', 'feat');
  const created = await task(dir, 'x');
  assert.equal(created.exitCode, 0, created.out);
  await writeFile(join(dir, 'app.js'), 'v2\n');
  git(dir, 'add', '-A');
  git(dir, 'commit', '-q', '-m', 'task work');
  await writeFile(join(dir, 'app.js'), 'v3-uncommitted\n');
  await writeFile(join(dir, 'scratch.txt'), 'untracked\n');
  await writeFile(join(dir, 'ignored.txt'), 'keep me\n');
  return { dir, base };
}

const state = dir => ({
  head: git(dir, 'rev-parse', 'HEAD'),
  status: git(dir, 'status', '--porcelain', '--untracked-files=all'),
  refs: git(dir, 'for-each-ref', 'refs/harness'),
});

test('task: records baseSha at creation and reactivation does not move it', async () => {
  const { dir, base } = await fixture();
  try {
    const metaPath = join(dir, 'docs/chad/x/x-meta.json');
    assert.equal(JSON.parse(await readFile(metaPath, 'utf8')).baseSha, base, '생성 시점 HEAD');
    await task(dir, 'y');
    await task(dir, 'x');
    assert.equal(JSON.parse(await readFile(metaPath, 'utf8')).baseSha, base, '재활성화가 밀지 않는다');
  } finally { await rm(dir, { recursive: true, force: true }); }
});

test('task: no baseSha outside git or on an unborn HEAD', async () => {
  const plain = await mkdtemp(join(tmpdir(), 'harness-clean-plain-'));
  const unborn = await mkdtemp(join(tmpdir(), 'harness-clean-unborn-'));
  try {
    git(unborn, 'init', '-q');
    for (const dir of [plain, unborn]) {
      assert.equal((await task(dir, 'x')).exitCode, 0);
      const meta = JSON.parse(await readFile(join(dir, 'docs/chad/x/x-meta.json'), 'utf8'));
      assert.equal('baseSha' in meta, false);
    }
  } finally {
    await rm(plain, { recursive: true, force: true });
    await rm(unborn, { recursive: true, force: true });
  }
});

test('clean: is a command, so `task clean` cannot create a task named clean', async () => {
  assert.ok(findCommand('clean'));
  const dir = await mkdtemp(join(tmpdir(), 'harness-clean-reserved-'));
  try {
    const r = await task(dir, 'clean');
    assert.equal(r.exitCode, 1);
    assert.equal(await exists(join(dir, 'docs/chad/clean')), false);
  } finally { await rm(dir, { recursive: true, force: true }); }
});

test('clean: dry-run lists what would go and writes nothing', async () => {
  const { dir, base } = await fixture();
  try {
    const before = state(dir);
    const active = await readFile(join(dir, '.harness/active.json'), 'utf8');
    const r = await clean(dir);
    assert.equal(r.exitCode, 0, r.out);
    assert.match(r.out, /clean \(dry-run\): chad\/x/);
    assert.match(r.out, new RegExp(`시작점: ${base.slice(0, 7)}`));
    assert.match(r.out, /meta\.baseSha/);
    assert.match(r.out, /버릴 커밋 \(1\)/);
    assert.match(r.out, /task work/);
    assert.match(r.out, /scratch\.txt/);
    assert.match(r.out, /--yes/);
    assert.deepEqual(state(dir), before, 'HEAD·작업 트리·ref 불변');
    assert.equal(await readFile(join(dir, '.harness/active.json'), 'utf8'), active);
  } finally { await rm(dir, { recursive: true, force: true }); }
});

test('clean --yes: backs up everything, resets to baseSha, keeps ignored files, clears active', async () => {
  const { dir, base } = await fixture();
  try {
    const oldHead = git(dir, 'rev-parse', 'HEAD');
    const r = await clean(dir, { yes: true });
    assert.equal(r.exitCode, 0, r.out);

    assert.equal(git(dir, 'rev-parse', 'HEAD'), base, 'HEAD = 시작점');
    assert.equal(git(dir, 'status', '--porcelain', '--untracked-files=all'), '', '작업 트리 깨끗');
    assert.equal(await readFile(join(dir, 'app.js'), 'utf8'), 'v1\n');
    assert.equal(await exists(join(dir, 'docs/chad/x')), false, 'task 폴더 제거');
    assert.equal(await exists(join(dir, 'scratch.txt')), false, 'untracked 제거');
    assert.equal(await readFile(join(dir, 'ignored.txt'), 'utf8'), 'keep me\n', 'ignored 는 살아남는다(-x 금지)');
    assert.equal(JSON.parse(await readFile(join(dir, '.harness/active.json'), 'utf8')), null);
    assert.match(await readFile(join(dir, 'docs/chad/chad-handoff.md'), 'utf8'), /cleaned/);

    const ref = git(dir, 'for-each-ref', '--format=%(refname)', 'refs/harness/trash/chad/x');
    assert.match(ref, /^refs\/harness\/trash\/chad\/x\/\d{8}T\d{9}Z$/);
    assert.equal(git(dir, 'rev-parse', `${ref}^`), oldHead, '백업 부모 = clean 직전 HEAD');
    assert.equal(git(dir, 'show', `${ref}:app.js`), 'v3-uncommitted', '미커밋 수정 포함');
    assert.equal(git(dir, 'show', `${ref}:scratch.txt`), 'untracked', 'untracked 포함');
    assert.match(git(dir, 'ls-tree', '-r', '--name-only', ref), /docs\/chad\/x\/x-spec\.md/);
    assert.doesNotMatch(git(dir, 'ls-tree', '-r', '--name-only', ref), /ignored\.txt/);
    assert.match(r.out, new RegExp(`restore: git reset --hard '${ref}\\^'`));

    // 안내된 복구 명령이 실제로 되살린다.
    git(dir, 'reset', '-q', '--hard', `${ref}^`);
    git(dir, 'restore', '--source', ref, '--worktree', '--', ':/');
    assert.equal(await readFile(join(dir, 'app.js'), 'utf8'), 'v3-uncommitted\n');
    assert.equal(await readFile(join(dir, 'scratch.txt'), 'utf8'), 'untracked\n');
    assert.equal(await exists(join(dir, 'docs/chad/x/x-spec.md')), true);
  } finally { await rm(dir, { recursive: true, force: true }); }
});

test('clean: refuses on the default branch and on a detached HEAD', async () => {
  const { dir } = await fixture();
  try {
    git(dir, 'add', '-A');
    git(dir, 'commit', '-q', '-m', 'wip');
    git(dir, 'switch', '-q', '--detach');
    let before = state(dir);
    let r = await clean(dir, { yes: true });
    assert.equal(r.exitCode, 1);
    assert.match(r.out, /detached HEAD/);
    assert.deepEqual(state(dir), before);

    git(dir, 'switch', '-q', 'main');
    git(dir, 'merge', '-q', '--ff-only', 'feat');
    before = state(dir);
    r = await clean(dir, { yes: true });
    assert.equal(r.exitCode, 1);
    assert.match(r.out, /기본 브랜치/);
    assert.deepEqual(state(dir), before);
  } finally { await rm(dir, { recursive: true, force: true }); }
});

async function editMeta(dir, fn) {
  const p = join(dir, 'docs/chad/x/x-meta.json');
  const meta = JSON.parse(await readFile(p, 'utf8'));
  await writeFile(p, JSON.stringify(fn(meta), null, 2) + '\n');
}

const PLAN_DONE = '# x — Plan\n\n## 단계\n- [x] 1. 구현\n- [x] 2. ship 완료\n';

// S5 (done-derive R10): 거부 기준은 "기본 브랜치에서 종결"이다 — ship 했지만 기본 브랜치에 없는 task 는 되돌린다.
test('clean (S5): ship 했지만 기본 브랜치에 없는 task 는 되돌리고, 기본 브랜치에서 종결된 task 는 거부한다', async () => {
  const { dir } = await fixture();
  try {
    await writeFile(join(dir, 'docs/chad/x/x-plan.md'), PLAN_DONE);
    git(dir, 'add', '-A');
    git(dir, 'commit', '-q', '-m', 'ship');
    let r = await clean(dir, { name: 'x' });
    assert.equal(r.exitCode, 0, `작업 트리에서 종결이어도 main 에 없으면 되돌릴 수 있다(MR 거절·폐기):\n${r.out}`);

    // 레거시 meta `status: done` 도 브랜치에만 있으면 거부하지 않는다.
    await editMeta(dir, m => ({ ...m, status: 'done', closedAt: '2026-11-17T00:00:00.000Z' }));
    git(dir, 'commit', '-q', '-am', 'legacy done on branch');
    r = await clean(dir, { name: 'x' });
    assert.equal(r.exitCode, 0, r.out);

    git(dir, 'update-ref', 'refs/heads/main', 'HEAD'); // 머지(origin 없음 → 로컬 기본 브랜치가 R)
    const before = state(dir);
    r = await clean(dir, { name: 'x', yes: true });
    assert.equal(r.exitCode, 1);
    assert.match(r.out, /기본 브랜치에서 종결된 task/);
    assert.match(r.out, /main 에서 이미 종결/);
    assert.deepEqual(state(dir), before);
  } finally { await rm(dir, { recursive: true, force: true }); }
});

test('clean: 원격 추적 기본 브랜치가 있으면 그것이 R 이다', async () => {
  const { dir } = await fixture();
  try {
    await writeFile(join(dir, 'docs/chad/x/x-plan.md'), PLAN_DONE);
    git(dir, 'commit', '-q', '-am', 'ship');
    git(dir, 'update-ref', 'refs/heads/main', 'HEAD'); // 로컬 main 은 R 이 아니다
    git(dir, 'update-ref', 'refs/remotes/origin/main', `${git(dir, 'rev-parse', 'HEAD')}~2`);
    let r = await clean(dir, { name: 'x' });
    assert.equal(r.exitCode, 0, `origin/main 에 아직 없다:\n${r.out}`);
    git(dir, 'update-ref', 'refs/remotes/origin/main', 'HEAD');
    r = await clean(dir, { name: 'x' });
    assert.equal(r.exitCode, 1);
    assert.match(r.out, /origin\/main 에서 이미 종결/);
  } finally { await rm(dir, { recursive: true, force: true }); }
});

// 재리뷰 P2(2026-11-19): 재개 MR 이 머지되기 전 R 의 종결은 이미 다시 연 옛 종결이다 — "기본 브랜치에서 종결"로 거부하지 않고
// 재개 task 규칙(`--base` 필요)으로 넘긴다. 문서가 재개 task 에 약속한 탈출구다.
test('clean: 재개 MR 머지 전의 재개 task 는 종결 거부가 아니라 --base 분기를 탄다', async () => {
  const { dir } = await fixture();
  try {
    await writeFile(join(dir, 'docs/chad/x/x-plan.md'), PLAN_DONE);
    git(dir, 'add', '-A');
    git(dir, 'commit', '-q', '-m', 'ship');
    git(dir, 'update-ref', 'refs/heads/main', 'HEAD'); // 머지
    git(dir, 'switch', '-q', '-c', 'fix');
    const reopened = await task(dir, 'x');
    assert.match(reopened.out, /reopened: chad\/x/);
    git(dir, 'add', '-A');
    git(dir, 'commit', '-q', '-m', 'reopen');

    let r = await clean(dir, { name: 'x' });
    assert.equal(r.exitCode, 1);
    assert.match(r.out, /재개된 task/);
    assert.doesNotMatch(r.out, /기본 브랜치에서 종결된 task/);
    r = await clean(dir, { name: 'x', base: 'main' });
    assert.equal(r.exitCode, 0, r.out);
  } finally { await rm(dir, { recursive: true, force: true }); }
});

test('clean: refuses a reopened task without --base', async () => {
  const { dir } = await fixture();
  try {
    await editMeta(dir, m => ({ ...m, status: 'open', closedAt: null, reopenedAt: '2026-11-17T01:00:00.000Z' }));
    let before = state(dir);
    let r = await clean(dir, { name: 'x', yes: true });
    assert.equal(r.exitCode, 1);
    assert.match(r.out, /재개된 task/);
    assert.deepEqual(state(dir), before);

    r = await clean(dir, { name: 'x', base: 'main' });
    assert.equal(r.exitCode, 0, '--base 를 주면 진행한다(dry-run)');
    assert.match(r.out, /--base/);
  } finally { await rm(dir, { recursive: true, force: true }); }
});

test('clean: refuses when the range touches another task folder', async () => {
  const { dir } = await fixture();
  try {
    await task(dir, 'other');
    await task(dir, 'x');
    const before = state(dir);
    const r = await clean(dir, { yes: true });
    assert.equal(r.exitCode, 1);
    assert.match(r.out, /다른 task/);
    assert.match(r.out, /docs\/chad\/other\//);
    assert.deepEqual(state(dir), before);
  } finally { await rm(dir, { recursive: true, force: true }); }
});

test('clean: an old task without baseSha falls back to the merge-base with the default branch', async () => {
  const { dir, base } = await fixture();
  try {
    await editMeta(dir, ({ baseSha, ...m }) => m);
    const r = await clean(dir, { yes: true });
    assert.equal(r.exitCode, 0, r.out);
    assert.match(r.out, /merge-base\(main, HEAD\)/);
    assert.equal(git(dir, 'rev-parse', 'HEAD'), base);
  } finally { await rm(dir, { recursive: true, force: true }); }
});

test('clean: refuses when baseSha is not an ancestor of HEAD', async () => {
  const { dir } = await fixture();
  try {
    await editMeta(dir, m => ({ ...m, baseSha: '0'.repeat(40) }));
    const before = state(dir);
    const r = await clean(dir, { yes: true });
    assert.equal(r.exitCode, 1);
    assert.match(r.out, /조상이 아님/);
    assert.match(r.out, /--base/);
    assert.deepEqual(state(dir), before);
  } finally { await rm(dir, { recursive: true, force: true }); }
});

test('clean: refuses outside git and without a target task', async () => {
  const plain = await mkdtemp(join(tmpdir(), 'harness-clean-plain-'));
  try {
    let r = await clean(plain);
    assert.equal(r.exitCode, 1);
    assert.match(r.out, /git 저장소가 아니/);

    git(plain, 'init', '-q', '-b', 'main');
    await writeFile(join(plain, 'a'), 'a');
    git(plain, 'add', '-A');
    git(plain, 'commit', '-q', '-m', 'a');
    git(plain, 'switch', '-q', '-c', 'feat');
    r = await clean(plain);
    assert.equal(r.exitCode, 1);
    assert.match(r.out, /대상 task 없음/);
    r = await clean(plain, { name: 'nope' });
    assert.equal(r.exitCode, 1);
    assert.match(r.out, /task 폴더 없음/);
  } finally { await rm(plain, { recursive: true, force: true }); }
});

test('clean: cleaning a non-active task leaves active.json alone', async () => {
  const { dir } = await fixture();
  try {
    git(dir, 'add', '-A');
    git(dir, 'commit', '-q', '-m', 'wip');
    await mkdir(join(dir, '.harness'), { recursive: true });
    await writeFile(join(dir, '.harness/active.json'), JSON.stringify({ user: 'chad', task: 'elsewhere' }));
    const r = await clean(dir, { name: 'x', member: 'chad', yes: true });
    assert.equal(r.exitCode, 0, r.out);
    assert.deepEqual(JSON.parse(await readFile(join(dir, '.harness/active.json'), 'utf8')), { user: 'chad', task: 'elsewhere' });
  } finally { await rm(dir, { recursive: true, force: true }); }
});

test('backupRefName: no colon, valid refname even for dotted names', () => {
  const ref = backupRefName('chad', '.v1.lock', new Date('2026-11-17T10:15:00.123Z'));
  assert.equal(ref, 'refs/harness/trash/chad/-v1-lock/20261117T101500123Z');
  execFileSync('git', ['check-ref-format', ref]);
});

// codex 리뷰(2026-11-17) P1: reset 이 `.gitignore` 를 되돌려 ignored 였던 파일이 `clean -fd` 대상이 되면 백업 없이 사라졌다.
test('clean --yes: an ignore rule added by the task does not turn its ignored file into a deletion', async () => {
  const { dir } = await fixture();
  try {
    await writeFile(join(dir, '.gitignore'), 'ignored.txt\n.harness/active.json\ndocs/*/*-handoff.md\nsecret.env\n');
    await writeFile(join(dir, 'secret.env'), 'TOKEN=1\n');
    git(dir, 'add', '-A');
    git(dir, 'commit', '-q', '-m', 'ignore secret');
    const r = await clean(dir, { yes: true });
    assert.equal(r.exitCode, 0, r.out);
    assert.equal(await readFile(join(dir, 'secret.env'), 'utf8'), 'TOKEN=1\n', 'ignored 였던 파일은 지우지 않는다');
    assert.equal(await exists(join(dir, 'scratch.txt')), false, 'untracked 는 여전히 지운다');
  } finally { await rm(dir, { recursive: true, force: true }); }
});

// P1 변형: 시작점이 추적하던 경로에 지금 ignored 파일이 있으면 reset --hard 가 덮어쓴다 — 그 내용은 백업에 있어야 한다.
test('clean --yes: an ignored file that reset overwrites is in the backup', async () => {
  const dir = await mkdtemp(join(tmpdir(), 'harness-clean-overwrite-'));
  try {
    git(dir, 'init', '-q', '-b', 'main');
    await writeFile(join(dir, 'conf.txt'), 'v1\n');
    await writeFile(join(dir, '.gitignore'), '.harness/active.json\n');
    git(dir, 'add', '-A');
    git(dir, 'commit', '-q', '-m', 'base');
    git(dir, 'switch', '-q', '-c', 'feat');
    await task(dir, 'x');
    git(dir, 'rm', '-q', '--cached', 'conf.txt');
    await writeFile(join(dir, '.gitignore'), '.harness/active.json\nconf.txt\n');
    git(dir, 'add', '-A');
    git(dir, 'commit', '-q', '-m', 'untrack conf');
    await writeFile(join(dir, 'conf.txt'), 'local secret\n');
    const r = await clean(dir, { yes: true });
    assert.equal(r.exitCode, 0, r.out);
    const ref = git(dir, 'for-each-ref', '--format=%(refname)', 'refs/harness/trash');
    assert.equal(git(dir, 'show', `${ref}:conf.txt`), 'local secret');
  } finally { await rm(dir, { recursive: true, force: true }); }
});

// P1: 백업을 HEAD 에서 만들면 `git add -f` 한 ignored 신규 파일과 스테이지에만 있는 내용이 빠졌다.
test('clean --yes: the backup keeps force-added files and the staged content', async () => {
  const { dir } = await fixture();
  try {
    await writeFile(join(dir, 'ignored.txt'), 'forced\n');
    git(dir, 'add', '-f', 'ignored.txt');
    await writeFile(join(dir, 'app.js'), 'staged\n');
    git(dir, 'add', 'app.js');
    await writeFile(join(dir, 'app.js'), 'worktree\n');
    const r = await clean(dir, { yes: true });
    assert.equal(r.exitCode, 0, r.out);
    const ref = git(dir, 'for-each-ref', '--format=%(refname)', 'refs/harness/trash');
    assert.equal(git(dir, 'show', `${ref}:ignored.txt`), 'forced');
    assert.equal(git(dir, 'show', `${ref}:app.js`), 'worktree');
    assert.equal(git(dir, 'show', `${ref}^2:app.js`), 'staged', '두 번째 부모 = 인덱스');
    assert.match(r.out, /\^2/);
  } finally { await rm(dir, { recursive: true, force: true }); }
});

// P2: 커밋된 rename 은 `--name-only` 에서 목적지만 남아 다른 task 파일을 밖으로 옮기면 가드를 통과했다.
test('clean: moving another task file out of its folder is still caught', async () => {
  const dir = await mkdtemp(join(tmpdir(), 'harness-clean-rename-'));
  try {
    git(dir, 'init', '-q', '-b', 'main');
    await writeFile(join(dir, '.gitignore'), '.harness/active.json\ndocs/*/*-handoff.md\n');
    await task(dir, 'other');
    git(dir, 'add', '-A');
    git(dir, 'commit', '-q', '-m', 'base with other');
    git(dir, 'switch', '-q', '-c', 'feat');
    await task(dir, 'x');
    git(dir, 'mv', 'docs/chad/other/other-plan.md', 'moved.md');
    git(dir, 'add', '-A');
    git(dir, 'commit', '-q', '-m', 'move');
    const r = await clean(dir, { yes: true });
    assert.equal(r.exitCode, 1, r.out);
    assert.match(r.out, /docs\/chad\/other\/other-plan\.md/);
  } finally { await rm(dir, { recursive: true, force: true }); }
});

// P2: reset 은 저장소 전체에 걸리므로 다른 하네스 루트(모노레포의 `pkg/docs/...`)의 task 도 지킨다.
test('clean: a task folder under another docs root is protected too', async () => {
  const { dir } = await fixture();
  try {
    await mkdir(join(dir, 'pkg/docs/chad/y'), { recursive: true });
    await writeFile(join(dir, 'pkg/docs/chad/y/y-spec.md'), '# y\n');
    const r = await clean(dir, { yes: true });
    assert.equal(r.exitCode, 1, r.out);
    assert.match(r.out, /pkg\/docs\/chad\/y\/y-spec\.md/);
  } finally { await rm(dir, { recursive: true, force: true }); }
});

// P2: meta 없는 구 task 는 기본 브랜치의 원장으로 종결을 읽는다 — 재개 판정과 같은 함수(closedAtRef).
test('clean: refuses a legacy task the ledger already marks done', async () => {
  const { dir } = await fixture();
  try {
    await rm(join(dir, 'docs/chad/x/x-meta.json'));
    await writeFile(join(dir, 'docs/task_summary.md'), '# Task Summary\n\n| User | Task | Status | Created |\n|------|------|--------|---------|\n| chad | x | ✅ done | 2026-11-17 |\n');
    git(dir, 'add', '-A');
    git(dir, 'commit', '-q', '-m', 'legacy close');
    git(dir, 'update-ref', 'refs/heads/main', 'HEAD'); // 기본 브랜치(R)의 원장이 종결을 기록한다
    const r = await clean(dir, { yes: true });
    assert.equal(r.exitCode, 1, r.out);
    assert.match(r.out, /기본 브랜치에서 종결된 task/);
  } finally { await rm(dir, { recursive: true, force: true }); }
});

// codex 2차 리뷰 P1: 시작점이 `cache` 를 저장소 밖을 가리키는 symlink 로 되돌리면, untracked `cache/note.txt` 삭제가
// 링크를 따라가 저장소 밖 파일을 지웠다.
test('clean --yes: deleting untracked files never follows a symlink out of the repo', async () => {
  const dir = await mkdtemp(join(tmpdir(), 'harness-clean-symlink-'));
  const ext = await mkdtemp(join(tmpdir(), 'harness-clean-ext-'));
  try {
    await writeFile(join(ext, 'note.txt'), 'external\n');
    git(dir, 'init', '-q', '-b', 'main');
    await writeFile(join(dir, '.gitignore'), '.harness/active.json\n');
    execFileSync('ln', ['-s', ext, join(dir, 'cache')]);
    git(dir, 'add', '-A');
    git(dir, 'commit', '-q', '-m', 'base with symlink');
    git(dir, 'switch', '-q', '-c', 'feat');
    await task(dir, 'x');
    git(dir, 'rm', '-q', 'cache');
    git(dir, 'commit', '-q', '-m', 'drop link');
    await mkdir(join(dir, 'cache'));
    await writeFile(join(dir, 'cache/note.txt'), 'inside\n');
    const r = await clean(dir, { yes: true });
    assert.equal(r.exitCode, 0, r.out);
    assert.equal(await readFile(join(ext, 'note.txt'), 'utf8'), 'external\n', '저장소 밖 파일은 그대로');
  } finally {
    await rm(dir, { recursive: true, force: true });
    await rm(ext, { recursive: true, force: true });
  }
});

// 2차 P1: 시작점이 `cache/config.json` 을 추적하는데 지금 `cache` 가 ignored **파일**이면 하위 경로 존재 검사로는 못 잡는다.
test('clean --yes: an ignored file where the anchor has a directory is in the backup', async () => {
  const dir = await mkdtemp(join(tmpdir(), 'harness-clean-dirfile-'));
  try {
    git(dir, 'init', '-q', '-b', 'main');
    await writeFile(join(dir, '.gitignore'), '.harness/active.json\n');
    await mkdir(join(dir, 'cache'));
    await writeFile(join(dir, 'cache/config.json'), '{}\n');
    git(dir, 'add', '-A');
    git(dir, 'commit', '-q', '-m', 'base');
    git(dir, 'switch', '-q', '-c', 'feat');
    await task(dir, 'x');
    git(dir, 'rm', '-q', '-r', 'cache');
    await writeFile(join(dir, '.gitignore'), '.harness/active.json\ncache\n');
    git(dir, 'add', '-A');
    git(dir, 'commit', '-q', '-m', 'cache becomes ignored');
    await writeFile(join(dir, 'cache'), 'secret\n');
    const r = await clean(dir, { yes: true });
    assert.equal(r.exitCode, 0, r.out);
    const ref = git(dir, 'for-each-ref', '--format=%(refname)', 'refs/harness/trash');
    assert.equal(git(dir, 'show', `${ref}:cache`), 'secret');
  } finally { await rm(dir, { recursive: true, force: true }); }
});

// 2차 P1: 복사한 인덱스의 assume-unchanged 플래그 때문에 `add -A` 가 로컬 수정을 백업하지 않았다.
test('clean --yes: local edits under assume-unchanged are in the backup', async () => {
  const { dir } = await fixture();
  try {
    git(dir, 'update-index', '--assume-unchanged', 'app.js');
    const r = await clean(dir, { yes: true });
    assert.equal(r.exitCode, 0, r.out);
    const ref = git(dir, 'for-each-ref', '--format=%(refname)', 'refs/harness/trash');
    assert.equal(git(dir, 'show', `${ref}:app.js`), 'v3-uncommitted');
  } finally { await rm(dir, { recursive: true, force: true }); }
});

// codex 3차 P1: 시작점이 user handoff 를 저장소 밖을 가리키는 symlink 로 되돌리면 handoff 쓰기가 링크를 따라가 밖의 파일을 덮었다.
test('clean --yes: does not write the user handoff through a symlink', async () => {
  const dir = await mkdtemp(join(tmpdir(), 'harness-clean-hsym-'));
  const ext = await mkdtemp(join(tmpdir(), 'harness-clean-hext-'));
  try {
    await writeFile(join(ext, 'target.md'), 'external\n');
    git(dir, 'init', '-q', '-b', 'main');
    await writeFile(join(dir, '.gitignore'), '.harness/active.json\n');
    await mkdir(join(dir, 'docs/chad'), { recursive: true });
    execFileSync('ln', ['-s', join(ext, 'target.md'), join(dir, 'docs/chad/chad-handoff.md')]);
    git(dir, 'add', '-A');
    git(dir, 'commit', '-q', '-m', 'base with handoff link');
    git(dir, 'switch', '-q', '-c', 'feat');
    git(dir, 'rm', '-q', '--cached', 'docs/chad/chad-handoff.md');
    await rm(join(dir, 'docs/chad/chad-handoff.md'));
    await task(dir, 'x');
    git(dir, 'add', '-A');
    git(dir, 'commit', '-q', '-m', 'drop link during task');
    const r = await clean(dir, { yes: true });
    assert.equal(r.exitCode, 0, r.out);
    assert.equal(await readFile(join(ext, 'target.md'), 'utf8'), 'external\n');
  } finally {
    await rm(dir, { recursive: true, force: true });
    await rm(ext, { recursive: true, force: true });
  }
});

// 3차 P2: assume-unchanged 로 가려진 다른 task 의 수정은 status 에 안 보여 가드를 통과했다.
test('clean: another task edit hidden by assume-unchanged is still refused', async () => {
  const dir = await mkdtemp(join(tmpdir(), 'harness-clean-hidden-'));
  try {
    git(dir, 'init', '-q', '-b', 'main');
    await writeFile(join(dir, '.gitignore'), '.harness/active.json\ndocs/*/*-handoff.md\n');
    await task(dir, 'other');
    git(dir, 'add', '-A');
    git(dir, 'commit', '-q', '-m', 'base with other');
    git(dir, 'switch', '-q', '-c', 'feat');
    await task(dir, 'x');
    git(dir, 'update-index', '--assume-unchanged', 'docs/chad/other/other-plan.md');
    await writeFile(join(dir, 'docs/chad/other/other-plan.md'), 'edited\n');
    const r = await clean(dir, { yes: true });
    assert.equal(r.exitCode, 1, r.out);
    assert.match(r.out, /other-plan\.md/);
  } finally { await rm(dir, { recursive: true, force: true }); }
});

// 3차 P2: 다른 하네스 루트의 task 는 정해진 파일 이름만 지켰다 — 폴더 안 어떤 파일이든 지킨다.
test('clean: any file in a task folder under another docs root is protected', async () => {
  const dir = await mkdtemp(join(tmpdir(), 'harness-clean-root2-'));
  try {
    git(dir, 'init', '-q', '-b', 'main');
    await writeFile(join(dir, '.gitignore'), '.harness/active.json\ndocs/*/*-handoff.md\n');
    await mkdir(join(dir, 'pkg/docs/chad/y'), { recursive: true });
    await writeFile(join(dir, 'pkg/docs/chad/y/y-spec.md'), '# y\n');
    await writeFile(join(dir, 'pkg/docs/chad/y/y-context.md'), 'v1\n');
    git(dir, 'add', '-A');
    git(dir, 'commit', '-q', '-m', 'base');
    git(dir, 'switch', '-q', '-c', 'feat');
    await task(dir, 'x');
    await writeFile(join(dir, 'pkg/docs/chad/y/y-context.md'), 'v2\n');
    const r = await clean(dir, { yes: true });
    assert.equal(r.exitCode, 1, r.out);
    assert.match(r.out, /pkg\/docs\/chad\/y\/y-context\.md/);
  } finally { await rm(dir, { recursive: true, force: true }); }
});

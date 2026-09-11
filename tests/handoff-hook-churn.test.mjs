// post-commit 훅(`runHandoffAuto`)이 **핸드오프 파일만** 바꾼 커밋에 침묵하는지 고정한다.
//
// 왜 필요한가: 훅은 커밋 *뒤에* 두 핸드오프 파일을 쓰므로 커밋 직후 트리는 항상 dirty다. 그 churn을
// 쓸어 담는 커밋이 다시 훅을 돌려 새 항목을 만들면 루프가 끝나지 않는다 — 0.38.0 릴리스에서 훅을
// 세 번 비켜 놓고 커밋해야 했던 이유다. sweep 커밋에서 침묵하면 루프는 한 번에 끝난다.
//
// 훅 자체(셸 스크립트)는 전역 `harness-team`(마켓플레이스 clone)을 부르므로 커밋해서 관찰하지 않는다.
// 여기서는 `runHandoffAuto`를 직접 부른다 — 실제 훅이 하는 일과 같은 함수다.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { mkdtemp, mkdir, writeFile, readFile, rm } from 'node:fs/promises';
import { join } from 'node:path';
import { tmpdir } from 'node:os';
import { execFile } from 'node:child_process';
import { promisify } from 'node:util';
import { runHandoffAuto, handoffRelPaths } from '../src/commands/task.mjs';

const pexec = promisify(execFile);
const git = (dir, ...args) => pexec('git', ['-C', dir, ...args]);
const USER = 'tester';
const TASK = 'demo';

async function makeRepo() {
  const dir = await mkdtemp(join(tmpdir(), 'harness-churn-'));
  await git(dir, 'init', '-q', '-b', 'main');
  await git(dir, 'config', 'user.email', 't@e.com');
  await git(dir, 'config', 'user.name', 't');
  await mkdir(join(dir, '.harness'), { recursive: true });
  await writeFile(join(dir, '.gitignore'), '.harness/\n');
  await writeFile(join(dir, '.harness/active.json'), JSON.stringify({ user: USER, task: TASK, path: `docs/${USER}/${TASK}` }));
  await mkdir(join(dir, 'docs', USER, TASK), { recursive: true });
  await writeFile(join(dir, 'docs', USER, `${USER}-handoff.md`), '# Session Handoff\n');
  await writeFile(join(dir, 'docs', USER, TASK, `${TASK}-handoff.md`), `# ${TASK} — Handoff\n`);
  await writeFile(join(dir, 'src.txt'), 'v1\n');
  await git(dir, 'add', '-A');
  await git(dir, 'commit', '-qm', 'base');
  return dir;
}

const paths = (dir) => ({
  taskHandoff: join(dir, 'docs', USER, TASK, `${TASK}-handoff.md`),
  userHandoff: join(dir, 'docs', USER, `${USER}-handoff.md`),
});

async function snapshot(dir) {
  const p = paths(dir);
  return {
    task: await readFile(p.taskHandoff, 'utf8'),
    user: await readFile(p.userHandoff, 'utf8'),
  };
}

test('핸드오프 파일만 바꾼 커밋(sweep) → 훅이 아무것도 쓰지 않는다', async () => {
  const dir = await makeRepo();
  try {
    // 실제 작업 커밋 뒤의 churn을 재현: 훅이 쓴 상태 그대로 커밋한다.
    await writeFile(paths(dir).taskHandoff, `# ${TASK} — Handoff\n\n## 2026-09-11T00:00:00.000Z — abc1234 real work\n`);
    await writeFile(paths(dir).userHandoff, '# Session Handoff\n\n## Active Task\ndemo\n');
    await git(dir, 'add', '-A');
    await git(dir, 'commit', '-qm', 'chore(docs): post-commit handoff 갱신');

    const before = await snapshot(dir);
    await runHandoffAuto({ targetDir: dir });
    assert.deepEqual(await snapshot(dir), before, '두 파일 모두 바이트 단위로 불변 — 루프가 여기서 끝난다');

    const { stdout } = await git(dir, 'status', '--porcelain');
    assert.equal(stdout.trim(), '', 'sweep 커밋 뒤 트리가 깨끗하다');
  } finally { await rm(dir, { recursive: true, force: true }); }
});

test('소스가 함께 바뀐 커밋 → 종전대로 기록한다', async () => {
  const dir = await makeRepo();
  try {
    await writeFile(join(dir, 'src.txt'), 'v2\n');
    // 핸드오프도 **실제로 바꾼다** — baseline 과 같은 내용을 쓰면 커밋에는 소스만 들어가고,
    // `paths.some(handoff) → skip` 같은 잘못된 구현도 이 테스트를 통과한다 (2026-09-11 codex P2).
    await writeFile(paths(dir).taskHandoff, `# ${TASK} — Handoff\n\n## 2026-09-11T00:00:00.000Z — prev churn\n`);
    await git(dir, 'add', '-A');
    await git(dir, 'commit', '-qm', 'feat: real work');
    const { stdout: committed } = await git(dir, 'diff-tree', '--no-commit-id', '--name-only', '-r', 'HEAD');
    assert.equal(committed.trim().split('\n').sort().join(','), `docs/${USER}/${TASK}/${TASK}-handoff.md,src.txt`,
      '전제: 이 커밋은 핸드오프와 소스를 **함께** 담는다');

    await runHandoffAuto({ targetDir: dir });
    const after = await snapshot(dir);
    assert.match(after.task, /## \d{4}-\d\d-\d\dT.* — \w+ feat: real work/, '작업 커밋은 기록된다');
    assert.match(after.user, /## Active Task\n+demo\n/, '사용자 handoff 도 활성 형태로 갱신된다');
    assert.match(after.user, /## Last Commit \(\d{4}-\d\d-\d\d\)\n\w+ feat: real work/, '최신 커밋을 가리킨다');
  } finally { await rm(dir, { recursive: true, force: true }); }
});

test('병합 커밋 → 경로 목록이 비어도 건너뛰지 않는다 (기록에서 사라지면 안 된다)', async () => {
  // `diff-tree --name-only`·`show --name-only` 는 병합 커밋에 아무 경로도 내지 않는다 —
  // "경로가 비었다"를 "바뀐 게 핸드오프뿐"으로 읽으면 병합이 조용히 누락된다.
  const dir = await makeRepo();
  try {
    await git(dir, 'checkout', '-qb', 'feat');
    await writeFile(join(dir, 'feature.txt'), 'f\n');
    await git(dir, 'add', '-A');
    await git(dir, 'commit', '-qm', 'feat: branch work');
    await git(dir, 'checkout', '-q', 'main');
    await git(dir, 'merge', '--no-ff', '-q', 'feat', '-m', 'merge feat');

    const { stdout } = await git(dir, 'diff-tree', '--no-commit-id', '--name-only', '-r', 'HEAD');
    assert.equal(stdout.trim(), '', '전제: 병합은 경로를 내지 않는다');

    await runHandoffAuto({ targetDir: dir });
    assert.match((await snapshot(dir)).task, /merge feat/, '병합도 기록된다');
  } finally { await rm(dir, { recursive: true, force: true }); }
});

test('빈 커밋 → 종전대로 기록한다 (동작 불변)', async () => {
  const dir = await makeRepo();
  try {
    await git(dir, 'commit', '-q', '--allow-empty', '-m', 'chore: trigger ci');
    await runHandoffAuto({ targetDir: dir });
    assert.match((await snapshot(dir)).task, /chore: trigger ci/);
  } finally { await rm(dir, { recursive: true, force: true }); }
});

test('git 이 아닌 디렉터리 → 판정 불가를 건너뜀으로 바꾸지 않는다', async () => {
  const dir = await mkdtemp(join(tmpdir(), 'harness-churn-nogit-'));
  try {
    await mkdir(join(dir, '.harness'), { recursive: true });
    await writeFile(join(dir, '.harness/active.json'), JSON.stringify({ user: USER, task: TASK, path: `docs/${USER}/${TASK}` }));
    await mkdir(join(dir, 'docs', USER, TASK), { recursive: true });
    await writeFile(join(dir, 'docs', USER, TASK, `${TASK}-handoff.md`), `# ${TASK} — Handoff\n`);
    await writeFile(join(dir, 'docs', USER, `${USER}-handoff.md`), '# Session Handoff\n');
    await runHandoffAuto({ targetDir: dir });
    assert.match(await readFile(join(dir, 'docs', USER, TASK, `${TASK}-handoff.md`), 'utf8'), /## \d{4}-/, '기록한다');
  } finally { await rm(dir, { recursive: true, force: true }); }
});

test('훅과 done 가드가 같은 경로 함수를 쓴다 — 리터럴 재복제를 막는다', async () => {
  assert.deepEqual([...handoffRelPaths('u', 't')].sort(), ['docs/u/t/t-handoff.md', 'docs/u/u-handoff.md']);
  // 값만 검사하면 한쪽이 리터럴로 되돌아가도 통과한다 — churn 이 조용히 되살아나는 경로가 정확히 그것이다.
  // 그래서 호출처 수를 소스에서 센다(정의 1 + 훅 1 + 가드 1 = 3회 이상 등장).
  const src = await readFile(new URL('../src/commands/task.mjs', import.meta.url), 'utf8');
  assert.ok(src.split('handoffRelPaths(').length - 1 >= 3,
    'handoffRelPaths 가 정의 외에 최소 두 곳(훅·가드)에서 호출되어야 한다');
});

test('submodule.<name>.ignore=all + handoff 커밋 → sweep 으로 오인하지 않는다', async (t) => {
  // `submodule.<name>.ignore=all` 이면 gitlink 변경이 `diff-tree --name-only` 에서 사라진다(실측).
  // `--ignore-submodules=none` 이 없으면 이 커밋은 "핸드오프만 바뀐 커밋"으로 보여 기록이 통째로 누락된다.
  const root = await mkdtemp(join(tmpdir(), 'harness-churn-sub-'));
  let dir = null;
  try {
    // --- 픽스처 (실패하면 건너뛴다: 샌드박스·git 설정이 file 프로토콜 submodule 을 막을 수 있다) ---
    const origin = join(root, 'origin');
    await mkdir(origin, { recursive: true });
    await git(origin, 'init', '-q', '-b', 'main');
    await git(origin, 'config', 'user.email', 't@e.com');
    await git(origin, 'config', 'user.name', 't');
    await writeFile(join(origin, 'x.txt'), 'x\n');
    await git(origin, 'add', '-A'); await git(origin, 'commit', '-qm', 's1');

    dir = await makeRepo();
    await pexec('git', ['-C', dir, '-c', 'protocol.file.allow=always', 'submodule', 'add', '-q', origin, 'sub']);
    await git(dir, 'add', '-A'); await git(dir, 'commit', '-qm', 'add submodule');

    // gitlink 를 실제로 움직인다 — **부모 안의 체크아웃**(dir/sub)에서 커밋해야 포인터가 바뀐다.
    const inner = join(dir, 'sub');
    await git(inner, 'config', 'user.email', 't@e.com');
    await git(inner, 'config', 'user.name', 't');
    await writeFile(join(inner, 'y.txt'), 'y\n');
    await git(inner, 'add', '-A'); await git(inner, 'commit', '-qm', 's2');
    await git(dir, 'config', 'submodule.sub.ignore', 'all');
    await writeFile(paths(dir).taskHandoff, `# ${TASK} — Handoff\n\n## prev churn\n`);
    await git(dir, 'add', 'sub', paths(dir).taskHandoff);
    await git(dir, 'commit', '-qm', 'chore: bump submodule + handoff');
  } catch (err) {
    // pass 로 기록되면 "이 환경에서는 검증하지 못했다"가 초록에 묻힌다 — skip 으로 남긴다.
    if (dir) await rm(dir, { recursive: true, force: true });
    await rm(root, { recursive: true, force: true });
    t.skip(`submodule 픽스처를 만들 수 없음 (${err.code || err.message})`);
    return;
  }

  // --- 단언은 catch 밖에 둔다: 실패를 "픽스처 문제"로 삼켜 초록으로 만들지 않는다 ---
  try {
    const { stdout: visible } = await git(dir, 'diff-tree', '--no-commit-id', '--name-only', '-r', 'HEAD');
    assert.ok(!visible.split('\n').includes('sub'), '전제: ignore=all 이면 gitlink 가 숨는다');
    const { stdout: withFlag } = await git(dir, 'diff-tree', '--no-commit-id', '--name-only', '--ignore-submodules=none', '-r', 'HEAD');
    assert.ok(withFlag.split('\n').includes('sub'), '전제: 플래그를 주면 보인다');

    await runHandoffAuto({ targetDir: dir });
    assert.match((await snapshot(dir)).task, /bump submodule/, 'gitlink 변경이 숨겨져도 기록한다');
  } finally {
    await rm(dir, { recursive: true, force: true });
    await rm(root, { recursive: true, force: true });
  }
});

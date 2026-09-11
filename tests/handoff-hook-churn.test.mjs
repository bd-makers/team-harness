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

// --- 0.38.2: `git commit --amend` 가 남기던 고아 항목 ---

const entryCount = (text) => [...text.matchAll(/^## \d{4}-\d\d-\d\dT/gm)].length;
const shasIn = (text) => [...text.matchAll(/^## \d{4}-\d\d-\d\dT[^\n]*—\s+([0-9a-f]{7,40})\b/gm)].map(m => m[1]);

test('amend → 마지막 항목을 교체한다 (없는 커밋을 가리키는 고아 항목을 남기지 않는다)', async () => {
  const dir = await makeRepo();
  try {
    await writeFile(join(dir, 'src.txt'), 'v2\n');
    await git(dir, 'add', '-A'); await git(dir, 'commit', '-qm', 'feat: work');
    await runHandoffAuto({ targetDir: dir });
    const before = await snapshot(dir);
    assert.equal(entryCount(before.task), 1);
    const [oldSha] = shasIn(before.task);

    await writeFile(join(dir, 'src.txt'), 'v3\n');
    await git(dir, 'add', '-A'); await git(dir, 'commit', '-q', '--amend', '-m', 'feat: work (amended)');
    await runHandoffAuto({ targetDir: dir });

    const after = await snapshot(dir);
    assert.equal(entryCount(after.task), 1, '항목이 둘로 늘지 않는다');
    assert.match(after.task, /feat: work \(amended\)/);
    const [newSha] = shasIn(after.task);
    assert.notEqual(newSha, oldSha, '새 sha 로 교체됐다');
    // 남은 sha 는 실제 이력에 있어야 한다 — 고아 항목이 아니라는 증거.
    await git(dir, 'merge-base', '--is-ancestor', newSha, 'HEAD');
  } finally { await rm(dir, { recursive: true, force: true }); }
});

test('일반 커밋 연속 → 교체하지 않고 쌓인다', async () => {
  const dir = await makeRepo();
  try {
    for (const v of ['v2', 'v3']) {
      await writeFile(join(dir, 'src.txt'), `${v}\n`);
      await git(dir, 'add', '-A'); await git(dir, 'commit', '-qm', `feat: ${v}`);
      await runHandoffAuto({ targetDir: dir });
    }
    assert.equal(entryCount((await snapshot(dir)).task), 2, 'amend 가 아니면 append');
  } finally { await rm(dir, { recursive: true, force: true }); }
});

test('훅이 직전 커밋을 건너뛴 뒤의 amend → 더 이전의 진짜 항목을 지우지 않는다', async () => {
  // 조건 2(마지막 항목의 sha 가 `HEAD@{1}` 과 같다)가 없으면 여기서 진짜 항목이 사라진다.
  // sweep 커밋을 amend 하면서 **실제 소스 변경을 함께 넣는** 경우가 그 자리다 —
  // amend 된 커밋은 더 이상 handoff-only 가 아니라 skip 을 통과해 amend 경로로 들어온다.
  const dir = await makeRepo();
  try {
    await writeFile(join(dir, 'src.txt'), 'v2\n');
    await git(dir, 'add', '-A'); await git(dir, 'commit', '-qm', 'feat: real work');
    await runHandoffAuto({ targetDir: dir });          // 진짜 항목 1건
    const realSha = shasIn((await snapshot(dir)).task)[0];

    // sweep 커밋(핸드오프만) → 훅은 침묵한다
    await git(dir, 'add', '-A'); await git(dir, 'commit', '-qm', 'chore: sweep handoff');
    await runHandoffAuto({ targetDir: dir });
    assert.equal(entryCount((await snapshot(dir)).task), 1, '전제: sweep 은 기록되지 않는다');

    // 그 커밋을 amend 하며 소스를 넣는다 → skip 을 통과하고, 마지막 항목은 여전히 **살아 있는** 커밋을 가리킨다
    await writeFile(join(dir, 'src.txt'), 'v3\n');
    await git(dir, 'add', '-A');
    await git(dir, 'commit', '-q', '--amend', '-m', 'feat: folded into sweep');
    await runHandoffAuto({ targetDir: dir });

    const after = await snapshot(dir);
    assert.ok(shasIn(after.task).includes(realSha), '진짜 항목이 살아남는다');
    assert.equal(entryCount(after.task), 2, '새 항목은 append 된다 (교체가 아니다)');
  } finally { await rm(dir, { recursive: true, force: true }); }
});

test('병합 커밋의 amend 도 교체된다 — 병합은 append, 그 amend 는 교체', async () => {
  const dir = await makeRepo();
  try {
    await git(dir, 'checkout', '-qb', 'feat');
    await writeFile(join(dir, 'feature.txt'), 'f\n');
    await git(dir, 'add', '-A'); await git(dir, 'commit', '-qm', 'feat: branch');
    await git(dir, 'checkout', '-q', 'main');
    await git(dir, 'merge', '--no-ff', '-q', 'feat', '-m', 'merge feat');
    await runHandoffAuto({ targetDir: dir });
    assert.equal(entryCount((await snapshot(dir)).task), 1);

    await git(dir, 'commit', '-q', '--amend', '-m', 'merge feat (amended)');
    await runHandoffAuto({ targetDir: dir });
    const after = await snapshot(dir);
    assert.equal(entryCount(after.task), 1, '병합의 amend 도 항목을 늘리지 않는다');
    assert.match(after.task, /merge feat \(amended\)/);
  } finally { await rm(dir, { recursive: true, force: true }); }
});

test('판정 불가(reflog 실패)는 append 로 degrade — 잃는 쪽으로 틀리지 않는다', async () => {
  const { amendCutPoint } = await import('../src/commands/task.mjs');
  const content = '# demo — Handoff\n\n## 2026-09-11T00:00:00.000Z — abc1234 work\n';
  const boom = async () => { throw new Error('no reflog'); };
  assert.equal(await amendCutPoint('/nonexistent', content, { git: boom }), null);
  // amend 지만 항목 형식이 다르면(sha 없음) 판정하지 않는다
  const amendOnly = async (...a) => (a[0] === 'reflog' ? { stdout: 'commit (amend): x\n' } : { stdout: '' });
  assert.equal(await amendCutPoint('/nonexistent', '# demo\n\n## 2026-09-11T00:00:00.000Z — (no sha)\n', { git: amendOnly }), null);
  // rev-parse 실패(HEAD@{1} 없음)도 append 로 degrade
  const revParseFails = async (...a) => {
    if (a[0] === 'reflog') return { stdout: 'commit (amend): x\n' };
    throw new Error('unknown revision');
  };
  assert.equal(await amendCutPoint('/nonexistent', content, { git: revParseFails }), null);
});

test('P1: 브랜치 전환 뒤의 amend → 다른 브랜치에 살아 있는 커밋의 항목을 지우지 않는다', async () => {
  // "HEAD 의 조상이 아니다" 로 판정하면 여기서 main 의 진짜 항목이 사라진다.
  // `HEAD@{1}`(amend 직전 HEAD)과의 **정확한 동일성**만 교체 근거로 쓴다.
  const dir = await makeRepo();
  try {
    await writeFile(join(dir, 'src.txt'), 'main-work\n');
    await git(dir, 'add', '-A'); await git(dir, 'commit', '-qm', 'feat: main work');
    await runHandoffAuto({ targetDir: dir });
    const mainSha = shasIn((await snapshot(dir)).task)[0];

    // 다른 브랜치에서 커밋하고 amend — 마지막 항목(main 의 커밋)은 이 HEAD 의 조상이 아니다
    await git(dir, 'checkout', '-qb', 'side', 'HEAD~1');
    await writeFile(join(dir, 'side.txt'), 's\n');
    await git(dir, 'add', '-A'); await git(dir, 'commit', '-qm', 'feat: side');
    await git(dir, 'commit', '-q', '--amend', '-m', 'feat: side (amended)');
    await runHandoffAuto({ targetDir: dir });

    const after = await snapshot(dir);
    assert.ok(shasIn(after.task).includes(mainSha), 'main 브랜치 커밋의 항목이 살아남는다');
    assert.equal(entryCount(after.task), 2, '새 항목은 append 된다');
  } finally { await rm(dir, { recursive: true, force: true }); }
});

test('교체 경로도 append 경로와 같은 빈 줄 구분을 유지한다', async () => {
  const dir = await makeRepo();
  try {
    await writeFile(join(dir, 'src.txt'), 'v2\n');
    await git(dir, 'add', '-A'); await git(dir, 'commit', '-qm', 'feat: one');
    await runHandoffAuto({ targetDir: dir });
    await writeFile(join(dir, 'src.txt'), 'v3\n');
    await git(dir, 'add', '-A'); await git(dir, 'commit', '-qm', 'feat: two');
    await runHandoffAuto({ targetDir: dir });           // append 로 2건
    const appended = (await snapshot(dir)).task;

    await git(dir, 'commit', '-q', '--amend', '-m', 'feat: two amended');
    await runHandoffAuto({ targetDir: dir });           // 교체
    const replaced = (await snapshot(dir)).task;

    const sep = t => t.slice(0, t.lastIndexOf('\n## ') + 1).slice(-2);
    assert.equal(sep(replaced), sep(appended), '마지막 항목 앞의 개행 모양이 같다');
    assert.doesNotMatch(replaced, /\n\n$/, 'EOF 에 빈 줄을 남기지 않는다 (git diff --check)');
  } finally { await rm(dir, { recursive: true, force: true }); }
});

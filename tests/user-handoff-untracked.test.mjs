// `docs/<user>/<user>-handoff.md` 는 **워크트리 로컬 렌더링**이다 — 내용이 전부 gitignore 된 `.harness/active.json`
// 과 그 워크트리의 `git log -1` 에서 나온다. 추적하던 시절에는 같은 user 의 병렬 PR 이 머지될 때마다 이 파일에서
// 반드시 충돌했다(3323c6f·fdcffbc·a7c8354). 여기서는 추적 해제 이후의 계약을 고정한다:
//   - init 이 쓰는 .gitignore 가 깊이 2 의 user handoff 만 무시하고 task handoff 는 추적한다
//   - 병렬 브랜치가 각자 커밋·sweep 한 뒤 머지해도 충돌하지 않는다
//   - sweep(#105)·done 가드(#109)가 무시 파일을 "훅 출력" 으로 올바로 다룬다
//   - task 활성화가 user handoff 를 곧바로 써서 새 워크트리에 공백이 없다
//   - 아직 추적 중인 저장소는 doctor 가 경고하고 migrate 는 인덱스를 건드리지 않고 안내만 한다
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { mkdtemp, mkdir, writeFile, readFile, rm } from 'node:fs/promises';
import { join } from 'node:path';
import { tmpdir } from 'node:os';
import { execFile } from 'node:child_process';
import { promisify } from 'node:util';
import {
  runTask, runHandoffAuto, runDone, taskArtifactTemplate, trackedUserHandoffs,
} from '../src/commands/task.mjs';
import { USER_HANDOFF_IGNORE } from '../src/task-paths.mjs';
import { appendGitignore } from '../src/harness.mjs';
import { checkTrackedUserHandoffs } from '../src/commands/doctor.mjs';
import { migrateUserHandoffUntrack } from '../src/commands/migrate.mjs';

const pexec = promisify(execFile);
const git = (dir, ...args) => pexec('git', ['-C', dir, ...args]);
const USER = 'tester';
const noRemote = async () => null;

function quiet() {
  const logs = [];
  const orig = console.log;
  console.log = (...a) => logs.push(a.join(' '));
  return { logs, restore: () => { console.log = orig; } };
}

async function makeRepo() {
  const dir = await mkdtemp(join(tmpdir(), 'harness-uh-'));
  await git(dir, 'init', '-q', '-b', 'main');
  await git(dir, 'config', 'user.email', 't@e.com');
  await git(dir, 'config', 'user.name', 't');
  await mkdir(join(dir, '.harness'), { recursive: true });
  await appendGitignore(dir);
  await writeFile(join(dir, 'src.txt'), 'v1\n');
  await git(dir, 'add', '-A');
  await git(dir, 'commit', '-qm', 'base');
  return dir;
}

async function startTask(dir, name) {
  const q = quiet();
  try { await runTask({ targetDir: dir, flags: { member: USER }, taskArgs: [name] }, { doneOnMain: noRemote }); }
  finally { q.restore(); }
}

// 실제 작업 커밋 → post-commit 훅 → 다음 커밋에 남은 변경을 담는 흐름(#105)을 그대로 밟는다.
async function commitWithHook(dir, msg) {
  await git(dir, 'add', '-A');
  await git(dir, 'commit', '-qm', msg);
  await runHandoffAuto({ targetDir: dir });
}

const porcelain = async (dir) => (await git(dir, 'status', '--porcelain')).stdout.trim();

test('.gitignore: user handoff(깊이 2)는 무시하고 task handoff 는 추적한다', async () => {
  const dir = await makeRepo();
  try {
    const lines = (await readFile(join(dir, '.gitignore'), 'utf8')).split('\n');
    assert.ok(lines.includes(USER_HANDOFF_IGNORE), `${USER_HANDOFF_IGNORE} 줄이 있어야 한다`);
    const ignored = (p) => git(dir, 'check-ignore', '-q', '--no-index', p).then(() => true, () => false);
    assert.equal(await ignored(`docs/${USER}/${USER}-handoff.md`), true);
    assert.equal(await ignored(`docs/${USER}/demo/demo-handoff.md`), false, 'task handoff 는 SSOT — 추적한다');
  } finally { await rm(dir, { recursive: true, force: true }); }
});

test('task 생성·재활성화가 곧바로 user handoff 를 쓴다 — 새 워크트리 공백 없음', async () => {
  const dir = await makeRepo();
  const userHandoff = join(dir, 'docs', USER, `${USER}-handoff.md`);
  try {
    await startTask(dir, 'alpha');
    assert.match(await readFile(userHandoff, 'utf8'), /## Active Task\nalpha\n/, '생성 직후 활성 형태');
    await startTask(dir, 'beta');
    await startTask(dir, 'alpha');
    const after = await readFile(userHandoff, 'utf8');
    assert.match(after, /## Active Task\nalpha\n/, '재활성화도 포인터를 옮긴다');
    assert.match(after, /→ docs\/tester\/alpha\/alpha-handoff\.md/);
  } finally { await rm(dir, { recursive: true, force: true }); }
});

test('같은 user 의 병렬 브랜치가 각자 커밋·sweep 후 머지해도 충돌하지 않는다', async () => {
  const dir = await makeRepo();
  try {
    await git(dir, 'switch', '-qc', 'feat-a');
    await startTask(dir, 'alpha');
    await writeFile(join(dir, 'a.txt'), 'a\n');
    await commitWithHook(dir, 'feat: a');
    await commitWithHook(dir, 'chore(handoff): sweep');

    await git(dir, 'switch', '-q', 'main');
    await git(dir, 'switch', '-qc', 'feat-b');
    await startTask(dir, 'beta');
    await writeFile(join(dir, 'b.txt'), 'b\n');
    await commitWithHook(dir, 'feat: b');
    await commitWithHook(dir, 'chore(handoff): sweep');

    await git(dir, 'switch', '-q', 'main');
    await git(dir, 'merge', '-q', '--no-ff', '-m', 'merge a', 'feat-a');
    await git(dir, 'merge', '-q', '--no-ff', '-m', 'merge b', 'feat-b'); // 충돌하면 throw
    const { stdout } = await git(dir, 'log', '--all', '--name-only', '--format=');
    assert.ok(!stdout.split('\n').includes(`docs/${USER}/${USER}-handoff.md`), 'user handoff 는 어느 커밋에도 없다');
  } finally { await rm(dir, { recursive: true, force: true }); }
});

test('sweep(#105): 작업 커밋 뒤 남는 변경은 task handoff 하나이고, 그것만 담은 커밋에서 훅은 침묵한다', async () => {
  const dir = await makeRepo();
  try {
    await startTask(dir, 'alpha');
    await commitWithHook(dir, 'feat: work');
    assert.equal(await porcelain(dir), 'M docs/tester/alpha/alpha-handoff.md', '무시 파일은 dirty 로 보이지 않는다');
    await commitWithHook(dir, 'chore(handoff): sweep');
    assert.equal(await porcelain(dir), '', 'sweep 뒤 트리가 깨끗하다 — 루프가 끝난다');
  } finally { await rm(dir, { recursive: true, force: true }); }
});

test('done 가드(#109): 무시된 user handoff 와 dirty task handoff 만 남으면 종결을 막지 않는다', async () => {
  const dir = await makeRepo();
  try {
    await startTask(dir, 'alpha');
    const taskDir = join(dir, 'docs', USER, 'alpha');
    await writeFile(join(taskDir, 'alpha-plan.md'), '# alpha — Plan\n\n## 단계\n- [x] done\n');
    await writeFile(join(taskDir, 'alpha-artifact.md'), taskArtifactTemplate('alpha') + '\n- 실제 결과\n');
    await writeFile(join(taskDir, 'alpha-spec.md'), '# alpha — Spec\n\n## Done evidence\n```json\n{ "version": 1, "tests": "skip" }\n```\n');
    await commitWithHook(dir, 'feat: work');
    const q = quiet();
    try { await runDone({ targetDir: dir, flags: {} }); } finally { q.restore(); }
    assert.ok(q.logs.some(l => l.startsWith('done:')), q.logs.join('\n'));
    assert.match(await readFile(join(dir, 'docs', USER, `${USER}-handoff.md`), 'utf8'), /Last Completed Task/, '종결 형태는 로컬에 쓴다');
  } finally { process.exitCode = undefined; await rm(dir, { recursive: true, force: true }); }
});

test('전환 전 저장소: 추적 중인 user handoff 를 doctor 가 경고하고 migrate 는 인덱스를 건드리지 않고 안내한다', async () => {
  const dir = await mkdtemp(join(tmpdir(), 'harness-uh-legacy-'));
  try {
    await git(dir, 'init', '-q', '-b', 'main');
    await git(dir, 'config', 'user.email', 't@e.com');
    await git(dir, 'config', 'user.name', 't');
    await mkdir(join(dir, 'docs', USER, 'alpha'), { recursive: true });
    await writeFile(join(dir, 'docs', USER, `${USER}-handoff.md`), '# Session Handoff\n');
    await writeFile(join(dir, 'docs', USER, 'alpha', 'alpha-handoff.md'), '# alpha — Handoff\n');
    await git(dir, 'add', '-A');
    await git(dir, 'commit', '-qm', 'legacy');

    assert.deepEqual(await trackedUserHandoffs(dir), [`docs/${USER}/${USER}-handoff.md`], 'task handoff 는 대상이 아니다');
    assert.match(await checkTrackedUserHandoffs(dir), /git rm --cached docs\/tester\/tester-handoff\.md/);

    const indexBefore = (await git(dir, 'ls-files', '-s')).stdout;
    const q = quiet();
    let changed;
    try { changed = await migrateUserHandoffUntrack({ targetDir: dir }); } finally { q.restore(); }
    assert.equal(changed, true);
    assert.equal((await git(dir, 'ls-files', '-s')).stdout, indexBefore, '인덱스 무변경');
    assert.ok(q.logs.some(l => l.includes('git rm --cached docs/tester/tester-handoff.md')), q.logs.join('\n'));
    assert.ok((await readFile(join(dir, '.gitignore'), 'utf8')).split('\n').includes(USER_HANDOFF_IGNORE));

    await git(dir, 'rm', '-q', '--cached', `docs/${USER}/${USER}-handoff.md`);
    await git(dir, 'commit', '-qm', 'untrack');
    assert.deepEqual(await trackedUserHandoffs(dir), []);
    assert.equal(await checkTrackedUserHandoffs(dir), null, '전환 뒤에는 경고하지 않는다');
    const q2 = quiet();
    try { assert.equal(await migrateUserHandoffUntrack({ targetDir: dir }), false, '재실행은 no-op'); } finally { q2.restore(); }
  } finally { await rm(dir, { recursive: true, force: true }); }
});

test('추적 해제만 되고 무시 줄이 없는 저장소: doctor 가 경고하고 migrate 가 줄을 넣는다 (codex P2)', async () => {
  const dir = await mkdtemp(join(tmpdir(), 'harness-uh-noignore-'));
  try {
    await git(dir, 'init', '-q', '-b', 'main');
    assert.deepEqual(await trackedUserHandoffs(dir), []);
    assert.match(await checkTrackedUserHandoffs(dir), /\.gitignore 에 `docs\/\*\/\*-handoff\.md` 줄이 없어/);
    const q = quiet();
    let changed;
    try { changed = await migrateUserHandoffUntrack({ targetDir: dir }); } finally { q.restore(); }
    assert.equal(changed, true, '추적 사본이 없어도 무시 줄은 보장한다');
    assert.equal(await checkTrackedUserHandoffs(dir), null);
  } finally { await rm(dir, { recursive: true, force: true }); }
});

test('같은 깊이의 다른 *-handoff.md 는 추적 해제 안내 대상이 아니다 (codex P2)', async () => {
  const dir = await mkdtemp(join(tmpdir(), 'harness-uh-other-'));
  try {
    await git(dir, 'init', '-q', '-b', 'main');
    await git(dir, 'config', 'user.email', 't@e.com');
    await git(dir, 'config', 'user.name', 't');
    await mkdir(join(dir, 'docs', 'diagrams'), { recursive: true });
    await mkdir(join(dir, 'docs', USER), { recursive: true });
    await writeFile(join(dir, 'docs', 'diagrams', 'release-handoff.md'), 'x\n');
    await writeFile(join(dir, 'docs', USER, `${USER}-handoff.md`), 'x\n');
    await git(dir, 'add', '-A');
    await git(dir, 'commit', '-qm', 'seed');
    assert.deepEqual(await trackedUserHandoffs(dir), [`docs/${USER}/${USER}-handoff.md`]);
  } finally { await rm(dir, { recursive: true, force: true }); }
});

test('git 저장소가 아니면 추적 판정은 빈 목록 — doctor 는 조용하다', async () => {
  const dir = await mkdtemp(join(tmpdir(), 'harness-uh-nogit-'));
  try {
    assert.deepEqual(await trackedUserHandoffs(dir), []);
    assert.equal(await checkTrackedUserHandoffs(dir), null);
  } finally { await rm(dir, { recursive: true, force: true }); }
});

// post-commit 훅의 불변식을 실제 커밋으로 고정한다 — 활성 task 가 있어도 커밋 직후 트리가 깨끗하다.
//
// 훅이 추적되는 task handoff 를 더럽히던 시절에는 그 변경을 담는 커밋이 따로 생겼다(규칙 커밋 685b744 뒤 78개).
// 깨끗한 트리는 훅이 아예 안 돌아도 성립하므로, 실제 커밋을 쓰는 테스트는 훅이 돌았다는 양성 대조를 함께 본다.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { mkdtemp, mkdir, writeFile, readFile, rm, chmod } from 'node:fs/promises';
import { dirname, join, resolve } from 'node:path';
import { tmpdir } from 'node:os';
import { fileURLToPath } from 'node:url';
import { execFile } from 'node:child_process';
import { promisify } from 'node:util';
import { runHandoffAuto } from '../src/commands/task.mjs';
import { appendGitignore } from '../src/harness.mjs';
import { installPostCommitHook } from '../src/git-hooks.mjs';

const BIN = resolve(dirname(fileURLToPath(import.meta.url)), '..', 'bin', 'harness-team.mjs');
const pexec = promisify(execFile);
const USER = 'tester';
const TASK = 'demo';
const TASK_HANDOFF = `# ${TASK} — Handoff\n`;

// 훅이 부르는 `harness-team` 을 PATH shim 으로 이 소스에 잇는다 — 전역 설치본을 타면 옛 동작을 시험하게 된다.
async function makeRepo({ plan = '- [ ] 구현\n' } = {}) {
  const root = await mkdtemp(join(tmpdir(), 'harness-churn-'));
  const dir = join(root, 'repo');
  const bin = join(root, 'bin');
  await mkdir(dir);
  await mkdir(bin);
  await writeFile(join(bin, 'harness-team'), `#!/bin/sh\nexec node ${JSON.stringify(BIN)} "$@"\n`);
  await chmod(join(bin, 'harness-team'), 0o755);
  const env = { ...process.env, PATH: `${bin}:${process.env.PATH}` };
  const git = (...args) => pexec('git', ['-C', dir, ...args], { env });

  await git('init', '-q', '-b', 'main');
  await git('config', 'user.email', 't@e.com');
  await git('config', 'user.name', 't');
  await mkdir(join(dir, '.harness'), { recursive: true });
  await appendGitignore(dir);
  await installPostCommitHook(dir);
  await writeFile(join(dir, 'src.txt'), 'v1\n');
  await git('add', '-A');
  await git('commit', '-qm', 'base');

  await writeFile(join(dir, '.harness/active.json'), JSON.stringify({ user: USER, task: TASK, path: `docs/${USER}/${TASK}` }));
  await mkdir(join(dir, 'docs', USER, TASK), { recursive: true });
  await writeFile(join(dir, 'docs', USER, TASK, `${TASK}-handoff.md`), TASK_HANDOFF);
  await writeFile(join(dir, 'docs', USER, TASK, `${TASK}-plan.md`), `# ${TASK} — Plan\n\n## 단계\n${plan}`);
  await git('add', '-A');
  await git('commit', '-qm', 'task docs');

  const read = rel => readFile(join(dir, rel), 'utf8');
  return {
    dir,
    git,
    cleanup: () => rm(root, { recursive: true, force: true }),
    work: async (msg, ...commitArgs) => {
      await writeFile(join(dir, 'src.txt'), `${msg}\n`);
      await git('add', '-A');
      return git('commit', '-qm', msg, ...commitArgs);
    },
    porcelain: async () => (await git('status', '--porcelain')).stdout.trim(),
    oneline: async () => (await git('log', '-1', '--oneline')).stdout.trim(),
    taskHandoff: () => read(`docs/${USER}/${TASK}/${TASK}-handoff.md`),
    userHandoff: () => read(`docs/${USER}/${USER}-handoff.md`),
  };
}

test('활성 task 가 있는 실제 커밋 → 트리는 깨끗하고 훅은 user handoff 만 갱신한다', async () => {
  const r = await makeRepo();
  try {
    await r.work('feat: 작업');
    assert.match(await r.userHandoff(), new RegExp(await r.oneline()), '양성 대조 — 훅이 돌았다');
    assert.equal(await r.porcelain(), '', '커밋 직후 트리가 깨끗하다');
    assert.equal(await r.taskHandoff(), TASK_HANDOFF, 'task handoff 는 훅이 쓰지 않는다');
  } finally { await r.cleanup(); }
});

test('연속 커밋 → 매번 트리가 깨끗하고 커밋 수는 작업 수와 같다', async () => {
  const r = await makeRepo();
  try {
    const before = Number((await r.git('rev-list', '--count', 'HEAD')).stdout);
    for (const msg of ['feat: 하나', 'feat: 둘', 'feat: 셋']) {
      await r.work(msg);
      assert.match(await r.userHandoff(), new RegExp(msg), '양성 대조 — 훅이 돌았다');
      assert.equal(await r.porcelain(), '', msg);
    }
    assert.equal(Number((await r.git('rev-list', '--count', 'HEAD')).stdout), before + 3);
  } finally { await r.cleanup(); }
});

test('amend → user handoff 는 살아 있는 커밋을 가리키고 트리는 깨끗하다', async () => {
  const r = await makeRepo();
  try {
    await r.work('feat: 처음');
    const replaced = await r.oneline();
    await r.work('feat: 고침', '--amend');
    const user = await r.userHandoff();
    assert.match(user, new RegExp(await r.oneline()));
    assert.ok(!user.includes(replaced), 'amend 가 밀어낸 커밋을 가리키지 않는다');
    assert.equal(await r.porcelain(), '');
  } finally { await r.cleanup(); }
});

// 자동 병합은 post-commit 을 돌리지 않는다. 훅이 도는 병합은 충돌을 풀고 `git commit` 으로 끝내는 경로다.
test('충돌을 푼 병합 커밋 → user handoff 가 병합을 가리키고 트리는 깨끗하다', async () => {
  const r = await makeRepo();
  try {
    await r.git('checkout', '-qb', 'side');
    await r.work('feat: side');
    await r.git('checkout', '-q', 'main');
    await r.work('feat: main');
    await assert.rejects(r.git('merge', '-q', '--no-ff', 'side'));
    await r.work('merge side');
    assert.equal((await r.git('rev-list', '--parents', '-n', '1', 'HEAD')).stdout.trim().split(' ').length, 3, '전제: 병합 커밋');
    assert.match(await r.userHandoff(), /merge side/, '양성 대조 — 훅이 돌았다');
    assert.equal(await r.porcelain(), '');
  } finally { await r.cleanup(); }
});

test('아직 추적 중인 user handoff(구 저장소) → 훅은 돌지만 쓰지 않아 트리가 깨끗하다', async () => {
  const r = await makeRepo({ plan: '- [x] 구현\n' });
  try {
    await r.work('feat: 진입점 생성');
    await r.git('add', '-f', `docs/${USER}/${USER}-handoff.md`);
    await r.git('commit', '-qm', 'chore: 구 저장소처럼 추적');
    const tracked = await r.userHandoff();

    const { stdout, stderr } = await r.work('feat: 다음 작업');
    assert.match(stdout + stderr, /PLAN_COMPLETE/, '양성 대조 — 훅이 돌았다');
    assert.equal(await r.userHandoff(), tracked, '추적 파일은 쓰지 않는다');
    assert.equal(await r.porcelain(), '');
  } finally { await r.cleanup(); }
});

test('무시 줄 없는 구 저장소 → 훅은 돌지만 user handoff 를 만들지 않아 미추적 파일이 없다', async () => {
  const r = await makeRepo({ plan: '- [x] 구현\n' });
  try {
    await rm(join(r.dir, `docs/${USER}/${USER}-handoff.md`));
    await writeFile(join(r.dir, '.gitignore'), '.harness/\n');
    await r.git('add', '-A');
    const { stdout, stderr } = await r.git('commit', '-qm', 'chore: 무시 줄 제거');
    assert.match(stdout + stderr, /PLAN_COMPLETE/, '양성 대조 — 훅이 돌았다');
    await assert.rejects(r.userHandoff(), { code: 'ENOENT' });
    assert.equal(await r.porcelain(), '');
  } finally { await r.cleanup(); }
});

test('활성 task 없음 → 훅은 아무것도 쓰지 않는다', async () => {
  const r = await makeRepo();
  try {
    await writeFile(join(r.dir, '.harness/active.json'), 'null\n');
    const before = await r.userHandoff();
    await r.work('feat: task 없음');
    assert.equal(await r.userHandoff(), before);
    assert.equal(await r.porcelain(), '');
  } finally { await r.cleanup(); }
});

test('하위 디렉터리 설치본 → 추적된 user handoff 판정이 targetDir 기준으로 맞는다', async () => {
  const root = await mkdtemp(join(tmpdir(), 'harness-churn-sub-'));
  const dir = join(root, 'packages/app');
  const git = (...args) => pexec('git', ['-C', root, ...args]);
  try {
    await git('init', '-q', '-b', 'main');
    await git('config', 'user.email', 't@e.com');
    await git('config', 'user.name', 't');
    await mkdir(join(dir, '.harness'), { recursive: true });
    await mkdir(join(dir, 'docs', USER, TASK), { recursive: true });
    await appendGitignore(dir);
    await writeFile(join(dir, '.harness/active.json'), JSON.stringify({ user: USER, task: TASK, path: `docs/${USER}/${TASK}` }));
    await writeFile(join(dir, 'docs', USER, `${USER}-handoff.md`), '# 추적됨\n');
    await git('add', '-A', '-f');
    await git('commit', '-qm', 'base');

    await runHandoffAuto({ targetDir: dir });
    assert.equal((await git('status', '--porcelain')).stdout, '');
  } finally { await rm(root, { recursive: true, force: true }); }
});

test('git 이 아닌 디렉터리 → user handoff 는 빈 커밋 메시지로 쓴다', async () => {
  const dir = await mkdtemp(join(tmpdir(), 'harness-churn-nogit-'));
  try {
    await mkdir(join(dir, '.harness'), { recursive: true });
    await mkdir(join(dir, 'docs', USER, TASK), { recursive: true });
    await writeFile(join(dir, '.harness/active.json'), JSON.stringify({ user: USER, task: TASK, path: `docs/${USER}/${TASK}` }));
    await runHandoffAuto({ targetDir: dir });
    assert.match(await readFile(join(dir, 'docs', USER, `${USER}-handoff.md`), 'utf8'), /## Active Task\ndemo/);
  } finally { await rm(dir, { recursive: true, force: true }); }
});

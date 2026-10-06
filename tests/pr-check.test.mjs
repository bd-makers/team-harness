// `pr-check` — 하네스가 강제하는 유일한 것(D11): PR 이 담을 task 문서(다이어그램은 권장 — 안내만). 판정 대상은 active.json 이 아니라
// `base...rev` diff 가 건드린 task 이고, 내용은 작업 트리가 아니라 커밋에서 읽는다(push·CI 가 보는 것).
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { execFile } from 'node:child_process';
import { promisify } from 'node:util';
import { mkdtemp, mkdir, writeFile, rm, chmod } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { collectPrCheck, runPrCheck, prePushTargets, branchName } from '../src/commands/pr-check.mjs';
import { taskSpecTemplate, taskPlanTemplate, taskHandoffTemplate, taskArtifactTemplate } from '../src/commands/task.mjs';
import { installPrePushHook } from '../src/git-hooks.mjs';

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const pexec = promisify(execFile);
const git = (cwd, ...args) => pexec('git', ['-C', cwd, ...args]);

const FILLED = {
  'spec.md': '# t — Spec\n\n## 목적 / 요구사항\n채움\n',
  'plan.md': '# t — Plan\n\n## 단계\n- [x] 1. 채움\n',
  'handoff.md': '# t — Handoff\n\n## 2026-10-06 — abc 커밋\n',
  'artifact.md': '# t — Artifact\n\n## 결과\n\n- 채움\n\n## Reviews\n\n## Learnings\n',
};
const TEMPLATES = { 'spec.md': taskSpecTemplate, 'plan.md': taskPlanTemplate, 'handoff.md': taskHandoffTemplate, 'artifact.md': taskArtifactTemplate };
const SKIP_LINE = '- 다이어그램: 미실행 — 구조 변화 없음 (2026-10-06)';

async function repo() {
  const dir = await mkdtemp(join(tmpdir(), 'harness-prcheck-'));
  await git(dir, 'init', '-q', '-b', 'main');
  await git(dir, 'config', 'user.email', 't@e2e.io');
  await git(dir, 'config', 'user.name', 'tester');
  await git(dir, 'config', 'commit.gpgsign', 'false');
  await writeFile(join(dir, 'README.md'), 'x\n');
  await git(dir, 'add', '-A');
  await git(dir, 'commit', '-q', '-m', 'init');
  await git(dir, 'checkout', '-q', '-b', 'feature');
  return dir;
}

// files: { 'spec.md': 'template' | null | <content> } — 기본은 4문서 채움 + 다이어그램 파일.
async function writeTask(dir, task, { files = {}, diagram = true, user = 'u' } = {}) {
  const taskDir = join(dir, 'docs', user, task);
  await mkdir(taskDir, { recursive: true });
  for (const kind of Object.keys(FILLED)) {
    const value = kind in files ? files[kind] : FILLED[kind];
    if (value === null) continue;
    await writeFile(join(taskDir, `${task}-${kind}`), value === 'template' ? TEMPLATES[kind](task) : value);
  }
  if (diagram) await writeFile(join(taskDir, `${task}-diagram.html`), '<svg></svg>');
}

const commit = async (dir, msg = 'c') => { await git(dir, 'add', '-A'); await git(dir, 'commit', '-q', '-m', msg); };
const check = (dir, rev) => collectPrCheck({ targetDir: dir, base: 'main', rev });

async function capture(fn) {
  const logs = [];
  const orig = console.log;
  const prevExit = process.exitCode;
  process.exitCode = undefined;
  console.log = (...a) => logs.push(a.join(' '));
  try {
    await fn();
    return { out: logs.join('\n'), exitCode: process.exitCode };
  } finally {
    console.log = orig;
    process.exitCode = prevExit;
  }
}

test('pr-check: 4문서 채움 + 다이어그램 → 통과(exit 0)', async () => {
  const dir = await repo();
  try {
    await writeTask(dir, 't');
    await commit(dir);
    const { out, exitCode } = await capture(() => runPrCheck({ targetDir: dir, flags: { base: 'main' } }));
    assert.equal(exitCode, undefined);
    assert.match(out, /✓ pr-check HEAD: u\/t/);
  } finally { await rm(dir, { recursive: true, force: true }); }
});

test('pr-check: 문서마다 없음·템플릿 그대로를 각각 잡는다 → exit 1', async () => {
  for (const kind of Object.keys(FILLED)) {
    for (const value of [null, 'template']) {
      const dir = await repo();
      try {
        await writeTask(dir, 't', { files: { [kind]: value } });
        await commit(dir);
        const r = await check(dir, 'HEAD');
        const want = value === null ? `docs/u/t/t-${kind} 없음` : `docs/u/t/t-${kind} 가 템플릿 그대로`;
        assert.ok(r.tasks[0].issues.some(i => i.startsWith(want)), `${kind}/${value}: ${r.tasks[0].issues}`);
        assert.equal(r.tasks[0].issues.length, 1);
        const { exitCode } = await capture(() => runPrCheck({ targetDir: dir, flags: { base: 'main' } }));
        assert.equal(exitCode, 1);
      } finally { await rm(dir, { recursive: true, force: true }); }
    }
  }
});

// 템플릿 비교만 하면 0바이트·공백뿐인 문서는 템플릿과 달라 통과했다 — 실례: dangerous-git-end-boundary plan 이 미완 단계를
// 남긴 채 0바이트로 커밋됐다(bb93755, task empty-doc-guard).
test('pr-check: 빈 문서(0바이트·공백뿐)도 잡는다 → exit 1', async () => {
  for (const kind of Object.keys(FILLED)) {
    for (const value of ['', ' \n\n']) {
      const dir = await repo();
      try {
        await writeTask(dir, 't', { files: { [kind]: value } });
        await commit(dir);
        const r = await check(dir, 'HEAD');
        assert.deepEqual(r.tasks[0].issues.map(i => i.split(' — ')[0]), [`docs/u/t/t-${kind} 가 비어 있음`], `${kind}/${JSON.stringify(value)}`);
      } finally { await rm(dir, { recursive: true, force: true }); }
    }
  }
});

test('pr-check: 다이어그램은 권장이다 — 없으면 막지 않고 안내만, 파일이나 생략 기록이 있으면 안내도 없다', async () => {
  const dir = await repo();
  try {
    await writeTask(dir, 't', { diagram: false });
    await commit(dir);
    const missing = await check(dir, 'HEAD');
    assert.deepEqual(missing.tasks[0].issues, []);
    assert.match(missing.tasks[0].notes.join('\n'), /권장: 다이어그램 없음/);
    const { out, exitCode } = await capture(() => runPrCheck({ targetDir: dir, flags: { base: 'main' } }));
    assert.equal(exitCode, undefined);
    assert.match(out, /✓ pr-check HEAD: u\/t\n  · 권장: 다이어그램 없음/);

    await writeTask(dir, 't', { diagram: false, files: { 'artifact.md': FILLED['artifact.md'].replace('- 채움\n', `- 채움\n${SKIP_LINE}\n`) } });
    await commit(dir);
    assert.deepEqual((await check(dir, 'HEAD')).tasks[0].notes, []);
  } finally { await rm(dir, { recursive: true, force: true }); }
});

test('pr-check: diff 가 건드린 task 를 모두 검사하고, 사용자 handoff·spec 없는 디렉터리는 task 가 아니다', async () => {
  const dir = await repo();
  try {
    await writeTask(dir, 'a');
    await writeTask(dir, 'b', { files: { 'plan.md': 'template' } });
    await mkdir(join(dir, 'docs/superpowers/plans'), { recursive: true });
    await writeFile(join(dir, 'docs/superpowers/plans/x.md'), 'x\n');
    await writeFile(join(dir, 'docs/u/u-handoff.md'), 'x\n');
    await commit(dir);
    const r = await check(dir, 'HEAD');
    assert.deepEqual(r.tasks.map(t => `${t.user}/${t.task}:${t.issues.length}`), ['u/a:0', 'u/b:1']);
  } finally { await rm(dir, { recursive: true, force: true }); }
});

test('pr-check: spec 이 빠진 task 도 검사한다 — 다른 정상 task 와 함께여도 통과시키지 않는다 (codex P2)', async () => {
  const dir = await repo();
  try {
    await writeTask(dir, 'a');
    await writeTask(dir, 'b', { files: { 'spec.md': null } });
    await commit(dir);
    const r = await check(dir, 'HEAD');
    assert.deepEqual(r.tasks.map(t => t.task), ['a', 'b']);
    assert.match(r.tasks[1].issues.join('\n'), /docs\/u\/b\/b-spec\.md 없음/);
    // 디렉터리를 통째로 지운 변경은 의도된 삭제라 대상이 아니다.
    await rm(join(dir, 'docs/u/b'), { recursive: true, force: true });
    await commit(dir);
    assert.deepEqual((await check(dir, 'HEAD')).tasks.map(t => t.task), ['a']);
  } finally { await rm(dir, { recursive: true, force: true }); }
});

test('pr-check: diff 는 있는데 task 가 없으면 실패, diff 가 비면(커밋 전 push) 통과', async () => {
  const dir = await repo();
  try {
    const empty = await capture(() => runPrCheck({ targetDir: dir, flags: { base: 'main' } }));
    assert.equal(empty.exitCode, undefined);
    assert.match(empty.out, /변경 없음/);

    await writeFile(join(dir, 'code.js'), 'x\n');
    await commit(dir);
    const none = await capture(() => runPrCheck({ targetDir: dir, flags: { base: 'main' } }));
    assert.equal(none.exitCode, 1);
    assert.match(none.out, /task 문서\(docs\/<user>\/<task>\/\)가 없음/);
  } finally { await rm(dir, { recursive: true, force: true }); }
});

test('pr-check: 커밋 내용 기준이다 — 작업 트리에서만 채운 문서는 통과시키지 않는다', async () => {
  const dir = await repo();
  try {
    await writeTask(dir, 't', { files: { 'plan.md': 'template' } });
    await commit(dir);
    await writeTask(dir, 't'); // 작업 트리에서 plan 을 채움(미커밋)
    const r = await check(dir, 'HEAD');
    assert.match(r.tasks[0].issues.join('\n'), /t-plan\.md 가 템플릿 그대로/);
  } finally { await rm(dir, { recursive: true, force: true }); }
});

test('pr-check --json: envelope 에 base 와 task 별 issues 를 싣는다', async () => {
  const dir = await repo();
  try {
    await writeTask(dir, 't', { diagram: false, files: { 'artifact.md': 'template' } });
    await commit(dir);
    const { out, exitCode } = await capture(() => runPrCheck({ targetDir: dir, flags: { base: 'main', json: true } }));
    assert.equal(exitCode, 1);
    const env = JSON.parse(out);
    assert.equal(env.command, 'pr-check');
    assert.equal(env.status, 'failure');
    assert.equal(env.base, 'main');
    assert.equal(env.checks[0].tasks[0].task, 'u/t');
    assert.equal(env.checks[0].tasks[0].issues.length, 1);
    assert.equal(env.checks[0].tasks[0].notes.length, 1);
  } finally { await rm(dir, { recursive: true, force: true }); }
});

test('pr-check: base 를 판정하지 못하면 차단(exit 1) — pre-push 는 set-head 와 --no-verify 를 알린다', async () => {
  const dir = await repo();
  try {
    const stdin = `refs/heads/feature ${'a'.repeat(40)} refs/heads/feature ${'0'.repeat(40)}\n`;
    const { out, exitCode } = await capture(() => runPrCheck({ targetDir: dir, flags: { base: 'nosuch', 'pre-push': true } }, { readStdin: async () => stdin }));
    assert.equal(exitCode, 1);
    assert.match(out, /git remote set-head origin -a/);
    assert.match(out, /--no-verify/);
  } finally { await rm(dir, { recursive: true, force: true }); }
});

test('prePushTargets: 삭제·태그·기본 브랜치 push 는 건너뛰고 피처 브랜치만 남긴다', () => {
  const sha = 'a'.repeat(40);
  const zero = '0'.repeat(40);
  const stdin = [
    `refs/heads/feature ${sha} refs/heads/feature ${zero}`,
    `(delete) ${zero} refs/heads/old ${sha}`,
    `refs/tags/v1 ${sha} refs/tags/v1 ${zero}`,
    `refs/heads/main ${sha} refs/heads/main ${sha}`,
    '',
  ].join('\n');
  assert.deepEqual(prePushTargets(stdin, 'main').map(t => t.remoteRef), ['refs/heads/feature']);
  assert.deepEqual(prePushTargets('', 'main'), []);
  assert.equal(branchName('refs/remotes/origin/develop'), 'develop');
  assert.equal(branchName('main'), 'main');
});

test('pr-check --pre-push: push 되는 sha 를 판정하고, 빈 stdin 이면 조용히 통과', async () => {
  const dir = await repo();
  try {
    await writeTask(dir, 't', { files: { 'spec.md': 'template' } });
    await commit(dir);
    const { stdout: sha } = await git(dir, 'rev-parse', 'HEAD');
    const stdin = `refs/heads/feature ${sha.trim()} refs/heads/feature ${'0'.repeat(40)}\n`;
    const fail = await capture(() => runPrCheck({ targetDir: dir, flags: { base: 'main', 'pre-push': true } }, { readStdin: async () => stdin }));
    assert.equal(fail.exitCode, 1);
    assert.match(fail.out, /✗ pr-check feature: u\/t/);
    assert.match(fail.out, /git push --no-verify/);

    // 빈 stdin = push 할 것 없음(git 은 그때도 훅을 부른다). 훅 블록이 stdin 을 먼저 받아 두므로 소비된 경우는 없다.
    const quiet = await capture(() => runPrCheck({ targetDir: dir, flags: { base: 'main', 'pre-push': true } }, { readStdin: async () => '' }));
    assert.equal(quiet.exitCode, undefined);
    assert.equal(quiet.out, '');
  } finally { await rm(dir, { recursive: true, force: true }); }
});

// 실제 git push — 훅이 PATH 의 CLI 를 부르고, 기본 브랜치 push 는 통과, 피처 브랜치는 막히며, --no-verify 로 우회된다.
// CLI 가 없거나 pr-check 를 모르는 구버전이면 훅은 건너뛴다(fail-open).
test('pre-push 훅 실측: 빈 원격 첫 push · 앞선 훅의 stdin 소비 · 차단 · --no-verify · 태그 · 기본 브랜치 · CLI 부재/구버전', async () => {
  const dir = await repo();
  const remote = await mkdtemp(join(tmpdir(), 'harness-prcheck-remote-'));
  const bin = await mkdtemp(join(tmpdir(), 'harness-prcheck-bin-'));
  try {
    await git(remote, 'init', '-q', '--bare');
    await git(dir, 'remote', 'add', 'origin', remote);
    // 앞선 훅이 stdin 을 소비하고 exit 0 으로 끝나는 경우(git-lfs·husky 스텁) — 블록이 맨 위라 검사는 그대로 돈다.
    await writeFile(join(dir, '.git/hooks/pre-push'), '#!/bin/sh\ncat >/dev/null\nexit 0\n', { mode: 0o755 });
    await installPrePushHook(dir);

    const { stdout: gitPath } = await pexec('sh', ['-c', 'command -v git']);
    const PATH = [bin, dirname(gitPath.trim()), '/usr/bin', '/bin'].join(':');
    const push = (...args) => pexec('git', ['-C', dir, 'push', '-q', ...args], { env: { ...process.env, PATH } })
      .then(() => 0, err => ({ code: err.code, out: `${err.stdout}${err.stderr}` }));
    const shim = join(bin, 'harness-team');
    await writeFile(shim, `#!/bin/sh\nexec "${process.execPath}" "${join(ROOT, 'bin/harness-team.mjs')}" "$@"\n`);
    await chmod(shim, 0o755);

    // 빈 원격으로의 첫 push — 비교할 기본 브랜치가 없으니 통과(init 직후의 정상 흐름, 리뷰 2026-10-06 재현)
    assert.equal(await push('origin', 'main'), 0);

    await writeTask(dir, 't', { files: { 'plan.md': 'template' } });
    await commit(dir);

    // 실제 CLI → 피처 브랜치 차단 (앞선 훅의 stdin 소비·exit 0 과 무관)
    const blocked = await push('origin', 'feature');
    assert.notEqual(blocked, 0);
    assert.match(blocked.out, /t-plan\.md 가 템플릿 그대로/);
    assert.match(blocked.out, /--no-verify/);

    // --no-verify 우회
    assert.equal(await push('--no-verify', 'origin', 'feature:bypass'), 0);

    // 태그만 push → 검사 없음 (현재 브랜치와 무관)
    await git(dir, 'tag', 'v1');
    assert.equal(await push('origin', 'v1'), 0);

    // 구버전 CLI(--help 에 pr-check 없음, 나머지는 exit 1) → 건너뜀
    await writeFile(shim, '#!/bin/sh\n[ "$1" = "--help" ] && { echo "  handoff"; exit 0; }\nexit 1\n');
    assert.equal(await push('origin', 'feature:probe-old'), 0);

    // CLI 없음 → 건너뜀
    await rm(shim);
    assert.equal(await push('origin', 'feature:probe-none'), 0);
    await writeFile(shim, `#!/bin/sh\nexec "${process.execPath}" "${join(ROOT, 'bin/harness-team.mjs')}" "$@"\n`);
    await chmod(shim, 0o755);

    // 기본 브랜치 push 는 PR 이 아니다 — 같은 커밋이어도 통과
    assert.equal(await push('origin', 'feature:main'), 0);

    // 문서를 채우면 통과
    await git(dir, 'checkout', '-q', '-b', 'feature2', 'feature');
    await writeTask(dir, 't');
    await commit(dir);
    assert.equal(await push('origin', 'feature2'), 0);
  } finally {
    for (const d of [dir, remote, bin]) await rm(d, { recursive: true, force: true });
  }
});

// `--base origin/main` 같은 짧은 이름도 기본 브랜치 push 를 건너뛴다(리뷰 P3: branchName 이 접두를 못 뗐다).
test('pr-check --pre-push --base <짧은 원격 이름>: 기본 브랜치 push 는 건너뛴다', async () => {
  const dir = await repo();
  const remote = await mkdtemp(join(tmpdir(), 'harness-prcheck-remote-'));
  try {
    await git(remote, 'init', '-q', '--bare');
    await git(dir, 'remote', 'add', 'origin', remote);
    await git(dir, 'push', '-q', 'origin', 'main');
    await git(dir, 'fetch', '-q', 'origin');
    await writeFile(join(dir, 'code.js'), 'x\n');
    await commit(dir);
    const { stdout: sha } = await git(dir, 'rev-parse', 'HEAD');
    const stdin = `refs/heads/feature ${sha.trim()} refs/heads/main ${'0'.repeat(40)}\n`;
    const r = await capture(() => runPrCheck({ targetDir: dir, flags: { base: 'origin/main', 'pre-push': true } }, { readStdin: async () => stdin }));
    assert.equal(r.exitCode, undefined);
    assert.equal(r.out, '');
  } finally { for (const d of [dir, remote]) await rm(d, { recursive: true, force: true }); }
});

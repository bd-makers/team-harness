// `pr-check` — 하네스가 강제하는 유일한 것(D11): PR 이 담을 task 문서(다이어그램은 권장 — 안내만). 판정 대상은 active.json 이 아니라
// `base...rev` diff 가 건드린 task 이고, 내용은 작업 트리가 아니라 커밋에서 읽는다(push·CI 가 보는 것).
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { execFile } from 'node:child_process';
import { promisify } from 'node:util';
import { mkdtemp, mkdir, writeFile, readFile, rm, chmod } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { collectPrCheck, runPrCheck, prePushTargets, branchName } from '../src/commands/pr-check.mjs';
import { taskSpecTemplate, taskPlanTemplate, taskHandoffTemplate, taskArtifactTemplate, reviewGateStep } from '../src/commands/task.mjs';
import { installPrePushHook } from '../src/git-hooks.mjs';

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const pexec = promisify(execFile);
const git = (cwd, ...args) => pexec('git', ['-C', cwd, ...args]);

const FILLED = {
  'spec.md': '# t — Spec\n\n## 목적 / 요구사항\n채움\n',
  'plan.md': '# t — Plan\n\n## 단계\n- [x] 1. 채움\n',
  'artifact.md': '# t — Artifact\n\n## 결과\n\n- 채움\n\n## Reviews\n\n## Learnings\n',
};
const TEMPLATES = { 'spec.md': taskSpecTemplate, 'plan.md': taskPlanTemplate, 'artifact.md': taskArtifactTemplate };
const SKIP_LINE = '- 다이어그램: 미실행 — 구조 변화 없음 (2026-10-06)';
const VIEW_SVG = '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 1 1"/>\n';

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

// human-review-gate: 새 plan 은 게이트 줄을 품고 생긴다. 게이트 없는 템플릿과만 대조하면 손대지 않은 plan 과 게이트만 켠 plan 이
// "채워진 문서"로 통과했다. 게이트 줄은 빼고 대조하되, 진짜 단계가 있는 plan 은 통과해야 한다(과잉 차단 금지).
test('pr-check: 게이트가 든 plan 도 템플릿 그대로면 잡고, 게이트 외 단계가 있으면 통과한다', async () => {
  const gated = taskPlanTemplate('t', { reviewGateUser: 'u' });
  const TEMPLATE = ['docs/u/t/t-plan.md 가 템플릿 그대로 — 목표·단계를 채워 커밋'];
  const EMPTY = ['docs/u/t/t-plan.md 가 비어 있음 — 목표·단계를 채워 커밋'];
  const cases = [
    ['게이트 미완 그대로', gated, TEMPLATE],
    ['게이트만 켬', gated.replace(reviewGateStep('u'), reviewGateStep('u').replace('- [ ]', '- [x]')), TEMPLATE],
    // codex 리뷰(2026-11-18) P2: 빈 문서 판정이 게이트를 빼기 전에 돌아 게이트 줄만 남은 plan 이 통과했다.
    ['게이트 줄만 남음', `${reviewGateStep('u')}\n`, EMPTY],
    ['게이트 + 채운 단계', gated.replace('\n- [ ]\n', '\n- [x] 1. 채움\n'), []],
    ['사람이 더한 다른 [사람] 단계는 빼지 않는다', gated.replace('\n- [ ]\n', '\n- [ ]\n- [ ] [사람] PR 승인\n'), []],
  ];
  for (const [label, plan, want] of cases) {
    const dir = await repo();
    try {
      await writeTask(dir, 't', { files: { 'plan.md': plan } });
      await commit(dir);
      const r = await check(dir, 'HEAD');
      assert.deepEqual(r.tasks[0].issues, want, label);
    } finally { await rm(dir, { recursive: true, force: true }); }
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

// handoff 를 요구하면 그 파일만 담는 커밋이 다시 생긴다(규칙 커밋 685b744 뒤 78개). 선택 문서라 상태를 보지 않는다.
test('pr-check: task handoff 는 선택 문서다 — 없음·템플릿·빈 문서 모두 통과', async () => {
  for (const handoff of [null, taskHandoffTemplate('t'), '']) {
    const dir = await repo();
    try {
      await writeTask(dir, 't');
      if (handoff !== null) await writeFile(join(dir, 'docs/u/t/t-handoff.md'), handoff);
      await commit(dir);
      const r = await check(dir, 'HEAD');
      assert.deepEqual(r.tasks.map(t => t.issues), [[]], JSON.stringify(handoff));
      const { exitCode } = await capture(() => runPrCheck({ targetDir: dir, flags: { base: 'main' } }));
      assert.equal(exitCode, undefined);
    } finally { await rm(dir, { recursive: true, force: true }); }
  }
});

test('pr-check: handoff 만 남은 옛 task 디렉터리도 검사 대상이다', async () => {
  const dir = await repo();
  try {
    await mkdir(join(dir, 'docs/u/t'), { recursive: true });
    await writeFile(join(dir, 'docs/u/t/t-handoff.md'), '# t — Handoff\n');
    await commit(dir);
    const r = await check(dir, 'HEAD');
    assert.equal(r.tasks.length, 1);
    assert.equal(r.tasks[0].issues.length, 3, r.tasks[0].issues.join('\n'));
  } finally { await rm(dir, { recursive: true, force: true }); }
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

// diagram-views·diagram-svg: 뷰 SVG(`<task>-diagram-<view>.svg`) 하나만 있어도 다이어그램이 있는 것이다. 모르는 뷰 이름과
// 뷰 HTML(A1 미릴리스 형식)은 세지 않는다.
test('pr-check: 뷰 SVG 하나만 있어도 권장 안내를 내지 않는다 — 뷰 HTML·모르는 뷰는 세지 않는다', async () => {
  const dir = await repo();
  try {
    await writeTask(dir, 't', { diagram: false });
    await writeFile(join(dir, 'docs/u/t/t-diagram-unknown.svg'), '<svg/>');
    await writeFile(join(dir, 'docs/u/t/t-diagram-sequence.html'), '<svg/>');
    await commit(dir);
    const none = (await check(dir, 'HEAD')).tasks[0].notes;
    assert.equal(none.length, 1, none.join('\n'));
    assert.match(none[0], /권장: 다이어그램 없음/);
    assert.match(none[0], /t-diagram-<view>\.svg/, '뷰별 경로도 안내한다');

    for (const view of ['sequence', 'module']) {
      await rm(join(dir, 'docs/u/t'), { recursive: true, force: true });
      await writeTask(dir, 't', { diagram: false });
      await writeFile(join(dir, `docs/u/t/t-diagram-${view}.svg`), VIEW_SVG);
      await commit(dir, view);
      assert.deepEqual((await check(dir, 'HEAD')).tasks[0].notes, [`PR 본문에 링크: docs/u/t/t-diagram-${view}.svg`], `${view} 뷰 SVG`);
    }
  } finally { await rm(dir, { recursive: true, force: true }); }
});

// diagram-svg: 뷰 SVG 마다 PR 본문 링크 안내(막지 않음). 레거시 HTML 은 forge 가 소스로 보이므로 안내하지 않는다.
// 생략 기록이 있어도(다른 뷰의 생략일 수 있다) 있는 SVG 는 안내한다.
test('pr-check: 있는 뷰 SVG 마다 PR 본문 링크를 안내하고 통과한다 — 레거시 HTML 은 링크하지 않는다', async () => {
  const dir = await repo();
  try {
    await writeTask(dir, 't', { files: { 'artifact.md': FILLED['artifact.md'].replace('- 채움\n', `- 채움\n${SKIP_LINE}\n`) } });
    await writeFile(join(dir, 'docs/u/t/t-diagram-sequence.svg'), VIEW_SVG);
    await writeFile(join(dir, 'docs/u/t/t-diagram-module.svg'), VIEW_SVG);
    await commit(dir);
    assert.deepEqual((await check(dir, 'HEAD')).tasks[0].notes, [
      'PR 본문에 링크: docs/u/t/t-diagram-sequence.svg',
      'PR 본문에 링크: docs/u/t/t-diagram-module.svg',
    ]);
    const { out, exitCode } = await capture(() => runPrCheck({ targetDir: dir, flags: { base: 'main' } }));
    assert.equal(exitCode, undefined, out);
    assert.match(out, /✓ pr-check HEAD: u\/t\n  · PR 본문에 링크: docs\/u\/t\/t-diagram-sequence\.svg\n  · PR 본문에 링크: docs\/u\/t\/t-diagram-module\.svg/);
  } finally { await rm(dir, { recursive: true, force: true }); }
});

// codex 1차 P2: 커밋된 뷰 SVG 가 자립성 검사에 걸리면 링크하지 않는다(깨진 그림을 걸지 않는다) — 막지는 않는다.
test('pr-check: 자립하지 않는 뷰 SVG 는 링크하지 않고 알린다 — 통과는 그대로', async () => {
  const dir = await repo();
  try {
    await writeTask(dir, 't');
    await writeFile(join(dir, 'docs/u/t/t-diagram-sequence.svg'), '<svg xmlns="http://www.w3.org/2000/svg"><image href="https://x/y.png"/></svg>');
    await writeFile(join(dir, 'docs/u/t/t-diagram-module.svg'), '<svg/>');
    await commit(dir);
    const r = await check(dir, 'HEAD');
    assert.deepEqual(r.tasks[0].issues, []);
    assert.deepEqual(r.tasks[0].notes, [
      '뷰 SVG 가 자립형이 아님 — 링크하지 않음: docs/u/t/t-diagram-sequence.svg (외부 href: https://x/y.png; `harness-team diagram record --view sequence` 로 확인)',
      '뷰 SVG 가 자립형이 아님 — 링크하지 않음: docs/u/t/t-diagram-module.svg (루트 <svg> 에 xmlns="http://www.w3.org/2000/svg" 없음; `harness-team diagram record --view module` 로 확인)',
    ]);
  } finally { await rm(dir, { recursive: true, force: true }); }
});

// codex 1차 P2: 하네스가 하위 디렉터리(모노레포 패키지)에 있으면 링크 경로는 저장소 루트 기준이어야 blob URL 이 맞는다.
test('pr-check: 하위 디렉터리 설치에서 PR 링크 경로는 저장소 루트 기준이다', async () => {
  const dir = await repo();
  try {
    const pkg = join(dir, 'pkg');
    await mkdir(pkg, { recursive: true });
    await writeTask(pkg, 't');
    await writeFile(join(pkg, 'docs/u/t/t-diagram-module.svg'), VIEW_SVG);
    await commit(dir);
    const r = await collectPrCheck({ targetDir: pkg, base: 'main', rev: 'HEAD' });
    assert.deepEqual(r.tasks.map(t => t.notes), [['PR 본문에 링크: pkg/docs/u/t/t-diagram-module.svg']]);
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

// origin 은 있는데 origin/HEAD·origin/main·origin/master 가 없다 — 훅(`--base` 없음)이 실제로 닿는 `default-base`.
// 원격 추적 ref 가 하나는 있어야 한다: 비어 있으면 `originIsEmpty` 로 조용히 통과한다.
async function originWithoutDefault(dir) {
  await git(dir, 'remote', 'add', 'origin', join(dir, 'no-such-remote'));
  await git(dir, 'update-ref', 'refs/remotes/origin/develop', 'HEAD');
}

test('pr-check: base 를 판정하지 못하면 차단(exit 1) — pre-push 는 set-head 와 --no-verify 를 알린다', async () => {
  const dir = await repo();
  try {
    await originWithoutDefault(dir);
    const stdin = `refs/heads/feature ${'a'.repeat(40)} refs/heads/feature ${'0'.repeat(40)}\n`;
    const { out, exitCode } = await capture(() => runPrCheck({ targetDir: dir, flags: { 'pre-push': true } }, { readStdin: async () => stdin }));
    assert.equal(exitCode, 1);
    assert.match(out, /git remote set-head origin -a/);
    assert.match(out, /--no-verify/);
  } finally { await rm(dir, { recursive: true, force: true }); }
});

// base 오류 retry 는 원인 종류(`resolveScope` 의 errorKind)로 고른다 — set-head 는 기본 base 를 못 찾았을 때만 고친다.
// pr-check 는 diff scope 고정이라 어느 종류에도 `--scope worktree` 를 권하지 않는다(followups 21).
async function baseErrorPacket(dir, flags, stdin) {
  const { out, exitCode } = await capture(() => runPrCheck({ targetDir: dir, flags: { ...flags, json: true } }, { readStdin: async () => stdin }));
  assert.equal(exitCode, 1);
  const err = JSON.parse(out).error;
  assert.ok(!err.safe_retry.includes('worktree'), err.safe_retry);
  return err;
}

test('pr-check base error retry: a missing --base asks for an existing ref, not set-head', async () => {
  const dir = await repo();
  try {
    const err = await baseErrorPacket(dir, { base: 'nope' });
    assert.match(err.root_cause, /base ref "nope" 를 찾을 수 없음/);
    assert.equal(err.safe_retry, '존재하는 `--base <ref>` 로 기준을 직접 주고 다시 실행');
  } finally { await rm(dir, { recursive: true, force: true }); }
});

test('pr-check base error retry: a failed default-base inference keeps the set-head hint', async () => {
  const dir = await repo();
  try {
    await originWithoutDefault(dir);
    const err = await baseErrorPacket(dir, {});
    assert.match(err.root_cause, /기본 브랜치를 판정하지 못함/);
    assert.equal(err.safe_retry, '`--base <ref>` 로 기준을 직접 주거나 `git remote set-head origin -a` 로 origin/HEAD 를 설정');
  } finally { await rm(dir, { recursive: true, force: true }); }
});

test('pr-check base error retry: outside a git repo it points at a repository', async () => {
  const dir = await mkdtemp(join(tmpdir(), 'harness-prcheck-nogit-'));
  try {
    const err = await baseErrorPacket(dir, { base: 'main' });
    assert.match(err.root_cause, /git 저장소가 아니라/);
    assert.equal(err.safe_retry, 'git 저장소 안에서 실행하거나 `--target <저장소 경로>` 로 저장소를 가리켜 다시 실행');
  } finally { await rm(dir, { recursive: true, force: true }); }
});

test('pr-check base error retry: a diff failure asks for a base that shares history with HEAD — pre-push asks to check out such a branch', async () => {
  const dir = await repo();
  try {
    await git(dir, 'checkout', '-q', '--orphan', 'unrelated');
    await git(dir, 'commit', '-qm', 'unrelated root');
    await git(dir, 'checkout', '-q', 'feature');
    const err = await baseErrorPacket(dir, { base: 'unrelated' });
    assert.match(err.root_cause, /diff 계산 실패/);
    assert.equal(err.safe_retry, 'HEAD 와 공통 조상이 있는 `--base <ref>` 를 주고 다시 실행(`git merge-base <ref> HEAD` 로 확인)');

    // 훅은 `--base` 없이 부른다 — 기본 브랜치와 무관한 HEAD(gh-pages 같은 orphan 브랜치)를 체크아웃한 채 push 하면 여기 닿는다.
    await git(dir, 'remote', 'add', 'origin', join(dir, 'no-such-remote'));
    await git(dir, 'update-ref', 'refs/remotes/origin/main', 'main');
    await git(dir, 'checkout', '-q', 'unrelated');
    const stdin = `refs/heads/feature ${'a'.repeat(40)} refs/heads/feature ${'0'.repeat(40)}\n`;
    const pushed = await baseErrorPacket(dir, { 'pre-push': true }, stdin);
    assert.match(pushed.root_cause, /diff 계산 실패/);
    assert.equal(pushed.safe_retry, '기본 브랜치와 공통 조상이 있는 브랜치를 체크아웃한 뒤 다시 push — 훅은 체크아웃된 HEAD 로 base 를 판정한다(`git merge-base <기본 브랜치> HEAD` 로 확인)');
    assert.deepEqual(pushed.alternatives, ['검사 없이 push 하려면 `git push --no-verify` (git 표준 우회)']);
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

// 기본 브랜치와 공통 조상이 없는 브랜치(gh-pages 등)는 그 기본 브랜치로 PR 을 열 수 없다 — 기본 브랜치 push 처럼 건너뛴다(followups 23).
// 전에는 HEAD 로 base 판정을 통과한 뒤 그 sha 의 diff 가 throw 해 스택 트레이스로 죽었다. 같은 push 의 관련 브랜치는 여전히 검사된다.
test('pr-check --pre-push: 기본 브랜치와 무관한 히스토리의 브랜치는 건너뛰고, 관련 브랜치는 그대로 검사한다', async () => {
  const dir = await repo();
  try {
    await git(dir, 'checkout', '-q', '--orphan', 'gh-pages');
    await git(dir, 'commit', '-qm', 'pages');
    const { stdout: pages } = await git(dir, 'rev-parse', 'HEAD');
    await git(dir, 'checkout', '-q', 'feature');
    await writeTask(dir, 't', { files: { 'spec.md': 'template' } });
    await commit(dir);
    const { stdout: feature } = await git(dir, 'rev-parse', 'HEAD');
    await git(dir, 'remote', 'add', 'origin', join(dir, 'no-such-remote'));
    await git(dir, 'update-ref', 'refs/remotes/origin/main', 'main');
    const zero = '0'.repeat(40);
    const pagesLine = `refs/heads/gh-pages ${pages.trim()} refs/heads/gh-pages ${zero}\n`;

    const only = await capture(() => runPrCheck({ targetDir: dir, flags: { 'pre-push': true } }, { readStdin: async () => pagesLine }));
    assert.equal(only.exitCode, undefined);
    assert.equal(only.out, '');

    const both = pagesLine + `refs/heads/feature ${feature.trim()} refs/heads/feature ${zero}\n`;
    const mixed = await capture(() => runPrCheck({ targetDir: dir, flags: { 'pre-push': true } }, { readStdin: async () => both }));
    assert.equal(mixed.exitCode, 1);
    assert.match(mixed.out, /✗ pr-check feature: u\/t/);
    assert.ok(!mixed.out.includes('gh-pages'), mixed.out);
  } finally { await rm(dir, { recursive: true, force: true }); }
});

// diff-failed cause 는 git stderr 의 `fatal:` 줄을 고르므로, 번역된 로케일이면 접두를 못 찾고 사용법 안내 줄로 떨어진다.
// 그 diff 와 23 의 merge-base 판정만 LC_ALL=C 로 부른다. 번역 카탈로그 없는 git(macOS Xcode 등)에서는 메시지가 번역되지
// 않아 재현이 안 되므로, PATH 의 git 래퍼가 받은 LC_ALL 을 기록해 두 호출만 C 를 받는지 단언한다.
test('pr-check: 지역화 env 에서도 diff·merge-base 호출만 LC_ALL=C 로 불러 cause 가 fatal: 줄을 싣는다', async () => {
  const dir = await repo();
  const bin = await mkdtemp(join(tmpdir(), 'harness-prcheck-gitwrap-'));
  const saved = { PATH: process.env.PATH, LANG: process.env.LANG, LC_ALL: process.env.LC_ALL };
  try {
    await git(dir, 'checkout', '-q', '--orphan', 'gh-pages');
    await git(dir, 'commit', '-qm', 'pages');
    const { stdout: pages } = await git(dir, 'rev-parse', 'HEAD');
    await git(dir, 'checkout', '-q', 'feature');
    await git(dir, 'remote', 'add', 'origin', join(dir, 'no-such-remote'));
    await git(dir, 'update-ref', 'refs/remotes/origin/main', 'main');

    const { stdout: realGit } = await pexec('sh', ['-c', 'command -v git']);
    const log = join(bin, 'calls.log');
    await writeFile(join(bin, 'git'), `#!/bin/sh\nprintf '%s|%s\\n' "\${LC_ALL-}" "$*" >> '${log}'\nexec '${realGit.trim()}' "$@"\n`);
    await chmod(join(bin, 'git'), 0o755);
    process.env.PATH = `${bin}:${saved.PATH}`;
    process.env.LANG = 'ko_KR.UTF-8';
    process.env.LC_ALL = 'ko_KR.UTF-8';

    const stdin = `refs/heads/gh-pages ${pages.trim()} refs/heads/gh-pages ${'0'.repeat(40)}\n`;
    const pushed = await capture(() => runPrCheck({ targetDir: dir, flags: { 'pre-push': true } }, { readStdin: async () => stdin }));
    assert.equal(pushed.exitCode, undefined);

    await git(dir, 'checkout', '-q', '--orphan', 'nocommit');
    const err = await baseErrorPacket(dir, { base: 'main' });
    assert.match(err.root_cause, /^diff 계산 실패: fatal: /);

    const calls = (await readFile(log, 'utf8')).trim().split('\n').map(line => {
      const at = line.indexOf('|');
      return { lcAll: line.slice(0, at), args: line.slice(at + 1) };
    });
    const targeted = calls.filter(c => / (diff --stat|merge-base refs\/remotes\/origin\/main [0-9a-f]{40})/.test(c.args));
    assert.ok(targeted.some(c => c.args.includes('diff --stat')), JSON.stringify(calls));
    assert.ok(targeted.some(c => c.args.includes('merge-base')), JSON.stringify(calls));
    assert.ok(targeted.every(c => c.lcAll === 'C'), JSON.stringify(targeted));
    // 공용 헬퍼의 다른 호출은 사용자 로케일 그대로다 — 출력을 파싱하는 명령에 영향을 주지 않는다.
    assert.ok(calls.filter(c => !targeted.includes(c)).every(c => c.lcAll === 'ko_KR.UTF-8'), JSON.stringify(calls));
  } finally {
    for (const [key, value] of Object.entries(saved)) {
      if (value === undefined) delete process.env[key]; else process.env[key] = value;
    }
    await rm(dir, { recursive: true, force: true });
    await rm(bin, { recursive: true, force: true });
  }
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

// ---- S3 (done-derive R7): plan 이 전부 체크된 변경 task 는 pre-push 에서 done 가드를 같이 돈다 ----

const SPEC_REVIEW_REQUIRED = '# t — Spec\n\n## 목적 / 요구사항\n채움\n\n## Done evidence\n\n```json\n{ "version": 1, "review": "required" }\n```\n';
const headStdin = async dir => {
  const sha = (await git(dir, 'rev-parse', 'HEAD')).stdout.trim();
  return `refs/heads/feature ${sha} refs/heads/feature ${'0'.repeat(40)}\n`;
};
const prePush = (dir, stdin, flags = {}) =>
  capture(() => runPrCheck({ targetDir: dir, flags: { base: 'main', 'pre-push': true, ...flags } }, { readStdin: async () => stdin }));

test('pr-check --pre-push (S3): plan 전부 체크 + done 가드 issue → 실패, 문서 누락 안내는 내지 않는다', async () => {
  const dir = await repo();
  try {
    await writeTask(dir, 't', { files: { 'spec.md': SPEC_REVIEW_REQUIRED } });
    await commit(dir);
    const r = await prePush(dir, await headStdin(dir));
    assert.equal(r.exitCode, 1, r.out);
    assert.match(r.out, /✗ pr-check feature: u\/t/);
    assert.match(r.out, /- done 가드 — spec이 `review: required`/);
    assert.match(r.out, /done 가드를 통과하지 못했습니다/);
    assert.doesNotMatch(r.out, /task 문서가 빠졌습니다/);

    // CI·수동 실행(--pre-push 없음)은 종전대로 문서만 본다.
    const ci = await capture(() => runPrCheck({ targetDir: dir, flags: { base: 'main' } }));
    assert.equal(ci.exitCode, undefined, ci.out);
    assert.doesNotMatch(ci.out, /done 가드/);
  } finally { await rm(dir, { recursive: true, force: true }); }
});

test('pr-check --pre-push (S3): 유효한 우회 기록(forcedAt)이면 경고만 내고 통과, 재개 뒤의 옛 기록은 무효', async () => {
  const dir = await repo();
  try {
    await writeTask(dir, 't', { files: { 'spec.md': SPEC_REVIEW_REQUIRED } });
    const metaPath = join(dir, 'docs/u/t/t-meta.json');
    await writeFile(metaPath, JSON.stringify({ forcedAt: '2026-11-18T00:00:00.000Z', forcedIssues: ['x'] }) + '\n');
    await commit(dir);
    let r = await prePush(dir, await headStdin(dir));
    assert.equal(r.exitCode, undefined, r.out);
    assert.match(r.out, /· 경고: done 가드 — spec이 `review: required`.*forcedAt 2026-11-18/);

    await writeFile(metaPath, JSON.stringify({ forcedAt: '2026-11-18T00:00:00.000Z', reopenedAt: '2026-11-19T00:00:00.000Z' }) + '\n');
    await commit(dir);
    r = await prePush(dir, await headStdin(dir));
    assert.equal(r.exitCode, 1, r.out);
  } finally { await rm(dir, { recursive: true, force: true }); }
});

test('pr-check --pre-push (S3): 미완 단계가 남은 plan 은 가드 대상이 아니다', async () => {
  const dir = await repo();
  try {
    await writeTask(dir, 't', { files: { 'spec.md': SPEC_REVIEW_REQUIRED, 'plan.md': '# t — Plan\n\n## 단계\n- [x] 1. a\n- [ ] 2. b\n' } });
    await commit(dir);
    const r = await prePush(dir, await headStdin(dir));
    assert.equal(r.exitCode, undefined, r.out);
    assert.doesNotMatch(r.out, /done 가드/);
  } finally { await rm(dir, { recursive: true, force: true }); }
});

test('pr-check --pre-push (S3): HEAD 가 아닌 sha·미정리 트리에서는 가드를 건너뛰고 그 사실을 안내한다', async () => {
  const dir = await repo();
  try {
    await writeTask(dir, 't', { files: { 'spec.md': SPEC_REVIEW_REQUIRED } });
    await commit(dir);
    const stdin = await headStdin(dir);
    await writeFile(join(dir, 'scratch.txt'), 'untracked\n');
    let r = await prePush(dir, stdin);
    assert.equal(r.exitCode, undefined, r.out);
    assert.match(r.out, /· done 가드 건너뜀/);

    await rm(join(dir, 'scratch.txt'));
    await writeFile(join(dir, 'README.md'), 'y\n');
    await commit(dir, 'after'); // push 되는 sha(이전 커밋) ≠ HEAD
    r = await prePush(dir, stdin);
    assert.equal(r.exitCode, undefined, r.out);
    assert.match(r.out, /· done 가드 건너뜀/);
  } finally { await rm(dir, { recursive: true, force: true }); }
});

test('pr-check --pre-push --json (S3): 가드만 실패하면 summary·nextActions 가 문서 누락이 아니라 가드를 말한다', async () => {
  const dir = await repo();
  try {
    await writeTask(dir, 't', { files: { 'spec.md': SPEC_REVIEW_REQUIRED } });
    await commit(dir);
    const r = await prePush(dir, await headStdin(dir), { json: true });
    assert.equal(r.exitCode, 1, r.out);
    const env = JSON.parse(r.out);
    assert.match(env.summary, /done 가드를 통과하지 못함/);
    assert.doesNotMatch(env.summary, /문서가 빠짐/);
    assert.equal(env.next_actions.length, 1);
    assert.match(env.next_actions[0], /harness-team done/);
  } finally { await rm(dir, { recursive: true, force: true }); }
});

import { test } from 'node:test';
import assert from 'node:assert/strict';
import { mkdtemp, mkdir, writeFile, readFile, rm } from 'node:fs/promises';
import { join } from 'node:path';
import { tmpdir } from 'node:os';
import { runDone, renderUserHandoff, taskArtifactTemplate } from '../src/commands/task.mjs';

// `docs/<user>/<user>-handoff.md` 는 AGENTS.md 가 규정한 **세션 진입점**이다. 이 파일이
// 종결된 task 를 계속 "Active Task" 로 가리키면 다음 세션이 끝난 작업으로 안내된다.
// 아래 테스트들이 고정하는 것은 그 상태가 다시 생기지 않는다는 것이다.

const USER = 'tester';
const TASK = 'demo';

// 결함 재현의 출발점 — 훅이 활성 시절에 써 둔 모양 그대로 심는다.
const ACTIVE_SEED = `# Session Handoff

## Active Task
${TASK}

## Last Commit (2026-08-27)
abc1234 work in progress

## Full Context
→ docs/${USER}/${TASK}/${TASK}-handoff.md
`;

async function makeFixture({ plan, artifact, userHandoff = ACTIVE_SEED } = {}) {
  const dir = await mkdtemp(join(tmpdir(), 'harness-uhandoff-'));
  await mkdir(join(dir, '.harness'), { recursive: true });
  await writeFile(
    join(dir, '.harness/active.json'),
    JSON.stringify({ user: USER, task: TASK, path: `docs/${USER}/${TASK}` }),
  );
  const taskDir = join(dir, 'docs', USER, TASK);
  await mkdir(taskDir, { recursive: true });
  await writeFile(join(taskDir, `${TASK}-handoff.md`), `# ${TASK} — Handoff\n`);
  if (plan !== undefined) await writeFile(join(taskDir, `${TASK}-plan.md`), plan);
  if (artifact !== undefined) await writeFile(join(taskDir, `${TASK}-artifact.md`), artifact);
  const userHandoffPath = join(dir, 'docs', USER, `${USER}-handoff.md`);
  if (userHandoff !== null) await writeFile(userHandoffPath, userHandoff);
  return { dir, taskDir, userHandoffPath };
}

// 가드를 통과하는 fixture (비-git tmpdir → git 체크는 skip 된다)
const passing = {
  plan: `# ${TASK} — Plan\n\n## 단계\n- [x] done\n`,
  artifact: taskArtifactTemplate(TASK) + '\n- 실제 결과\n',
};
// 가드에 걸리는 fixture
const blocked = {
  plan: `# ${TASK} — Plan\n\n## 단계\n- [ ] 미완\n`,
  artifact: taskArtifactTemplate(TASK),
};

function captureLogs() {
  const logs = [];
  const orig = console.log;
  console.log = (...a) => logs.push(a.join(' '));
  return { logs, restore: () => { console.log = orig; } };
}

async function runDoneCapture(dir, flags = {}) {
  const prevExit = process.exitCode;
  const { logs, restore } = captureLogs();
  try {
    await runDone({ targetDir: dir, flags });
    return { logs, exitCode: process.exitCode };
  } finally {
    restore();
    process.exitCode = prevExit;
  }
}

// `## Active Task` 본문만 잘라낸다. 종결 형태의 포인터 줄에도 task 이름이 들어가므로
// 파일 전체에 `includes(TASK)`를 걸면 항상 참이 되어 아무것도 검사하지 못한다.
function sectionBody(content, heading) {
  const lines = content.split('\n');
  const start = lines.findIndex(l => l.trim() === heading || l.trim().startsWith(heading + ' '));
  if (start === -1) return null;
  const body = [];
  for (const line of lines.slice(start + 1)) {
    if (line.startsWith('## ')) break;
    body.push(line);
  }
  return body.join('\n').trim();
}

// task 이름을 낱말 경계로 찾는다 — 포인터 경로 안의 부분 일치에 걸리지 않게.
const namesTask = (s) => new RegExp(`(^|[^\\w-])${TASK}([^\\w-]|$)`).test(s ?? '');

test('sectionBody 헬퍼가 다음 헤딩에서 멈춘다 (검사 자체의 신뢰성)', () => {
  const doc = '# T\n\n## A\nalpha\n\n## B\nbeta\n';
  assert.equal(sectionBody(doc, '## A'), 'alpha');
  assert.equal(sectionBody(doc, '## B'), 'beta');
  assert.equal(sectionBody(doc, '## C'), null);
});

// ─── R1: done 성공 → 사용자 handoff 가 종결된 task 를 활성으로 선언하지 않는다 ───

test('done 성공 → Active Task 가 더는 종결된 task 를 가리키지 않는다', async () => {
  const { dir, userHandoffPath } = await makeFixture(passing);
  try {
    const { logs } = await runDoneCapture(dir);
    assert.ok(logs.some(l => l.startsWith('done:')), 'done 이 실제로 진행됐다');

    const after = await readFile(userHandoffPath, 'utf8');
    const active = sectionBody(after, '## Active Task');
    assert.ok(active !== null, '## Active Task 섹션은 남아 있다');
    assert.ok(!namesTask(active), `Active Task 본문이 종결된 task 를 가리키면 안 된다: ${JSON.stringify(active)}`);
  } finally { await rm(dir, { recursive: true, force: true }); }
});

test('done 성공 → 종결된 task 는 Last Completed Task 로 분리 표기된다', async () => {
  const { dir, userHandoffPath } = await makeFixture(passing);
  try {
    await runDoneCapture(dir);
    const completed = sectionBody(await readFile(userHandoffPath, 'utf8'), '## Last Completed Task');
    assert.ok(completed !== null, '## Last Completed Task 섹션이 있다');
    assert.ok(namesTask(completed), '종결된 task 이름을 담는다');
  } finally { await rm(dir, { recursive: true, force: true }); }
});

// bbbc885 가 세운 형식 계약 — 훅이 더는 이 파일을 갱신하지 않으므로 고정 sha 를 박으면
// 커밋 즉시 낡는다. 계속 갱신되는 task handoff 로 포인터를 돌린다.
test('done 성공 → 고정 sha 없이 task handoff 포인터를 남긴다 (decay 방지)', async () => {
  const { dir, userHandoffPath } = await makeFixture(passing);
  try {
    await runDoneCapture(dir);
    const after = await readFile(userHandoffPath, 'utf8');
    assert.match(after, new RegExp(`docs/${USER}/${TASK}/${TASK}-handoff\\.md`), 'task handoff 포인터');
    assert.ok(!after.includes('abc1234'), '활성 시절의 낡은 sha 가 남아 있으면 안 된다');
    assert.ok(!/\b[0-9a-f]{7,40}\b/.test(after), `종결 형태에 고정 sha 를 박으면 안 된다:\n${after}`);
  } finally { await rm(dir, { recursive: true, force: true }); }
});

test('사용자 handoff 파일이 없어도 done 이 만들어 준다', async () => {
  const { dir, userHandoffPath } = await makeFixture({ ...passing, userHandoff: null });
  try {
    await runDoneCapture(dir);
    const after = await readFile(userHandoffPath, 'utf8');
    assert.match(after, /## Active Task/, '없던 파일을 종결 형태로 생성한다');
  } finally { await rm(dir, { recursive: true, force: true }); }
});

test('done 성공 → 갱신 사실을 stdout 으로 알린다', async () => {
  const { dir } = await makeFixture(passing);
  try {
    const { logs } = await runDoneCapture(dir);
    assert.ok(
      logs.some(l => l.includes(`docs/${USER}/${USER}-handoff.md`)),
      '사용자 handoff 경로를 보고한다',
    );
  } finally { await rm(dir, { recursive: true, force: true }); }
});

// ─── R2: 차단된 done 은 파일을 건드리지 않는다 ─────────────────────────────

// 차단된 done 이 "활성 없음" 을 선언하면 active.json 은 여전히 task 를 가리키는데
// 진입점만 비는 셈 — 고치려는 것과 같은 종류의 거짓말이다.
test('done 차단 → 사용자 handoff 는 바이트 단위로 그대로다', async () => {
  const { dir, userHandoffPath } = await makeFixture(blocked);
  try {
    const { exitCode } = await runDoneCapture(dir);
    assert.equal(exitCode, 1, '가드가 차단했다');
    assert.equal(await readFile(userHandoffPath, 'utf8'), ACTIVE_SEED, '차단 시 무변경');
  } finally { await rm(dir, { recursive: true, force: true }); }
});

test('done --force → 실제로 종결되므로 사용자 handoff 도 갱신된다', async () => {
  const { dir, userHandoffPath } = await makeFixture(blocked);
  try {
    const { logs } = await runDoneCapture(dir, { force: true });
    assert.ok(logs.some(l => l.startsWith('done:')), '--force 는 진행한다');
    const active = sectionBody(await readFile(userHandoffPath, 'utf8'), '## Active Task');
    assert.ok(!namesTask(active), '--force 로 종결해도 활성 선언은 사라진다');
  } finally { await rm(dir, { recursive: true, force: true }); }
});

test('활성 task 없음 → 사용자 handoff 를 건드리지 않는다 (조기 return 유지)', async () => {
  const dir = await mkdtemp(join(tmpdir(), 'harness-uhandoff-noactive-'));
  const userHandoffPath = join(dir, 'docs', USER, `${USER}-handoff.md`);
  await mkdir(join(dir, 'docs', USER), { recursive: true });
  await writeFile(userHandoffPath, ACTIVE_SEED);
  try {
    const { logs } = await runDoneCapture(dir);
    assert.ok(logs.some(l => l === 'no active task'), '기존 메시지 유지');
    assert.equal(await readFile(userHandoffPath, 'utf8'), ACTIVE_SEED, '무변경');
  } finally { await rm(dir, { recursive: true, force: true }); }
});

// ─── 렌더러 (순수 함수) ─────────────────────────────────────────────────────

test('renderUserHandoff: 활성 형태 — Active Task 와 Last Commit 을 담는다', () => {
  const out = renderUserHandoff({
    user: USER, task: TASK, date: '2026-08-28', commitMsg: 'abc1234 work', closed: false,
  });
  assert.equal(sectionBody(out, '## Active Task'), TASK);
  assert.match(out, /## Last Commit \(2026-08-28\)/);
  assert.equal(sectionBody(out, '## Last Commit'), 'abc1234 work');
  assert.equal(sectionBody(out, '## Full Context'), `→ docs/${USER}/${TASK}/${TASK}-handoff.md`);
  assert.equal(sectionBody(out, '## Last Completed Task'), null, '활성 형태에는 없다');
  assert.ok(out.endsWith('\n'), '개행으로 끝난다');
});

test('renderUserHandoff: 종결 형태 — Active Task 는 비고 Last Completed Task 가 생긴다', () => {
  const out = renderUserHandoff({ user: USER, task: TASK, date: '2026-08-28', closed: true });
  const active = sectionBody(out, '## Active Task');
  assert.ok(!namesTask(active), 'task 를 가리키지 않는다');
  assert.match(active, /없음/, '활성 없음을 명시한다');
  assert.match(active, /harness-team task/, '다음 행동을 안내한다');
  assert.match(out, /## Last Completed Task \(2026-08-28\)/);
  assert.ok(namesTask(sectionBody(out, '## Last Completed Task')), '종결된 task 이름을 담는다');
  assert.equal(sectionBody(out, '## Full Context'), `→ docs/${USER}/${TASK}/${TASK}-handoff.md`);
  assert.equal(sectionBody(out, '## Last Commit'), null, '종결 형태에는 낡지 않는 sha 가 없다');
});

// 렌더러가 한 곳이라는 것이 두 형태가 어긋나지 않는 근거다.
test('renderUserHandoff: 두 형태가 같은 제목·같은 포인터를 공유한다', () => {
  const common = { user: USER, task: TASK, date: '2026-08-28' };
  const open = renderUserHandoff({ ...common, commitMsg: 'abc1234 work', closed: false });
  const done = renderUserHandoff({ ...common, closed: true });
  for (const out of [open, done]) {
    assert.match(out, /^# Session Handoff\n/, '같은 문서 제목');
    assert.equal(sectionBody(out, '## Full Context'), `→ docs/${USER}/${TASK}/${TASK}-handoff.md`);
  }
});

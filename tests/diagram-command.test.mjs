import { test } from 'node:test';
import assert from 'node:assert/strict';
import { mkdtemp, mkdir, readFile, writeFile, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { runDiagram, closeDiagramStep, diagramRecordLine } from '../src/commands/diagram.mjs';
import { insertBeforeHeading, insertReviewBlock } from '../src/commands/review.mjs';

// 다이어그램 옵트인의 **기록** 단계 — artifact 한 줄 + plan 체크박스 — 를 CLI 가 함께 쓰는지 고정한다.
// 종전에는 `harness-diagram.md` 7번 · `harness-task.md` 6번 · `harness-ship.md` Record 가 각자 형식을
// 들고 있었고 세 문구가 이미 갈려 있었다.

const DIAGRAM_REL = 'docs/tester/demo/demo-diagram.html';
const OPEN_STEP = '- [ ] spec/plan 다이어그램 작성 → docs/tester/demo/demo-diagram.html';

const PLAN = `# demo — Plan

## 목표

x

## 단계

- [x] 준비
${OPEN_STEP}
- [ ] 구현

## 참고
-
`;

const ARTIFACT = `# demo — Artifact

## 결과

- 기존 결과 한 줄

## Reviews
*리뷰*

## Learnings

`;

async function fixture({ plan = PLAN, artifact = ARTIFACT, diagram = false, active = true } = {}) {
  const dir = await mkdtemp(join(tmpdir(), 'harness-diagram-cmd-'));
  await mkdir(join(dir, '.harness'), { recursive: true });
  if (active) {
    await writeFile(join(dir, '.harness/active.json'), JSON.stringify({ user: 'tester', task: 'demo', path: 'docs/tester/demo' }));
  }
  const taskDir = join(dir, 'docs', 'tester', 'demo');
  await mkdir(taskDir, { recursive: true });
  if (plan !== null) await writeFile(join(taskDir, 'demo-plan.md'), plan);
  if (artifact !== null) await writeFile(join(taskDir, 'demo-artifact.md'), artifact);
  if (diagram) await writeFile(join(taskDir, 'demo-diagram.html'), '<html><svg></svg></html>');
  return dir;
}

async function capture(fn) {
  const logs = [];
  const errs = [];
  const origLog = console.log;
  const origErr = console.error;
  const prevExit = process.exitCode;
  process.exitCode = undefined;
  console.log = (...a) => logs.push(a.join(' '));
  console.error = (...a) => errs.push(a.join(' '));
  try {
    await fn();
    return { logs, errs, exitCode: process.exitCode };
  } finally {
    console.log = origLog;
    console.error = origErr;
    process.exitCode = prevExit;
  }
}

const run = (dir, args, flags = {}) => runDiagram({ targetDir: dir, flags, taskArgs: args });
const readTask = async (dir, file) => readFile(join(dir, 'docs', 'tester', 'demo', `demo-${file}`), 'utf8');

// ---- 순수 함수 ----

test('diagramRecordLine: 생성·갱신·미실행 세 형식이 한 곳에서 나온다', () => {
  assert.equal(diagramRecordLine({ outcome: 'produced', diagram: DIAGRAM_REL, note: '', date: '2026-09-18', verb: '생성' }),
    `- 다이어그램: ${DIAGRAM_REL} 생성 (2026-09-18)`);
  assert.equal(diagramRecordLine({ outcome: 'produced', diagram: DIAGRAM_REL, note: 'Obsidian 확인', date: '2026-09-18', verb: '갱신' }),
    `- 다이어그램: ${DIAGRAM_REL} 갱신 — Obsidian 확인 (2026-09-18)`);
  assert.equal(diagramRecordLine({ outcome: 'skipped', note: '도구 없음', date: '2026-09-18' }),
    '- 다이어그램: 미실행 — 도구 없음 (2026-09-18)');
});

test('closeDiagramStep: 열린 단계를 만들면 [x] 로, 건너뛰면 사유를 붙여 닫는다 — 다른 줄은 그대로', () => {
  const produced = closeDiagramStep(PLAN, { outcome: 'produced' });
  assert.equal(produced.status, 'closed');
  assert.match(produced.plan, /^- \[x\] spec\/plan 다이어그램 작성 → docs\/tester\/demo\/demo-diagram\.html$/m);
  assert.match(produced.plan, /^- \[ \] 구현$/m);

  const skipped = closeDiagramStep(PLAN, { outcome: 'skipped', note: '도구 없음' });
  assert.equal(skipped.status, 'closed');
  assert.match(skipped.plan, /^- \[x\] spec\/plan 다이어그램 — 미실행\(도구 없음\)$/m);
  assert.doesNotMatch(skipped.plan, /demo-diagram\.html/);
});

test('closeDiagramStep: 닫힌 단계만 있으면 already-closed 로 plan 불변, 단계가 없으면 missing', () => {
  const closedPlan = PLAN.replace(OPEN_STEP, '- [x] spec/plan 다이어그램 — 미실행(도구 없음)');
  const closed = closeDiagramStep(closedPlan, { outcome: 'produced' });
  assert.equal(closed.status, 'already-closed');
  assert.equal(closed.plan, closedPlan);

  const none = closeDiagramStep(PLAN.replace(OPEN_STEP + '\n', ''), { outcome: 'produced' });
  assert.equal(none.status, 'missing');
});

test('closeDiagramStep: 줄머리 체크박스만 본다 — 산문 속 "- [ ]" 는 단계가 아니다', () => {
  const prose = PLAN.replace(OPEN_STEP, '산문 속 - [ ] spec/plan 다이어그램 이야기');
  assert.equal(closeDiagramStep(prose, { outcome: 'produced' }).status, 'missing');
});

test('closeDiagramStep: 정식 문구 `spec/plan 다이어그램` 만 옵트인 단계다 — 일반 "다이어그램" 단계는 건드리지 않는다 (codex P1 2회차)', () => {
  const generic = PLAN.replace(OPEN_STEP, '- [ ] 아키텍처 다이어그램을 README 에 추가');
  const result = closeDiagramStep(generic, { outcome: 'skipped', note: '도구 없음' });
  assert.equal(result.status, 'missing');
  assert.equal(result.plan, generic);
  // 둘이 함께 있으면 정식 문구만 닫는다.
  const both = PLAN.replace(OPEN_STEP, `- [ ] 아키텍처 다이어그램을 README 에 추가\n${OPEN_STEP}`);
  const closed = closeDiagramStep(both, { outcome: 'produced' });
  assert.equal(closed.status, 'closed');
  assert.match(closed.plan, /^- \[ \] 아키텍처 다이어그램을 README 에 추가$/m);
  assert.match(closed.plan, /^- \[x\] spec\/plan 다이어그램 작성 → /m);
});

test('closeDiagramStep: `## 단계` 절 밖의 체크박스는 옵트인 단계가 아니다 (codex P1 1회차)', () => {
  // ## 참고 에 든 다이어그램 체크박스 — 옵트인 단계가 아니므로 닫지 않고 missing.
  const outside = PLAN.replace(OPEN_STEP + '\n', '').replace('## 참고\n-\n', '## 참고\n- [ ] spec/plan 다이어그램 예시를 문서에 넣기\n');
  const result = closeDiagramStep(outside, { outcome: 'produced' });
  assert.equal(result.status, 'missing');
  assert.equal(result.plan, outside);
  // `## 단계` 절 자체가 없으면 단계가 들어갈 자리가 없다 — missing.
  assert.equal(closeDiagramStep('# p\n\n- [ ] spec/plan 다이어그램\n', { outcome: 'produced' }).status, 'missing');
});

test('insertBeforeHeading: fence 안의 같은 헤딩 문자열을 자리로 오인하지 않고, insertReviewBlock 동작은 그대로다', () => {
  const doc = '## 결과\n\n```text\n## Reviews\n## Learnings\n```\n\n## Reviews\n\n## Learnings\n';
  const out = insertBeforeHeading(doc, '\n- 줄\n', /^## Reviews\b/);
  assert.equal(out, '## 결과\n\n```text\n## Reviews\n## Learnings\n```\n\n- 줄\n\n## Reviews\n\n## Learnings\n');
  const review = insertReviewBlock(doc, '\n### R\n');
  assert.equal(review, '## 결과\n\n```text\n## Reviews\n## Learnings\n```\n\n## Reviews\n\n### R\n\n## Learnings\n');
  assert.equal(insertBeforeHeading('no heading\n', '\n- 줄\n', /^## Reviews\b/), 'no heading\n\n- 줄\n');
});

// ---- record: produced ----

test('record (produced): 산출물이 있으면 artifact ## 결과 끝에 생성 줄 + plan 단계 [x]', async () => {
  const dir = await fixture({ diagram: true });
  try {
    const { exitCode, logs } = await capture(() => run(dir, ['record']));
    assert.equal(exitCode, undefined, logs.join('\n'));
    const artifact = await readTask(dir, 'artifact.md');
    assert.match(artifact, new RegExp(`^- 다이어그램: ${DIAGRAM_REL.replace(/[.]/g, '\\.')} 생성 \\(\\d{4}-\\d{2}-\\d{2}\\)$`, 'm'));
    // ## 결과 절 안(## Reviews 앞)에 들어간다 — retro 처럼 EOF 가 아니다.
    assert.ok(artifact.indexOf('- 다이어그램:') < artifact.indexOf('## Reviews'));
    assert.ok(artifact.indexOf('- 기존 결과 한 줄') < artifact.indexOf('- 다이어그램:'));
    const plan = await readTask(dir, 'plan.md');
    assert.match(plan, /^- \[x\] spec\/plan 다이어그램 작성 → /m);
    assert.match(logs.join('\n'), /plan: closed/);
  } finally { await rm(dir, { recursive: true, force: true }); }
});

test('record (produced): 두 번째 기록은 갱신 — 파일 상태가 아니라 artifact 기록으로 판정한다', async () => {
  const dir = await fixture({ diagram: true });
  try {
    await capture(() => run(dir, ['record']));
    await capture(() => run(dir, ['record', '범례', '추가']));
    const artifact = await readTask(dir, 'artifact.md');
    assert.match(artifact, /생성 \(\d{4}-\d{2}-\d{2}\)\n- 다이어그램: docs\/tester\/demo\/demo-diagram\.html 갱신 — 범례 추가 \(\d{4}-\d{2}-\d{2}\)/);
  } finally { await rm(dir, { recursive: true, force: true }); }
});

test('record (produced): 산출물이 없으면 exit 1 + 에러 패킷, artifact·plan 둘 다 불변', async () => {
  const dir = await fixture({ diagram: false });
  try {
    const { exitCode, logs } = await capture(() => run(dir, ['record']));
    assert.equal(exitCode, 1);
    assert.match(logs.join('\n'), /demo-diagram\.html/);
    assert.equal(await readTask(dir, 'artifact.md'), ARTIFACT);
    assert.equal(await readTask(dir, 'plan.md'), PLAN);
  } finally { await rm(dir, { recursive: true, force: true }); }
});

// ---- record: skipped ----

test('record --skipped <사유>: 미실행 줄 + plan 단계를 사유 붙여 닫는다', async () => {
  const dir = await fixture();
  try {
    const { exitCode } = await capture(() => run(dir, ['record', '도구', '없음'], { skipped: true }));
    assert.equal(exitCode, undefined);
    assert.match(await readTask(dir, 'artifact.md'), /^- 다이어그램: 미실행 — 도구 없음 \(\d{4}-\d{2}-\d{2}\)$/m);
    assert.match(await readTask(dir, 'plan.md'), /^- \[x\] spec\/plan 다이어그램 — 미실행\(도구 없음\)$/m);
  } finally { await rm(dir, { recursive: true, force: true }); }
});

test('record --skipped: 사유가 없으면 exit 2 이고 쓰지 않는다 — "미실행" 만으로는 "묻지 않은 것" 과 구분되지 않는다', async () => {
  const dir = await fixture();
  try {
    const { exitCode } = await capture(() => run(dir, ['record'], { skipped: true }));
    assert.equal(exitCode, 2);
    assert.equal(await readTask(dir, 'artifact.md'), ARTIFACT);
    assert.equal(await readTask(dir, 'plan.md'), PLAN);
  } finally { await rm(dir, { recursive: true, force: true }); }
});

test('record --skipped: 개행이 든 사유는 한 줄로 접힌다 — plan 에 새 체크박스를 주입하지 못한다 (codex P2 1회차)', async () => {
  const dir = await fixture();
  try {
    const { exitCode } = await capture(() => run(dir, ['record', '도구 없음\n- [ ] 주입된 단계'], { skipped: true }));
    assert.equal(exitCode, undefined);
    const plan = await readTask(dir, 'plan.md');
    assert.doesNotMatch(plan, /^- \[ \] 주입된 단계$/m);
    assert.match(plan, /^- \[x\] spec\/plan 다이어그램 — 미실행\(도구 없음 - \[ \] 주입된 단계\)$/m);
    assert.doesNotMatch(await readTask(dir, 'artifact.md'), /^- \[ \] 주입된 단계$/m);
  } finally { await rm(dir, { recursive: true, force: true }); }
});

test('record: artifact 가 없으면 템플릿에서 시작해 ## 결과 절 안에 넣는다 (codex P2 1회차)', async () => {
  const dir = await fixture({ diagram: true, artifact: null });
  try {
    const { exitCode } = await capture(() => run(dir, ['record']));
    assert.equal(exitCode, undefined);
    const artifact = await readTask(dir, 'artifact.md');
    assert.match(artifact, /^## 결과$/m);
    assert.match(artifact, /^## Reviews$/m);
    assert.ok(artifact.indexOf('## 결과') < artifact.indexOf('- 다이어그램:') && artifact.indexOf('- 다이어그램:') < artifact.indexOf('## Reviews'));
  } finally { await rm(dir, { recursive: true, force: true }); }
});

// ---- plan 상태 ----

test('record: plan 에 다이어그램 단계가 없으면 exit 1 — 옵트인은 기록 명령이 만들지 않는다', async () => {
  const dir = await fixture({ diagram: true, plan: PLAN.replace(OPEN_STEP + '\n', '') });
  try {
    const { exitCode, logs } = await capture(() => run(dir, ['record']));
    assert.equal(exitCode, 1);
    assert.match(logs.join('\n'), /harness-task\.md/);
    assert.equal(await readTask(dir, 'artifact.md'), ARTIFACT);
  } finally { await rm(dir, { recursive: true, force: true }); }
});

test('record: 닫힌 단계만 있으면 plan 은 그대로 두고 artifact 줄만 남긴다 (already-closed)', async () => {
  const closedPlan = PLAN.replace(OPEN_STEP, '- [x] spec/plan 다이어그램 — 미실행(도구 없음)');
  const dir = await fixture({ diagram: true, plan: closedPlan });
  try {
    const { exitCode, logs } = await capture(() => run(dir, ['record'], { json: true }));
    assert.equal(exitCode, undefined);
    const env = JSON.parse(logs.join('\n'));
    assert.equal(env.command, 'diagram');
    assert.equal(env.status, 'success');
    assert.equal(env.outcome, 'produced');
    assert.equal(env.plan, 'already-closed');
    assert.deepEqual(env.artifacts, ['docs/tester/demo/demo-artifact.md']);
    assert.equal(await readTask(dir, 'plan.md'), closedPlan);
    assert.match(await readTask(dir, 'artifact.md'), /생성 \(/);
  } finally { await rm(dir, { recursive: true, force: true }); }
});

// ---- 전제 ----

test('record: 활성 task 가 없으면 exit 1 + 에러 패킷 (--json 은 envelope)', async () => {
  const dir = await fixture({ active: false });
  try {
    const text = await capture(() => run(dir, ['record']));
    assert.equal(text.exitCode, 1);
    assert.match(text.logs.join('\n'), /활성 task/);
    const json = await capture(() => run(dir, ['record'], { json: true }));
    const env = JSON.parse(json.logs.join('\n'));
    assert.equal(env.status, 'error');
    assert.ok(env.error.root_cause);
  } finally { await rm(dir, { recursive: true, force: true }); }
});

test('diagram <action>: record 외 액션과 액션 없음은 exit 2 (--json 도 envelope)', async () => {
  const dir = await fixture();
  try {
    assert.equal((await capture(() => run(dir, ['draw']))).exitCode, 2);
    assert.equal((await capture(() => run(dir, []))).exitCode, 2);
    const json = await capture(() => run(dir, ['draw'], { json: true }));
    assert.equal(json.exitCode, 2);
    assert.equal(JSON.parse(json.logs.join('\n')).status, 'error');
  } finally { await rm(dir, { recursive: true, force: true }); }
});

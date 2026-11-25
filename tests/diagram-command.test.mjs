import { test } from 'node:test';
import assert from 'node:assert/strict';
import { mkdtemp, mkdir, readFile, writeFile, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { runDiagram, closeDiagramStep, diagramRecordLine, svgSelfContainmentViolations, DIAGRAM_SKIPPED_PREFIX } from '../src/commands/diagram.mjs';
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

// ---- 뷰별 다이어그램 (diagram-views) ----
// 뷰 단계 `spec/plan 다이어그램(<view>)` 은 `--view <view>` 만 닫는다. 레거시 단계·`--view` 없는 record 는 종전 그대로이고
// 뷰 단계를 건드리지 않는다 — 레거시 정규식이 뷰 단계까지 맞던 겹침이 회귀하지 않게 고정한다.

const SEQ_REL = 'docs/tester/demo/demo-diagram-sequence.svg';
const SEQ_STEP = `- [ ] spec/plan 다이어그램(sequence) 작성 → ${SEQ_REL}`;
const MOD_STEP = '- [ ] spec/plan 다이어그램(module) 작성 → docs/tester/demo/demo-diagram-module.svg';
const VIEW_PLAN = PLAN.replace(OPEN_STEP, `${SEQ_STEP}\n${MOD_STEP}`);
const MIXED_PLAN = PLAN.replace(OPEN_STEP, `${OPEN_STEP}\n${SEQ_STEP}\n${MOD_STEP}`);

// 뷰 산출물은 단독 SVG 다(diagram-svg). 기본 내용은 자립성 검사를 통과하는 최소 SVG.
const MIN_SVG = '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 10 10"><rect width="10" height="10"/></svg>\n';
async function writeView(dir, view, content = MIN_SVG) {
  await writeFile(join(dir, 'docs', 'tester', 'demo', `demo-diagram-${view}.svg`), content);
}

test('diagramRecordLine: 뷰 생략 줄은 머리를 그대로 두고 사유 앞에 [<view>] 를 붙인다', () => {
  assert.equal(diagramRecordLine({ outcome: 'skipped', note: '도구 없음', date: '2026-11-18', view: 'sequence' }),
    '- 다이어그램: 미실행 — [sequence] 도구 없음 (2026-11-18)');
  assert.ok(diagramRecordLine({ outcome: 'skipped', note: 'x', date: 'd', view: 'module' }).startsWith(DIAGRAM_SKIPPED_PREFIX));
  assert.equal(diagramRecordLine({ outcome: 'produced', diagram: SEQ_REL, date: '2026-11-18', view: 'sequence' }),
    `- 다이어그램: ${SEQ_REL} 생성 (2026-11-18)`);
});

test('closeDiagramStep: --view 없는 기록은 뷰 단계를 닫지 않는다 — 뷰 단계만 있으면 missing (열림·닫힘 모두)', () => {
  const open = closeDiagramStep(VIEW_PLAN, { outcome: 'skipped', note: '도구 없음' });
  assert.equal(open.status, 'missing');
  assert.equal(open.plan, VIEW_PLAN);
  const closedViews = VIEW_PLAN.replace(SEQ_STEP, SEQ_STEP.replace('- [ ]', '- [x]')).replace(MOD_STEP, MOD_STEP.replace('- [ ]', '- [x]'));
  assert.equal(closeDiagramStep(closedViews, { outcome: 'produced' }).status, 'missing', '닫힌 뷰 단계를 레거시 already-closed 로 세지 않는다');
});

test('closeDiagramStep: 레거시와 뷰가 섞이면 각 호출이 자기 단계만 닫는다', () => {
  const legacy = closeDiagramStep(MIXED_PLAN, { outcome: 'produced' });
  assert.equal(legacy.status, 'closed');
  assert.match(legacy.plan, /^- \[x\] spec\/plan 다이어그램 작성 → docs\/tester\/demo\/demo-diagram\.html$/m);
  assert.ok(legacy.plan.includes(SEQ_STEP) && legacy.plan.includes(MOD_STEP), '뷰 단계는 열린 채');

  const seq = closeDiagramStep(MIXED_PLAN, { outcome: 'produced', view: 'sequence' });
  assert.equal(seq.status, 'closed');
  assert.ok(seq.plan.includes(SEQ_STEP.replace('- [ ]', '- [x]')));
  assert.ok(seq.plan.includes(OPEN_STEP) && seq.plan.includes(MOD_STEP), '레거시·다른 뷰 단계는 열린 채');

  const mod = closeDiagramStep(MIXED_PLAN, { outcome: 'skipped', note: '도구 없음', view: 'module' });
  assert.equal(mod.status, 'closed');
  assert.match(mod.plan, /^- \[x\] spec\/plan 다이어그램\(module\) — 미실행\(도구 없음\)$/m);
  assert.ok(mod.plan.includes(OPEN_STEP) && mod.plan.includes(SEQ_STEP));
});

test('closeDiagramStep: 다른 뷰의 단계만 있으면 missing, 그 뷰가 닫혀 있으면 already-closed', () => {
  const seqOnly = PLAN.replace(OPEN_STEP, SEQ_STEP);
  assert.equal(closeDiagramStep(seqOnly, { outcome: 'produced', view: 'module' }).status, 'missing');
  assert.equal(closeDiagramStep(PLAN, { outcome: 'produced', view: 'sequence' }).status, 'missing', '레거시 단계는 뷰 단계가 아니다');
  const seqClosed = PLAN.replace(OPEN_STEP, '- [x] spec/plan 다이어그램(sequence) — 미실행(도구 없음)');
  const r = closeDiagramStep(seqClosed, { outcome: 'produced', view: 'sequence' });
  assert.equal(r.status, 'already-closed');
  assert.equal(r.plan, seqClosed);
});

test('record --view sequence (produced): 뷰 파일로 판정하고 그 뷰 단계만 닫는다 — envelope 에 view', async () => {
  const dir = await fixture({ plan: MIXED_PLAN });
  try {
    await writeView(dir, 'sequence');
    const { exitCode, logs } = await capture(() => run(dir, ['record'], { view: 'sequence', json: true }));
    assert.equal(exitCode, undefined, logs.join('\n'));
    const env = JSON.parse(logs.join('\n'));
    assert.equal(env.view, 'sequence');
    assert.equal(env.diagram, SEQ_REL);
    assert.equal(env.plan, 'closed');
    assert.match(await readTask(dir, 'artifact.md'), new RegExp(`^- 다이어그램: ${SEQ_REL.replace(/[.]/g, '\\.')} 생성 \\(\\d{4}-\\d{2}-\\d{2}\\)$`, 'm'));
    const plan = await readTask(dir, 'plan.md');
    assert.ok(plan.includes(SEQ_STEP.replace('- [ ]', '- [x]')));
    assert.ok(plan.includes(OPEN_STEP) && plan.includes(MOD_STEP));
  } finally { await rm(dir, { recursive: true, force: true }); }
});

test('record --view: 그 뷰 파일이 없으면 exit 1 — 레거시 파일이 있어도 대신하지 않는다', async () => {
  const dir = await fixture({ plan: MIXED_PLAN, diagram: true });
  try {
    const { exitCode, logs } = await capture(() => run(dir, ['record'], { view: 'sequence' }));
    assert.equal(exitCode, 1);
    assert.match(logs.join('\n'), /demo-diagram-sequence\.svg/);
    assert.equal(await readTask(dir, 'plan.md'), MIXED_PLAN);
    assert.equal(await readTask(dir, 'artifact.md'), ARTIFACT);
  } finally { await rm(dir, { recursive: true, force: true }); }
});

test('record --view module --skipped: [module] 생략 줄 + module 단계를 사유 붙여 닫는다', async () => {
  const dir = await fixture({ plan: MIXED_PLAN });
  try {
    const { exitCode } = await capture(() => run(dir, ['record', '도구', '없음'], { view: 'module', skipped: true }));
    assert.equal(exitCode, undefined);
    assert.match(await readTask(dir, 'artifact.md'), /^- 다이어그램: 미실행 — \[module\] 도구 없음 \(\d{4}-\d{2}-\d{2}\)$/m);
    const plan = await readTask(dir, 'plan.md');
    assert.match(plan, /^- \[x\] spec\/plan 다이어그램\(module\) — 미실행\(도구 없음\)$/m);
    assert.ok(plan.includes(OPEN_STEP) && plan.includes(SEQ_STEP));
  } finally { await rm(dir, { recursive: true, force: true }); }
});

test('record (--view 없음): 뷰 단계만 있는 plan 은 exit 1 이고 --view 를 안내한다 — 쓰지 않는다', async () => {
  const dir = await fixture({ plan: VIEW_PLAN, diagram: true });
  try {
    const { exitCode, logs } = await capture(() => run(dir, ['record']));
    assert.equal(exitCode, 1);
    assert.match(logs.join('\n'), /--view sequence\|module/);
    assert.equal(await readTask(dir, 'plan.md'), VIEW_PLAN);
    assert.equal(await readTask(dir, 'artifact.md'), ARTIFACT);
  } finally { await rm(dir, { recursive: true, force: true }); }
});

test('record --view <모르는 값>: 직접 호출도 exit 2 이고 쓰지 않는다', async () => {
  const dir = await fixture({ plan: MIXED_PLAN });
  try {
    const { exitCode, errs } = await capture(() => run(dir, ['record'], { view: '../x' }));
    assert.equal(exitCode, 2);
    assert.match(errs.join('\n'), /알 수 없는 --view/);
    assert.equal(await readTask(dir, 'plan.md'), MIXED_PLAN);
  } finally { await rm(dir, { recursive: true, force: true }); }
});

// codex P2(diagram-views 리뷰): 레거시 파일이 없는 view-only plan 에서도 bare record 는 --view 를 안내한다.
test('record (--view 없음): 레거시 파일도 없는 view-only plan 에서도 --view 를 안내한다', async () => {
  const dir = await fixture({ plan: VIEW_PLAN });
  try {
    const { exitCode, logs } = await capture(() => run(dir, ['record']));
    assert.equal(exitCode, 1);
    assert.match(logs.join('\n'), /--view sequence\|module/);
    assert.equal(await readTask(dir, 'plan.md'), VIEW_PLAN);
  } finally { await rm(dir, { recursive: true, force: true }); }
});

// codex P2: plan 쓰기 실패 뒤 재실행 안내가 --view·--skipped 를 잃지 않는다.
test('record --view --skipped: plan 쓰기 실패 패킷의 재실행 안내가 같은 플래그를 담는다',
  { skip: process.getuid?.() === 0 ? 'root 는 권한 비트를 무시한다' : false }, async () => {
  const dir = await fixture({ plan: MIXED_PLAN });
  const planPath = join(dir, 'docs', 'tester', 'demo', 'demo-plan.md');
  try {
    const { chmod } = await import('node:fs/promises');
    await chmod(planPath, 0o444);
    const { exitCode, logs } = await capture(() => run(dir, ['record', "it's", '$HOME'], { view: 'module', skipped: true }));
    assert.equal(exitCode, 1);
    // 사유는 POSIX 단일 인용 — `'`·`$` 가 복사한 명령의 의미를 바꾸지 않는다.
    assert.ok(logs.join('\n').includes(`harness-team diagram record --view module --skipped -- 'it'\\''s $HOME'`), logs.join('\n'));
  } finally {
    const { chmod } = await import('node:fs/promises');
    await chmod(planPath, 0o644).catch(() => {});
    await rm(dir, { recursive: true, force: true });
  }
});

// codex 4차 P2: 레거시 거부는 알려진 뷰 꼬리만 — 손으로 쓴 괄호 레거시 단계는 종전대로 닫힌다.
test('closeDiagramStep: 알려진 뷰가 아닌 괄호 꼬리는 레거시 단계로 닫힌다', () => {
  const custom = PLAN.replace(OPEN_STEP, '- [ ] spec/plan 다이어그램(선택) 작성 → docs/tester/demo/demo-diagram.html');
  const r = closeDiagramStep(custom, { outcome: 'produced' });
  assert.equal(r.status, 'closed');
  assert.match(r.plan, /^- \[x\] spec\/plan 다이어그램\(선택\) 작성 → /m);
  assert.equal(closeDiagramStep(custom, { outcome: 'produced', view: 'sequence' }).status, 'missing');
});

// ---- 뷰 SVG 자립성 (diagram-svg) ----
// 뷰어가 SVG 를 `<img>` 로 보이면 외부 자원·스크립트가 조용히 빠진다. 규칙마다 최소 위반 표본 하나가 **그 규칙 하나만** 걸리고,
// 비슷하지만 허용되는 것(문서 안 참조·data:·xmlns·DOCTYPE URI·텍스트의 "online =")을 모은 표본은 통과한다 —
// 규칙을 지우거나 넓히면 어느 한쪽이 깨진다.

const NS = 'xmlns="http://www.w3.org/2000/svg"';
const LOOKALIKES_SVG = `﻿<?xml version="1.0" encoding="UTF-8"?>
<!-- 주석 -->
<!DOCTYPE svg PUBLIC "-//W3C//DTD SVG 1.1//EN" "http://www.w3.org/Graphics/SVG/1.1/DTD/svg11.dtd">
<svg ${NS} xmlns:xlink="http://www.w3.org/1999/xlink" viewBox="0 0 10 10">
  <style>text { font-family: system-ui, -apple-system, "Segoe UI", sans-serif } .a { fill: url(#g) } .b { fill: url( '#g' ) }</style>
  <defs><linearGradient id="g"/></defs>
  <use href="#g"/><use xlink:href='#g'/><image href="data:image/png;base64,AAAA"/>
  <a href=""><text class="a">online = true</text></a>
</svg>
`;

const SVG_VIOLATIONS = [
  ['스크립트 요소(대문자)', `<svg ${NS}><SCRIPT>x()</SCRIPT></svg>`, /^스크립트 요소: SCRIPT$/],
  ['스크립트 요소(접두사)', `<svg ${NS}><svg:script/></svg>`, /^스크립트 요소: svg:script$/],
  ['foreignObject', `<svg ${NS}><foreignObject><div/></foreignObject></svg>`, /^foreignObject\(HTML 섞기\): foreignObject$/],
  ['이벤트 핸들러', `<svg ${NS}><rect onclick = "x()"/></svg>`, /^이벤트 핸들러 속성\(스크립트\): onclick$/],
  ['@import', `<svg ${NS}><style>@IMPORT "#x";</style></svg>`, /^외부 스타일: @IMPORT$/],
  ['https href', `<svg ${NS}><image href="https://cdn.example/x.png"/></svg>`, /^외부 href: https:\/\/cdn\.example\/x\.png$/],
  ['http xlink:href(대문자·공백·홑따옴표)', `<svg ${NS}><image XLINK:HREF = 'http://x/y.png'/></svg>`, /^외부 href: http:\/\/x\/y\.png$/],
  ['// href', `<svg ${NS}><image href="//cdn/x.png"/></svg>`, /^외부 href: \/\/cdn\/x\.png$/],
  ['상대 경로 href(따옴표 없음)', `<svg ${NS}><image href=logo.png /></svg>`, /^외부 href: logo\.png$/],
  ['javascript: href', `<svg ${NS}><a href="javascript:x()"/></svg>`, /^외부 href: javascript:x\(\)$/],
  ['xml-stylesheet', `<?xml-stylesheet href="s.css"?>\n<svg ${NS}/>`, /^외부 href: s\.css$/],
  ['url(https)', `<svg ${NS}><style>.a { fill: url( 'https://x/p' ) }</style></svg>`, /^외부 url\(\): https:\/\/x\/p$/],
  ['url(//)', `<svg ${NS}><style>@font-face { src: url(//f/x.woff) }</style></svg>`, /^외부 url\(\): \/\/f\/x\.woff$/],
  ['url(상대)', `<svg ${NS}><rect fill="url(p.svg#g)"/></svg>`, /^외부 url\(\): p\.svg#g$/],
  ['xmlns 없음', '<svg viewBox="0 0 1 1"></svg>', /^루트 <svg> 에 xmlns="http:\/\/www\.w3\.org\/2000\/svg" 없음$/],
  ['다른 xmlns', '<svg xmlns="http://www.w3.org/2000/svgX"></svg>', /^루트 <svg> 에 xmlns=/],
  ['자식의 xmlns 만', `<svg viewBox="0 0 1 1"><g ${NS}/></svg>`, /^루트 <svg> 에 xmlns=/],
  ['HTML 루트', `<html><body><svg ${NS}></svg></body></html>`, /^루트 요소가 <svg> 가 아님: <html>/],
  ['빈 파일', '', /^루트 요소가 <svg> 가 아님: \(빈 파일\)$/],
  // codex 1차 리뷰
  ['잘린 파일', `<svg ${NS}><rect width="1"`, /^루트 <svg> 가 닫히지 않음/],
  ['문자 참조로 숨긴 url()', `<svg ${NS}><rect fill="u&#114;l(p.svg#g)"/></svg>`, /^외부 url\(\): p\.svg#g$/],
  ['16진 문자 참조로 숨긴 href', `<svg ${NS}><image href="&#x68;ttps://x/y.png"/></svg>`, /^외부 href: https:\/\/x\/y\.png$/],
  ['따옴표 안 > 뒤의 이벤트 속성', `<svg ${NS}><rect aria-label="A > B" onload="x()"/></svg>`, /^이벤트 핸들러 속성\(스크립트\): onload$/],
  ['DTD 엔티티', `<!DOCTYPE svg [<!ENTITY u "x">]>\n<svg ${NS}/>`, /^DTD 내부 subset 선언: <!ENTITY$/],
  // 태그 구조(brief-diagram-svg-embed codex P2) — 짝이 어긋난 SVG 는 이미지로 그려지지 않는다
  ['짝 안 맞는 태그', `<svg ${NS}><g><rect></g></rect></svg>`, /^태그 구조: <\/g> 가 <rect> 를 닫음$/],
  ['닫히지 않은 자식', `<svg ${NS}><g><rect/></svg>`, /^태그 구조: <\/svg> 가 <g> 를 닫음$/],
  ['대소문자가 다른 닫기', `<svg ${NS}><G></g></svg>`, /^태그 구조: <\/g> 가 <G> 를 닫음$/],
  ['닫히지 않은 루트', `<svg ${NS}><svg></svg>`, /^태그 구조: <svg> 가 닫히지 않음$/],
  ['루트 뒤 요소', `<svg ${NS}></svg><svg ${NS}></svg>`, /^태그 구조: 루트 <\/svg> 뒤에 내용: <svg /],
  ['태그로 읽히지 않는 <', `<svg ${NS}><text>a < b</text></svg>`, /^태그 구조: 태그로 읽히지 않는 '<': < b<\/text>/],
  // 리뷰 P2 — `>` 를 빠뜨린 leaf 가 다음 태그를 속성으로 삼키지 않는다
  ['> 빠진 leaf', `<svg ${NS}><rect x="1"\n  <circle r="1"/></svg>`, /^태그 구조: 태그로 읽히지 않는 '<': <rect x="1"$/],
  ['> 빠진 leaf(따옴표 없는 값)', `<svg ${NS}><rect x=1<circle r="1"/></svg>`, /^태그 구조: 태그로 읽히지 않는 '<': <rect x=1<circle/],
  ['속성 이름의 따옴표', `<svg ${NS}><rect a"b="1"/></svg>`, /^태그 구조: 태그로 읽히지 않는 '<': <rect a"b="1"\/>/],
  // 리뷰 2차 P3-4 — 이벤트 핸들러는 원문에서 찾는다. 첫 행: 값 안 `&#34;` 는 값을 닫지 않는다(well-formed).
  // 둘째 행은 XML Name 에 `&` 가 올 수 없어 그려지지 않는 입력이다 — 그래도 핸들러는 잡는다(푼 글로 되돌리면 놓친다).
  ['값 안 &#34; 뒤의 이벤트 속성', `<svg ${NS}><rect aria-label="say &#34;hi&#34;" onclick="x()"/></svg>`, /^이벤트 핸들러 속성\(스크립트\): onclick$/],
  ['이름 안 문자 참조 뒤의 이벤트 속성', `<svg ${NS}><rect a&#60;1="2" onload="x()"/></svg>`, /^이벤트 핸들러 속성\(스크립트\): onload$/],
  // svg-script-evasion — 스크립트 우회 세 갈래
  ['_ 로 시작하는 요소의 이벤트 속성', `<svg ${NS}><_x onclick="x()"/></svg>`, /^이벤트 핸들러 속성\(스크립트\): onclick$/],
  ['ASCII 밖 이름 요소의 이벤트 속성', `<svg ${NS}><é onclick="x()"/></svg>`, /^이벤트 핸들러 속성\(스크립트\): onclick$/],
  // 내부 subset 의 속성 기본값은 Blink·WebKit·Gecko 모두 실제 속성으로 붙인다 — 핸들러가 돈다
  ['DTD 속성 기본값', `<!DOCTYPE svg [<!ATTLIST rect onclick CDATA "x()">]>\n<svg ${NS}><rect/></svg>`, /^DTD 내부 subset 선언: <!ATTLIST$/],
  ['DTD 요소 선언', `<!DOCTYPE svg [<!ELEMENT svg ANY>]>\n<svg ${NS}/>`, /^DTD 내부 subset 선언: <!ELEMENT$/],
  // SMIL 로 on* 을 바꾸는 것은 지금 엔진에서 돌지 않지만(Animatable: no) 쓸 일이 없다. href 는 실제로 바뀐다(javascript: 로 이동).
  ['SMIL set 의 이벤트 속성', `<svg ${NS}><rect><set attributeName="onclick" to="x()"/></rect></svg>`, /^SMIL 로 바꾸는 이벤트·href 속성: onclick$/],
  ['SMIL animate 의 이벤트 속성', `<svg ${NS}><rect><animate attributeName='onload' values="x()"/></rect></svg>`, /^SMIL 로 바꾸는 이벤트·href 속성: onload$/],
  ['SMIL animate 의 href', `<svg ${NS}><a><animate attributeName="href" values="javascript:x()"/></a></svg>`, /^SMIL 로 바꾸는 이벤트·href 속성: href$/],
  ['SMIL set 의 xlink:href(이름공간 꼼수)', `<svg ${NS}><a><set attributeName="xlink:href:x" to="https://x/y"/></a></svg>`, /^SMIL 로 바꾸는 이벤트·href 속성: xlink:href:x$/],
  ['문자 참조로 숨긴 SMIL href', `<svg ${NS}><a><set attributeName="&#104;ref" to="javascript:x()"/></a></svg>`, /^SMIL 로 바꾸는 이벤트·href 속성: href$/],
];

test('svgSelfContainmentViolations: 허용되는 비슷한 것들을 모은 SVG 는 통과한다', () => {
  assert.deepEqual(svgSelfContainmentViolations(LOOKALIKES_SVG), []);
  assert.deepEqual(svgSelfContainmentViolations(MIN_SVG), []);
  // 문서 안 참조를 문자 참조로 쓴 것(`&#35;g` = `#g`), 스스로 닫는 루트, 끝의 공백·주석은 허용(codex 1차)
  assert.deepEqual(svgSelfContainmentViolations(`<svg ${NS}><use href="&#35;g"/><rect aria-label="a &gt; b" fill="url(&#x23;g)"/></svg>\n<!-- end -->\n`), []);
  assert.deepEqual(svgSelfContainmentViolations(`<svg ${NS} viewBox="0 0 1 1"/>`), []);
  // 다이어그램이 쓸 법한 SMIL(투명도·채움)과 글자 속 "<!ENTITY"(&#60;) 는 통과(svg-script-evasion)
  assert.deepEqual(svgSelfContainmentViolations(`<svg ${NS}><rect><animate attributeName="opacity" values="0;1" dur="1s"/>`
    + `<set attributeName="fill" to="#000"/></rect><text>&#60;!ENTITY x&#62;</text></svg>`), []);
});

test('svgSelfContainmentViolations: 태그 구조 검사는 주석·CDATA·PI·문자 참조·대소문자 같은 짝을 통과시킨다', () => {
  // 주석·CDATA 안의 `<`·`</g>` 는 태그가 아니다. `&#60;` 는 풀지 않고 본다(태그를 만들지 않는다).
  assert.deepEqual(svgSelfContainmentViolations(`<svg ${NS}><!-- </g> --><style><![CDATA[ a < b { fill: #000 } ]]></style><?pi x?>`
    + `<g><G><rect aria-label="1 > 0"/></G><text>a &lt; b &#60;g&#62;</text></g></svg>`), []);
  // 루트 안 주석 + `</svg>` 뒤 주석 — 옛 끝 정규식은 첫 `<!--` 부터 끝까지를 한 주석으로 걷어 "닫히지 않음" 으로 잘못 거부했다(리뷰 2차 P3).
  assert.deepEqual(svgSelfContainmentViolations(`<svg ${NS}><!-- c --><rect/></svg>\n<!-- end -->`), []);
  // 값 안의 `&#34;` 는 값을 닫지 않는다 — 그 뒤의 `onclick=` 은 속성이 아니라 title 글자다(리뷰 2차 P3-4).
  assert.deepEqual(svgSelfContainmentViolations(`<svg ${NS}><rect title="&#34; onclick=&#34;x()"/></svg>`), []);
});

test('svgSelfContainmentViolations: 긴 공백·끝 주석이 있어도 선형 시간이다 (리뷰 P1 — 끝 정규식 지수 backtracking)', () => {
  // 28칸: 옛 정규식으로 되돌리면 몇 초 뒤 1초 단언에서 실패한다(40칸이면 실패하지 않고 몇 시간 멈춘다 — 리뷰 2차 P3).
  const pad = ' '.repeat(28);
  const started = Date.now();
  assert.deepEqual(svgSelfContainmentViolations(`<svg ${NS}>\n${pad}<g>\n${pad}<rect/>${pad}</g>${pad}</svg>${pad}<!-- a -->${pad}<!-- b -->\n`), []);
  assert.match(svgSelfContainmentViolations(`<svg ${NS}><rect/>${pad}x${pad}`)[0], /^루트 <svg> 가 닫히지 않음/);
  assert.match(svgSelfContainmentViolations(`<svg ${NS}></svg>${pad}<!-- 안 닫힌 주석${pad}`)[0], /^루트 <svg> 가 닫히지 않음/);
  assert.ok(Date.now() - started < 1000, `${Date.now() - started}ms`);
});

test('svgSelfContainmentViolations: 규칙마다 위반 표본이 그 규칙 하나만 건다', () => {
  for (const [name, svg, expected] of SVG_VIOLATIONS) {
    const got = svgSelfContainmentViolations(svg);
    assert.equal(got.length, 1, `${name}: ${JSON.stringify(got)}`);
    assert.match(got[0], expected, name);
  }
});

test('record --view: 자립하지 않는 SVG 는 규칙마다 exit 1 이고 plan·artifact 를 바이트 그대로 둔다', async () => {
  const dir = await fixture({ plan: MIXED_PLAN });
  try {
    for (const [name, svg, expected] of SVG_VIOLATIONS) {
      await writeView(dir, 'sequence', svg);
      const { exitCode, logs } = await capture(() => run(dir, ['record'], { view: 'sequence' }));
      assert.equal(exitCode, 1, name);
      const out = logs.join('\n');
      assert.match(out, /demo-diagram-sequence\.svg 이 자립형 SVG 가 아니라/, name);
      assert.ok(out.split('\n').some(line => line.startsWith('cause: ') && expected.test(line.slice('cause: '.length))), `${name}: ${out}`);
      assert.equal(await readTask(dir, 'plan.md'), MIXED_PLAN, name);
      assert.equal(await readTask(dir, 'artifact.md'), ARTIFACT, name);
    }
  } finally { await rm(dir, { recursive: true, force: true }); }
});

test('record --view --json: 위반은 error envelope 의 root_cause 배열로 낸다', async () => {
  const dir = await fixture({ plan: MIXED_PLAN });
  try {
    await writeView(dir, 'module', `<html><svg><script/></svg></html>`);
    const { exitCode, logs } = await capture(() => run(dir, ['record'], { view: 'module', json: true }));
    assert.equal(exitCode, 1);
    const env = JSON.parse(logs.join('\n'));
    assert.equal(env.status, 'error');
    assert.deepEqual(env.error.root_cause.map(c => c.split(':')[0]), ['루트 요소가 <svg> 가 아님', '스크립트 요소']);
    assert.equal(await readTask(dir, 'plan.md'), MIXED_PLAN);
  } finally { await rm(dir, { recursive: true, force: true }); }
});

test('record --view: 이미 닫힌 뷰 단계의 갱신도 자립성을 본다', async () => {
  const closedSeq = PLAN.replace(OPEN_STEP, SEQ_STEP.replace('- [ ]', '- [x]'));
  const dir = await fixture({ plan: closedSeq });
  try {
    await writeView(dir, 'sequence', `<svg ${NS}><image href="https://x/y.png"/></svg>`);
    const bad = await capture(() => run(dir, ['record'], { view: 'sequence' }));
    assert.equal(bad.exitCode, 1);
    assert.equal(await readTask(dir, 'artifact.md'), ARTIFACT);
    await writeView(dir, 'sequence');
    const ok = await capture(() => run(dir, ['record'], { view: 'sequence' }));
    assert.equal(ok.exitCode, undefined, ok.logs.join('\n'));
    assert.match(ok.logs.join('\n'), /plan: already-closed/);
  } finally { await rm(dir, { recursive: true, force: true }); }
});

test('record --view: 뷰 HTML(A1 형식)은 뷰 산출물이 아니다 — .svg 가 없으면 exit 1', async () => {
  const dir = await fixture({ plan: MIXED_PLAN });
  try {
    await writeFile(join(dir, 'docs', 'tester', 'demo', 'demo-diagram-sequence.html'), `<svg ${NS}/>`);
    const { exitCode, logs } = await capture(() => run(dir, ['record'], { view: 'sequence' }));
    assert.equal(exitCode, 1);
    assert.match(logs.join('\n'), /demo-diagram-sequence\.svg 이 없어/);
    assert.equal(await readTask(dir, 'plan.md'), MIXED_PLAN);
  } finally { await rm(dir, { recursive: true, force: true }); }
});

test('자립성 검사는 뷰 생성 기록에만 — 레거시 HTML·--skipped 는 검사하지 않는다(호환)', async () => {
  const dir = await fixture({ plan: MIXED_PLAN });
  try {
    await writeFile(join(dir, 'docs', 'tester', 'demo', 'demo-diagram.html'), '<html><script src="https://cdn/m.js"></script></html>');
    const legacy = await capture(() => run(dir, ['record']));
    assert.equal(legacy.exitCode, undefined, legacy.logs.join('\n'));
    await writeView(dir, 'module', '<html><script/></html>');
    const skipped = await capture(() => run(dir, ['record', '도구', '없음'], { view: 'module', skipped: true }));
    assert.equal(skipped.exitCode, undefined, skipped.logs.join('\n'));
    assert.match(await readTask(dir, 'plan.md'), /^- \[x\] spec\/plan 다이어그램\(module\) — 미실행\(도구 없음\)$/m);
  } finally { await rm(dir, { recursive: true, force: true }); }
});

import { test } from 'node:test';
import assert from 'node:assert/strict';
import { mkdtemp, rm, readFile, mkdir, writeFile } from 'node:fs/promises';
import { join } from 'node:path';
import { tmpdir } from 'node:os';
import { taskSpecTemplate, taskPlanTemplate, taskArtifactTemplate, runTask, runList, runDone, reviewGateStep, firstOpenPlanStep } from '../src/commands/task.mjs';
import { migrateTaskIndexLabels } from '../src/commands/migrate.mjs';
import { collectTasks } from '../src/commands/summary.mjs';

test('spec 템플릿은 4차원 Ambiguity 자가진단 섹션을 포함한다', () => {
  const out = taskSpecTemplate('demo');
  assert.match(out, /## Ambiguity 자가진단/);
  assert.match(out, /Goal 명확도/);
  assert.match(out, /Constraint 명확도/);
  assert.match(out, /Success 기준/);
  assert.match(out, /Context 명확도/);
  assert.match(out, /- \[ \] \*\*Ambiguity ≤ 0\.2\*\*/);
});

test('spec 템플릿은 Ontology 섹션을 포함한다', () => {
  const out = taskSpecTemplate('demo');
  assert.match(out, /## Ontology/);
});

test('spec 템플릿 목적 절은 문제→기대 결과 안내문을 담고, 안내문은 목록 항목이 아니다', () => {
  const out = taskSpecTemplate('demo');
  const section = out.slice(out.indexOf('## 목적 / 요구사항'), out.indexOf('## 설계 / 접근'));
  assert.match(section, /\*문제\(오늘 무엇이 안 되는가\)/);
  assert.match(section, /기대 결과/);
  assert.match(section, /`## 참고` 절에 `- \(open\) …`/);
  // A4(task spec-ask-markers): 다른 역할에 묻는 질문의 3상태 안내 — 이월 문법 `(open → <대상>)`과 섞지 않는다.
  assert.match(section, /`- \(ask:<역할>\) …` → `\(asked:<역할> <날짜> <링크>\)` → `\(answered <링크>\)`/);
  assert.doesNotMatch(section, /open → ask:/, '이월 문법에 ask 대상을 싣지 않는다');
  // sim 출처 태그 규칙(tests/sim/rules.mjs)은 요구사항 절의 **목록 항목**만 센다 —
  // 안내문이 목록이면 "태그 없는 요구"로 오탐된다.
  assert.doesNotMatch(section, /^\s*(?:[-*]|\d+\.)\s/m);
});

// 범위 절은 목적 다음·R1 앞에 둔다. 자리표시자를 목록으로 두지 않는다 — 위 목적 절 검사가 목적~설계 구간의
// 목록 항목을 금하고, 갓 만든 템플릿에 빈 In/Out 항목이 있으면 채운 것과 구별되지 않는다.
test('spec 템플릿은 목적 다음에 범위 (In / Out) 절을 두고, In·Out 쓰는 법을 안내한다', () => {
  const out = taskSpecTemplate('demo');
  const purpose = out.indexOf('## 목적 / 요구사항');
  const scope = out.indexOf('## 범위 (In / Out)');
  const r1 = out.indexOf('## 원천 검토 (R1)');
  assert.ok(purpose >= 0 && purpose < scope && scope < r1, '범위 절은 목적과 R1 사이');
  const section = out.slice(scope, r1);
  assert.match(section, /`- \*\*In\*\*: …`/);
  assert.match(section, /`- \*\*Out\*\*: …`.*이유/);
  assert.doesNotMatch(section, /^\s*(?:[-*]|\d+\.)\s/m, '자리표시자는 목록 항목이 아니다');
});

// R1 원천 검토(cycle §4-1, task r1-source-review). 절은 목적 다음·설계 앞에 둔다 — Done evidence(R2 영역)와 떨어뜨린다.
// interview 6단계는 이 절의 **목록 항목**만 읽는다: `- 없음 — …`/`- 검토 완료: …` 줄이 통과 기록이고, 목록 항목의
// `(unresolved)`·`(open)`이 미해결이다. 갓 만든 템플릿이 통과 기록이나 미해결 마커를 목록으로 가지면 게이트가 뒤집힌다.
test('spec 템플릿은 목적 다음에 R1 원천 검토 절을 두고, 안내문은 게이트가 읽는 목록 항목이 아니다', () => {
  const out = taskSpecTemplate('demo');
  const purpose = out.indexOf('## 목적 / 요구사항');
  const r1 = out.indexOf('## 원천 검토 (R1)');
  const design = out.indexOf('## 설계 / 접근');
  assert.ok(purpose >= 0 && purpose < r1 && r1 < design, 'R1 절은 목적과 설계 사이');
  const section = out.slice(r1, design);
  assert.match(section, /### 원천/);
  assert.match(section, /### 발견/);
  assert.match(section, /`\(unresolved\)`/, '충돌·모순 표기 안내');
  assert.match(section, /`\(open\)`/, '누락 표기 안내');
  assert.match(section, /`\(ask:<역할>\)`/, '다른 역할에 물을 누락의 표기 안내');
  assert.match(section, /`- 없음 — <사유>`/, '원천 없는 task의 한 줄 안내');
  const items = section.split('\n').filter(l => /^\s*(?:[-*]|\d+\.)\s/.test(l));
  assert.ok(!items.some(l => /^\s*- (?:없음 —|검토 완료:)/.test(l)), '템플릿 자체가 R1 통과 기록을 갖지 않는다');
  assert.ok(!items.some(l => /\((?:unresolved|open|ask:|asked:|answered)/.test(l)), '템플릿 자체가 미해결 발견을 갖지 않는다');
  assert.doesNotMatch(section, /10_ssot/, '위키 분류 체계를 템플릿에 박지 않는다(D11)');
});

test('artifact 템플릿은 Learnings 섹션을 포함한다', () => {
  const out = taskArtifactTemplate('demo');
  assert.match(out, /## Learnings/);
});

// EOF 빈 줄은 새 task 를 커밋할 때마다 `git diff --check` 경고("new blank line at EOF")를 낸다.
test('task 템플릿은 개행 하나로 끝난다 — EOF 빈 줄 없음', () => {
  const templates = { spec: taskSpecTemplate, plan: taskPlanTemplate, artifact: taskArtifactTemplate };
  for (const [kind, render] of Object.entries(templates)) {
    const out = render('demo');
    assert.ok(out.endsWith('\n') && !out.endsWith('\n\n'), kind);
  }
});

test('artifact 템플릿은 Reviews 섹션을 포함한다 (리뷰 산출물 규약)', () => {
  const out = taskArtifactTemplate('demo');
  assert.match(out, /## Reviews/);
});

test('runTask는 artifact.md를 실제로 생성한다', async () => {
  const tmpDir = await mkdtemp(join(tmpdir(), 'harness-task-'));
  try {
    await runTask({ targetDir: tmpDir, flags: { member: 'tester' }, taskArgs: ['demo'] });
    const artifactPath = join(tmpDir, 'docs', 'tester', 'demo', 'demo-artifact.md');
    const content = await readFile(artifactPath, 'utf8');
    assert.match(content, /## 결과/);
    assert.match(content, /## Learnings/);
  } finally {
    await rm(tmpDir, { recursive: true, force: true });
  }
});

test('runTask 평문 생성 출력은 spec부터 done까지 다음 단계 안내를 제공한다', async () => {
  const tmpDir = await mkdtemp(join(tmpdir(), 'harness-task-human-create-'));
  const logs = [];
  const original = console.log;
  console.log = (...args) => logs.push(args.join(' '));
  try {
    await runTask({ targetDir: tmpDir, flags: { member: 'tester' }, taskArgs: ['demo'] });
    const output = logs.join('\n');
    assert.match(output, /\/harness-spec으로 .*demo-spec\.md 초안 생성 \(또는 직접 작성, Ambiguity 자가진단 포함\)/);
    assert.match(output, /\/harness-interview → plan\.md 작성 → 구현 → 테스트 \(\/harness-unittest 계열\) → 리뷰 → \/harness-retro → done/);
  } finally {
    console.log = original;
    await rm(tmpDir, { recursive: true, force: true });
  }
});

test('runTask 평문 재활성화 출력은 plan 현재 단계 힌트를 제공한다', async () => {
  const tmpDir = await mkdtemp(join(tmpdir(), 'harness-task-human-activate-'));
  const logs = [];
  const original = console.log;
  console.log = (...args) => logs.push(args.join(' '));
  try {
    await runTask({ targetDir: tmpDir, flags: { member: 'tester' }, taskArgs: ['demo'] });
    logs.length = 0;
    await runTask({ targetDir: tmpDir, flags: { member: 'tester' }, taskArgs: ['demo'] });
    assert.match(logs.join('\n'), /현재 단계는 docs\/tester\/demo\/demo-plan\.md 에서 확인/);
  } finally {
    console.log = original;
    await rm(tmpDir, { recursive: true, force: true });
  }
});

test('runTask는 Context Card를 만들지 않는다', async () => {
  const tmpDir = await mkdtemp(join(tmpdir(), 'harness-task-context-'));
  try {
    await runTask({ targetDir: tmpDir, flags: { member: 'tester' }, taskArgs: ['demo'] });
    await assert.rejects(readFile(join(tmpDir, 'docs', 'tester', 'demo', 'demo-context.md'), 'utf8'), { code: 'ENOENT' });
  } finally {
    await rm(tmpDir, { recursive: true, force: true });
  }
});

test('plan 템플릿은 Ontology 변경 로그 섹션을 포함한다', () => {
  const out = taskPlanTemplate('demo');
  assert.match(out, /## Ontology 변경 로그/);
  assert.match(out, /개념이 새로 정의되거나 의미가 바뀌면 한 줄로 기록/);
});

test('runList는 task 마커(spec.md) 없는 디렉토리(superpowers 등)를 task로 표시하지 않는다', async () => {
  const tmpDir = await mkdtemp(join(tmpdir(), 'harness-list-'));
  try {
    await runTask({ targetDir: tmpDir, flags: { member: 'tester' }, taskArgs: ['real-task'] });
    // task 마커(<name>-spec.md)가 없는 비-task 디렉토리 — docs/superpowers/{plans,specs}가 이 모양이다
    await mkdir(join(tmpDir, 'docs', 'superpowers', 'plans'), { recursive: true });
    await writeFile(join(tmpDir, 'docs', 'superpowers', 'plans', 'some-plan.md'), '# plan');

    const lines = [];
    const orig = console.log;
    console.log = (...a) => lines.push(a.join(' '));
    try {
      await runList({ targetDir: tmpDir });
    } finally {
      console.log = orig;
    }
    const out = lines.join('\n');
    assert.match(out, /tester\/real-task/);   // 실제 task는 표시
    assert.doesNotMatch(out, /superpowers/);  // 마커 없는 디렉토리는 미표시
  } finally {
    await rm(tmpDir, { recursive: true, force: true });
  }
});

// --- task index "active" → "open" rename (+ backward-compat) ---

test('runTask: 원장을 건드리지 않고 per-task meta만 쓴다', async () => {
  const tmpDir = await mkdtemp(join(tmpdir(), 'harness-open-'));
  try {
    await runTask({ targetDir: tmpDir, flags: { member: 'tester' }, taskArgs: ['demo'] });
    const meta = JSON.parse(await readFile(join(tmpDir, 'docs', 'tester', 'demo', 'demo-meta.json'), 'utf8'));
    assert.equal(meta.status, 'open');
    assert.equal(meta.task, 'demo');
    // 공유 원장은 렌더링 대상이므로 task 생성이 만들지 않는다 — 이게 병렬 브랜치 충돌의 원인이었다.
    await assert.rejects(() => readFile(join(tmpDir, 'docs', 'tester', 'tester-task.md'), 'utf8'));
    await assert.rejects(() => readFile(join(tmpDir, 'docs', 'task_summary.md'), 'utf8'));
  } finally { await rm(tmpDir, { recursive: true, force: true }); }
});

test('runTask: 기존 "## Active" 인덱스가 있어도 덮어쓰지 않는다 (backward-compat)', async () => {
  const tmpDir = await mkdtemp(join(tmpdir(), 'harness-compat-'));
  try {
    // Simulate a pre-rename install: the old index stays untouched until `summary --write`.
    const idxPath = join(tmpDir, 'docs', 'tester', 'tester-task.md');
    const before = '# tester — Tasks\n\n## Active\n- older (created 2026-07-01)\n\n## Completed\n';
    await mkdir(join(tmpDir, 'docs', 'tester'), { recursive: true });
    await writeFile(idxPath, before);
    await runTask({ targetDir: tmpDir, flags: { member: 'tester' }, taskArgs: ['fresh'] });
    assert.equal(await readFile(idxPath, 'utf8'), before);
  } finally { await rm(tmpDir, { recursive: true, force: true }); }
});

test('summary: 기존 "🔄 active" 행도 상태 복원에 쓰인다 (backward-compat)', async () => {
  const tmpDir = await mkdtemp(join(tmpdir(), 'harness-donecompat-'));
  try {
    // A pre-rename install: legacy label, and no meta.json anywhere.
    await mkdir(join(tmpDir, 'docs', 'tester', 'legacy'), { recursive: true });
    await writeFile(join(tmpDir, 'docs', 'tester', 'legacy', 'legacy-spec.md'), '# legacy — Spec\n');
    await writeFile(join(tmpDir, 'docs', 'task_summary.md'),
      '# Task Summary\n\n| User | Task | Status | Created |\n|------|------|--------|---------|\n| tester | legacy | 🔄 active | 2026-07-01 |\n');

    const tasks = await collectTasks(tmpDir);
    assert.equal(tasks.length, 1);
    assert.equal(tasks[0].status, 'open', '🔄 active 는 open 으로 읽혀야 한다');
    assert.equal(tasks[0].created, '2026-07-01');
  } finally { await rm(tmpDir, { recursive: true, force: true }); }
});

test('migrateTaskIndexLabels: 기존 active 라벨을 open으로 조화한다', async () => {
  const tmpDir = await mkdtemp(join(tmpdir(), 'harness-mig-open-'));
  try {
    await mkdir(join(tmpDir, 'docs', 'tester'), { recursive: true });
    await writeFile(join(tmpDir, 'docs', 'tester', 'tester-task.md'), '# tester — Tasks\n\n## Active\n- a\n\n## Completed\n');
    await writeFile(join(tmpDir, 'docs', 'task_summary.md'), '# Task Summary\n\n| User | Task | Status | Created |\n|------|------|--------|---------|\n| tester | a | 🔄 active | 2026-07-01 |\n');
    const changed = await migrateTaskIndexLabels({ targetDir: tmpDir });
    assert.equal(changed, true);
    const idx = await readFile(join(tmpDir, 'docs', 'tester', 'tester-task.md'), 'utf8');
    const sum = await readFile(join(tmpDir, 'docs', 'task_summary.md'), 'utf8');
    assert.match(idx, /## Open/);
    assert.doesNotMatch(idx, /## Active/);
    assert.match(sum, /🔄 open/);
    assert.doesNotMatch(sum, /🔄 active/);
    // idempotent: second run is a no-op
    assert.equal(await migrateTaskIndexLabels({ targetDir: tmpDir }), false);
  } finally { await rm(tmpDir, { recursive: true, force: true }); }
});

// human-review-gate(A5): 신규 task plan 의 첫 단계는 사람 검토 게이트다. 옵션 없는 템플릿은 종전과 바이트 단위로 같아야 한다 —
// done 가드·session-context·pr-check 테스트가 그 형태(`## 단계\n- [ ]`)에 기댄다.
const BARE_STEPS = '## 단계\n- [ ]\n\n## Ontology 변경 로그';

test('review gate: 게이트 줄 형식은 하나이고, 옵션이 있을 때만 `## 단계` 맨 위에 들어간다', () => {
  assert.equal(reviewGateStep('chad'), '- [ ] [사람] spec 검토 승인 — chad');
  const bare = taskPlanTemplate('demo');
  assert.ok(bare.includes(BARE_STEPS), '옵션 없는 템플릿은 종전 그대로');
  assert.doesNotMatch(bare, /\[사람\]/);
  assert.equal(taskPlanTemplate('demo', {}), bare, '빈 옵션도 게이트 없음');
  const gated = taskPlanTemplate('demo', { reviewGateUser: 'chad' });
  assert.equal(gated, bare.replace('## 단계\n', '## 단계\n- [ ] [사람] spec 검토 승인 — chad\n'), '게이트 한 줄만 더해진다');
  assert.equal(firstOpenPlanStep(gated), '[사람] spec 검토 승인 — chad', 'SessionStart 현재 단계가 게이트를 가리킨다');
});

const quiet = { doneOnMain: async () => null };
async function runQuiet(dir, name, flags = {}) {
  const logs = [];
  const original = console.log;
  const before = process.exitCode;
  console.log = (...args) => logs.push(args.join(' '));
  try {
    process.exitCode = undefined;
    await runTask({ targetDir: dir, flags: { member: 'tester', ...flags }, taskArgs: [name] }, quiet);
    return { logs, exitCode: process.exitCode ?? 0 };
  } finally { console.log = original; process.exitCode = before; }
}
const planPath = (dir, name) => join(dir, 'docs', 'tester', name, `${name}-plan.md`);

test('review gate: 새 task 는 task user 의 게이트를 품고 생기고 출력에 review gate 줄이 붙는다', async () => {
  const dir = await mkdtemp(join(tmpdir(), 'harness-review-gate-'));
  try {
    const r = await runQuiet(dir, 'demo');
    assert.equal(r.exitCode, 0, r.logs.join('\n'));
    assert.equal(await readFile(planPath(dir, 'demo'), 'utf8'), taskPlanTemplate('demo', { reviewGateUser: 'tester' }));
    assert.ok(r.logs.includes('review gate: docs/tester/demo/demo-plan.md 첫 단계 — 사용자 승인 뒤에만 [x]'), r.logs.join('\n'));
  } finally { await rm(dir, { recursive: true, force: true }); }
});

test('review gate: --no-review-gate 로 만들면 plan 은 게이트 없는 템플릿이고 review gate 줄이 없다', async () => {
  const dir = await mkdtemp(join(tmpdir(), 'harness-review-gate-off-'));
  try {
    const r = await runQuiet(dir, 'demo', { 'no-review-gate': true });
    assert.equal(r.exitCode, 0, r.logs.join('\n'));
    assert.equal(await readFile(planPath(dir, 'demo'), 'utf8'), taskPlanTemplate('demo'));
    assert.ok(!r.logs.some(l => l.startsWith('review gate:')), r.logs.join('\n'));
  } finally { await rm(dir, { recursive: true, force: true }); }
});

test('review gate: 재활성화는 plan 을 건드리지 않는다 — 지운 게이트를 되살리지도 않는다(소급 없음)', async () => {
  const dir = await mkdtemp(join(tmpdir(), 'harness-review-gate-activate-'));
  try {
    await runQuiet(dir, 'demo');
    const edited = taskPlanTemplate('demo').replace('- [ ]', '- [ ] 1. 사람이 쓴 단계');
    await writeFile(planPath(dir, 'demo'), edited);
    const r = await runQuiet(dir, 'demo');
    assert.equal(r.exitCode, 0, r.logs.join('\n'));
    assert.ok(r.logs.some(l => l.startsWith('activated:')), r.logs.join('\n'));
    assert.equal(await readFile(planPath(dir, 'demo'), 'utf8'), edited);
    assert.ok(!r.logs.some(l => l.startsWith('review gate:')));
  } finally { await rm(dir, { recursive: true, force: true }); }
});

test('review gate: 기존 task 에 --no-review-gate 는 plan·meta·활성 포인터를 그대로 두고 exit 1', async () => {
  const dir = await mkdtemp(join(tmpdir(), 'harness-review-gate-existing-'));
  try {
    assert.equal((await runQuiet(dir, 'web-feat')).exitCode, 0);
    assert.equal((await runQuiet(dir, 'other')).exitCode, 0);
    const files = [planPath(dir, 'web-feat'), join(dir, 'docs/tester/web-feat/web-feat-meta.json'), join(dir, '.harness/active.json')];
    const before = await Promise.all(files.map(f => readFile(f, 'utf8')));
    const r = await runQuiet(dir, 'web-feat', { 'no-review-gate': true, area: 'web' });
    assert.equal(r.exitCode, 1);
    assert.ok(r.logs.includes('✗ task: --no-review-gate 는 새 task 를 만들 때만 쓸 수 있음'), r.logs.join('\n'));
    assert.ok(r.logs.some(l => l.includes('[사람] spec 검토 승인') && l.includes('손으로 지우')), '손 편집을 안내한다');
    assert.deepEqual(await Promise.all(files.map(f => readFile(f, 'utf8'))), before, 'plan·meta(area 채택 포함)·active 불변');
  } finally { await rm(dir, { recursive: true, force: true }); }
});

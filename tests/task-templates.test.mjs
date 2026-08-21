import { test } from 'node:test';
import assert from 'node:assert/strict';
import { mkdtemp, rm, readFile, mkdir, writeFile } from 'node:fs/promises';
import { join } from 'node:path';
import { tmpdir } from 'node:os';
import { taskSpecTemplate, taskPlanTemplate, taskArtifactTemplate, taskContextTemplate, runTask, runList, runDone } from '../src/commands/task.mjs';
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

test('artifact 템플릿은 Learnings 섹션을 포함한다', () => {
  const out = taskArtifactTemplate('demo');
  assert.match(out, /## Learnings/);
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
    assert.match(output, /\/harness-interview → 구현 → 테스트 \(\/harness-unittest 계열\) → 리뷰 → \/harness-retro → done/);
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

test('runTask는 설계 계약 그대로 context.md를 생성한다', async () => {
  const tmpDir = await mkdtemp(join(tmpdir(), 'harness-task-context-'));
  try {
    await runTask({ targetDir: tmpDir, flags: { member: 'tester' }, taskArgs: ['demo'] });
    const contextPath = join(tmpDir, 'docs', 'tester', 'demo', 'demo-context.md');
    assert.equal(await readFile(contextPath, 'utf8'), taskContextTemplate('demo'));
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

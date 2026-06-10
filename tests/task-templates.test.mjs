import { test } from 'node:test';
import assert from 'node:assert/strict';
import { mkdtemp, rm, readFile, mkdir, writeFile } from 'node:fs/promises';
import { join } from 'node:path';
import { tmpdir } from 'node:os';
import { taskSpecTemplate, taskPlanTemplate, taskArtifactTemplate, runTask, runList } from '../src/commands/task.mjs';

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

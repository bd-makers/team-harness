import { test } from 'node:test';
import assert from 'node:assert/strict';
import { mkdtemp, rm, readFile } from 'node:fs/promises';
import { join } from 'node:path';
import { tmpdir } from 'node:os';
import { taskSpecTemplate, taskPlanTemplate, taskArtifactTemplate, runTask } from '../src/commands/task.mjs';

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

import { test } from 'node:test';
import assert from 'node:assert/strict';
import { mkdtemp, mkdir, writeFile, readFile, rm } from 'node:fs/promises';
import { join } from 'node:path';
import { tmpdir } from 'node:os';
import { runRetro } from '../src/commands/task.mjs';

async function makeFixture() {
  const dir = await mkdtemp(join(tmpdir(), 'harness-retro-'));
  await mkdir(join(dir, '.harness'), { recursive: true });
  await writeFile(
    join(dir, '.harness/active.json'),
    JSON.stringify({ user: 'tester', task: 'demo', path: 'docs/tester/demo' }),
  );
  await mkdir(join(dir, 'docs', 'tester', 'demo'), { recursive: true });
  return dir;
}

// Test A: existing artifact.md + taskArgs → appends dated Learnings section with text
test('A: 기존 artifact.md가 있고 taskArgs가 있으면 Learnings 섹션과 텍스트를 append', async () => {
  const dir = await makeFixture();
  try {
    const artifactPath = join(dir, 'docs', 'tester', 'demo', 'demo-artifact.md');
    await writeFile(artifactPath, '# demo — Artifact\n\n## 결과\n\n');

    await runRetro({ targetDir: dir, flags: {}, taskArgs: ['learned', 'X'] });

    const content = await readFile(artifactPath, 'utf8');
    assert.match(content, /## Learnings \(\d{4}-\d{2}-\d{2}\)/);
    assert.match(content, /learned X/);
  } finally {
    await rm(dir, { recursive: true, force: true });
  }
});

// Test B: artifact.md MISSING → created from template, then Learnings appended
test('B: artifact.md가 없으면 생성 후 Learnings 섹션을 append', async () => {
  const dir = await makeFixture();
  try {
    const artifactPath = join(dir, 'docs', 'tester', 'demo', 'demo-artifact.md');

    await runRetro({ targetDir: dir, flags: {}, taskArgs: [] });

    const content = await readFile(artifactPath, 'utf8');
    assert.ok(content.length > 0, 'artifact.md should be created');
    assert.match(content, /## Learnings \(\d{4}-\d{2}-\d{2}\)/);
  } finally {
    await rm(dir, { recursive: true, force: true });
  }
});

// Test C: no active task → does NOT throw, sets process.exitCode = 1
test('C: 활성 task 없으면 throw 없이 process.exitCode=1 + 에러 계약 출력', async () => {
  const dir = await mkdtemp(join(tmpdir(), 'harness-retro-noactive-'));
  const prevExitCode = process.exitCode;
  const logs = [];
  const origLog = console.log;
  console.log = (...args) => logs.push(args.join(' '));
  try {
    await runRetro({ targetDir: dir, flags: {}, taskArgs: [] });
    assert.equal(process.exitCode, 1, 'exitCode should be 1');
    assert.ok(logs.some(l => l.includes('✗ retro:')), 'prints status line');
    assert.ok(logs.some(l => l.startsWith('cause:')), 'prints cause hint');
    assert.ok(logs.some(l => l.startsWith('retry:')), 'prints retry hint');
    assert.ok(logs.some(l => l.startsWith('stop:')), 'prints stop condition');
  } finally {
    console.log = origLog;
    process.exitCode = prevExitCode;
    await rm(dir, { recursive: true, force: true });
  }
});

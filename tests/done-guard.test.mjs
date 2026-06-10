import { test } from 'node:test';
import assert from 'node:assert/strict';
import { mkdtemp, mkdir, writeFile, readFile, rm, stat } from 'node:fs/promises';
import { join } from 'node:path';
import { tmpdir } from 'node:os';
import { execFile } from 'node:child_process';
import { promisify } from 'node:util';
import { runDone, taskArtifactTemplate, taskPlanTemplate } from '../src/commands/task.mjs';

const pexec = promisify(execFile);

// Fixtures are plain tmpdirs (NOT git repos), so the git-based checks degrade and
// are skipped — done-guard then judges on plan/artifact signals deterministically.
async function makeFixture({ plan, artifact } = {}) {
  const dir = await mkdtemp(join(tmpdir(), 'harness-done-'));
  await mkdir(join(dir, '.harness'), { recursive: true });
  await writeFile(
    join(dir, '.harness/active.json'),
    JSON.stringify({ user: 'tester', task: 'demo', path: 'docs/tester/demo' }),
  );
  const taskDir = join(dir, 'docs', 'tester', 'demo');
  await mkdir(taskDir, { recursive: true });
  await writeFile(join(taskDir, 'demo-handoff.md'), '# demo — Handoff\n');
  if (plan !== undefined) await writeFile(join(taskDir, 'demo-plan.md'), plan);
  if (artifact !== undefined) await writeFile(join(taskDir, 'demo-artifact.md'), artifact);
  return { dir, taskDir };
}

function captureLogs() {
  const logs = [];
  const orig = console.log;
  console.log = (...a) => logs.push(a.join(' '));
  return { logs, restore: () => { console.log = orig; } };
}

test('미완 plan + 빈 artifact → 차단: exitCode=1, mutation 없음', async () => {
  const { dir, taskDir } = await makeFixture({
    plan: '# demo — Plan\n\n## 단계\n- [ ] 미완\n',
    artifact: taskArtifactTemplate('demo'),
  });
  const prevExit = process.exitCode;
  const { logs, restore } = captureLogs();
  try {
    await runDone({ targetDir: dir, flags: {} });
    assert.equal(process.exitCode, 1, 'exitCode should be 1');
    assert.ok(logs.some(l => l.startsWith('✗ done:')), 'status line');
    assert.ok(logs.some(l => l.startsWith('cause:')), 'cause hint');
    assert.ok(logs.some(l => l.startsWith('retry:')), 'retry hint');
    assert.ok(logs.some(l => l.startsWith('stop:')), 'stop condition');
    assert.ok(logs.some(l => l.includes('--force')), 'mentions --force escape hatch');

    // active.json must still exist (not nulled) and handoff must not get a 완료 entry
    await stat(join(dir, '.harness/active.json')); // throws if removed/nulled-out incorrectly
    const active = JSON.parse(await readFile(join(dir, '.harness/active.json'), 'utf8'));
    assert.ok(active && active.task === 'demo', 'active task unchanged');
    const handoff = await readFile(join(taskDir, 'demo-handoff.md'), 'utf8');
    assert.ok(!handoff.includes('완료'), 'handoff not mutated');
  } finally {
    restore();
    process.exitCode = prevExit;
    await rm(dir, { recursive: true, force: true });
  }
});

test('--force → 경고만 하고 진행: done 처리됨', async () => {
  const { dir, taskDir } = await makeFixture({
    plan: '# demo — Plan\n\n## 단계\n- [ ] 미완\n',
    artifact: taskArtifactTemplate('demo'),
  });
  const prevExit = process.exitCode;
  const { logs, restore } = captureLogs();
  try {
    await runDone({ targetDir: dir, flags: { force: true } });
    assert.ok(logs.some(l => l.startsWith('⚠️')), 'warns instead of blocking');
    assert.ok(logs.some(l => l.startsWith('done:')), 'proceeds to done');

    // active.json nulled out, handoff appended with 완료
    const active = JSON.parse(await readFile(join(dir, '.harness/active.json'), 'utf8'));
    assert.equal(active, null, 'active cleared');
    const handoff = await readFile(join(taskDir, 'demo-handoff.md'), 'utf8');
    assert.ok(handoff.includes('완료'), 'handoff mutated');
  } finally {
    restore();
    process.exitCode = prevExit;
    await rm(dir, { recursive: true, force: true });
  }
});

test('완료된 plan + 채워진 artifact → 가드 통과 (non-git, git 체크 skip)', async () => {
  const { dir } = await makeFixture({
    plan: '# demo — Plan\n\n## 단계\n- [x] 완료\n',
    artifact: taskArtifactTemplate('demo') + '\n- 실제 결과 기록\n',
  });
  const prevExit = process.exitCode;
  const { logs, restore } = captureLogs();
  try {
    await runDone({ targetDir: dir, flags: {} });
    assert.ok(logs.some(l => l.startsWith('done:')), 'proceeds to done');
    assert.ok(!logs.some(l => l.startsWith('✗ done:')), 'no block');
    const active = JSON.parse(await readFile(join(dir, '.harness/active.json'), 'utf8'));
    assert.equal(active, null, 'active cleared');
  } finally {
    restore();
    process.exitCode = prevExit;
    await rm(dir, { recursive: true, force: true });
  }
});

test('artifact.md 없음 → 차단 사유에 포함', async () => {
  const { dir } = await makeFixture({
    plan: taskPlanTemplate('demo').replace('- [ ]', '- [x] done'),
    // no artifact.md
  });
  const prevExit = process.exitCode;
  const { logs, restore } = captureLogs();
  try {
    await runDone({ targetDir: dir, flags: {} });
    assert.equal(process.exitCode, 1);
    assert.ok(logs.some(l => l.includes('artifact.md가 없음')), 'flags missing artifact');
  } finally {
    restore();
    process.exitCode = prevExit;
    await rm(dir, { recursive: true, force: true });
  }
});

test('git 레포에 커밋이 0개면 차단 사유에 포함 (HEAD-less repo)', async () => {
  const { dir } = await makeFixture({
    plan: '# demo — Plan\n\n## 단계\n- [x] done\n',
    artifact: taskArtifactTemplate('demo') + '\n- 실제 결과\n', // plan/artifact pass → only git signals remain
  });
  // git repo with NO commits at all → `git log` is HEAD-less.
  await pexec('git', ['-C', dir, 'init', '-q']);
  // switchedAt is needed for the zero-commit check; add it to active.json.
  const activePath = join(dir, '.harness/active.json');
  const active = JSON.parse(await readFile(activePath, 'utf8'));
  active.switchedAt = new Date().toISOString();
  await writeFile(activePath, JSON.stringify(active));

  const prevExit = process.exitCode;
  const { logs, restore } = captureLogs();
  try {
    await runDone({ targetDir: dir, flags: {} });
    assert.equal(process.exitCode, 1, 'blocks');
    assert.ok(logs.some(l => l.includes('커밋이 0개')), 'flags zero commits');
  } finally {
    restore();
    process.exitCode = prevExit;
    await rm(dir, { recursive: true, force: true });
  }
});

test('비-git 디렉토리는 git 체크를 skip (degradation, 오차단 없음)', async () => {
  // plan/artifact both pass; no git → guard must pass (no fabricated git issue).
  const { dir } = await makeFixture({
    plan: '# demo — Plan\n\n## 단계\n- [x] done\n',
    artifact: taskArtifactTemplate('demo') + '\n- 실제 결과\n',
  });
  const activePath = join(dir, '.harness/active.json');
  const active = JSON.parse(await readFile(activePath, 'utf8'));
  active.switchedAt = new Date().toISOString(); // present, but no git → must be ignored
  await writeFile(activePath, JSON.stringify(active));

  const prevExit = process.exitCode;
  const { logs, restore } = captureLogs();
  try {
    await runDone({ targetDir: dir, flags: {} });
    assert.ok(logs.some(l => l.startsWith('done:')), 'proceeds — git checks skipped');
    assert.ok(!logs.some(l => l.includes('커밋')), 'no fabricated commit issue');
  } finally {
    restore();
    process.exitCode = prevExit;
    await rm(dir, { recursive: true, force: true });
  }
});

test('no active task → 기존 동작 유지 (조기 return, 차단 아님)', async () => {
  const dir = await mkdtemp(join(tmpdir(), 'harness-done-noactive-'));
  const { logs, restore } = captureLogs();
  try {
    await runDone({ targetDir: dir, flags: {} });
    assert.ok(logs.some(l => l === 'no active task'), 'keeps existing message');
  } finally {
    restore();
    await rm(dir, { recursive: true, force: true });
  }
});

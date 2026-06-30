import { test } from 'node:test';
import assert from 'node:assert/strict';
import { mkdtemp, mkdir, writeFile, readFile, rm, stat } from 'node:fs/promises';
import { join } from 'node:path';
import { tmpdir } from 'node:os';
import { execFile } from 'node:child_process';
import { promisify } from 'node:util';
import { runDone, taskArtifactTemplate, taskPlanTemplate, parsePorcelainPaths } from '../src/commands/task.mjs';

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

// Set up a git repo fixture with one commit after switchedAt, so plan/artifact/zero-commit
// signals all pass and only the porcelain dirty check remains under test.
async function makeGitFixture() {
  const { dir, taskDir } = await makeFixture({
    plan: '# demo — Plan\n\n## 단계\n- [x] done\n',
    artifact: taskArtifactTemplate('demo') + '\n- 실제 결과\n',
  });
  await pexec('git', ['-C', dir, 'init', '-q']);
  await pexec('git', ['-C', dir, 'config', 'user.email', 'demo@test.io']);
  await pexec('git', ['-C', dir, 'config', 'user.name', 'demo']);
  const activePath = join(dir, '.harness/active.json');
  const active = JSON.parse(await readFile(activePath, 'utf8'));
  active.switchedAt = new Date(Date.now() - 60_000).toISOString();
  await writeFile(activePath, JSON.stringify(active));
  await pexec('git', ['-C', dir, 'add', '-A']);
  await pexec('git', ['-C', dir, 'commit', '-q', '-m', 'work']);
  return { dir, taskDir };
}

test('handoff 파일만 미커밋이면 가드 통과 (post-commit 훅 마찰 제거)', async () => {
  const { dir, taskDir } = await makeGitFixture();
  // 훅이 하듯 handoff만 더럽힌다 — 실제 작업 변경은 없음.
  await writeFile(join(taskDir, 'demo-handoff.md'), '# demo — Handoff\n\n## hook entry\n');
  const prevExit = process.exitCode;
  const { logs, restore } = captureLogs();
  try {
    await runDone({ targetDir: dir, flags: {} });
    assert.ok(logs.some(l => l.startsWith('done:')), 'proceeds — handoff-only dirty excluded');
    assert.ok(!logs.some(l => l.includes('커밋되지 않은 변경')), 'no uncommitted-change block');
    const active = JSON.parse(await readFile(join(dir, '.harness/active.json'), 'utf8'));
    assert.equal(active, null, 'active cleared');
  } finally {
    restore();
    process.exitCode = prevExit;
    await rm(dir, { recursive: true, force: true });
  }
});

test('handoff 외 실제 변경이 미커밋이면 여전히 차단', async () => {
  const { dir, taskDir } = await makeGitFixture();
  await writeFile(join(taskDir, 'demo-handoff.md'), '# demo — Handoff\n\n## hook entry\n');
  await writeFile(join(dir, 'src-change.txt'), 'real uncommitted work\n');
  const prevExit = process.exitCode;
  const { logs, restore } = captureLogs();
  try {
    await runDone({ targetDir: dir, flags: {} });
    assert.equal(process.exitCode, 1, 'blocks on real uncommitted work');
    assert.ok(logs.some(l => l.includes('커밋되지 않은 변경')), 'flags uncommitted change');
  } finally {
    restore();
    process.exitCode = prevExit;
    await rm(dir, { recursive: true, force: true });
  }
});

test('parsePorcelainPaths: 상태접두/rename/quotepath 파싱', () => {
  assert.deepEqual(parsePorcelainPaths(' M docs/a.md\n?? b.txt\n'), ['docs/a.md', 'b.txt']);
  assert.deepEqual(parsePorcelainPaths('R  old.md -> new.md\n'), ['new.md']);
  assert.deepEqual(parsePorcelainPaths(' M "한글 경로.md"\n'), ['한글 경로.md']);
  assert.deepEqual(parsePorcelainPaths(''), []);
});

test('plan 본문 인라인/설명 텍스트의 `- [ ]`는 미완으로 카운트하지 않는다 (줄 시작만 검사)', async () => {
  const { dir } = await makeFixture({
    // 실제 체크박스는 [x]. 인라인 코드 안의 `- [ ]` 리터럴은 미완이 아니다.
    plan: '# demo — Plan\n\n## 단계\n- [x] 가드는 인라인 `- [ ]` 를 미완으로 오인하면 안 된다\n',
    artifact: taskArtifactTemplate('demo') + '\n- 실제 결과\n',
  });
  const prevExit = process.exitCode;
  const { logs, restore } = captureLogs();
  try {
    await runDone({ targetDir: dir, flags: {} });
    assert.ok(logs.some(l => l.startsWith('done:')), 'proceeds — inline `- [ ]` not counted');
    assert.ok(!logs.some(l => l.includes('미완 체크박스')), 'no false positive on prose mention');
  } finally {
    restore();
    process.exitCode = prevExit;
    await rm(dir, { recursive: true, force: true });
  }
});

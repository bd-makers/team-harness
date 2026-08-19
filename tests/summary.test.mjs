import { test } from 'node:test';
import assert from 'node:assert/strict';
import { mkdtemp, rm, readFile, writeFile, mkdir } from 'node:fs/promises';
import { join } from 'node:path';
import { tmpdir } from 'node:os';
import { execFile } from 'node:child_process';
import { promisify } from 'node:util';
import { runTask, runDone } from '../src/commands/task.mjs';
import {
  collectTasks, renderTaskSummary, renderUserIndex, runSummary, readTaskMeta,
} from '../src/commands/summary.mjs';

const pexec = promisify(execFile);

async function git(dir, ...args) {
  return pexec('git', ['-C', dir, ...args]);
}

async function initRepo(dir) {
  await git(dir, 'init', '-q', '-b', 'main');
  await git(dir, 'config', 'user.email', 'test@example.com');
  await git(dir, 'config', 'user.name', 'test');
  // Real installs gitignore .harness/; without it the active-task pointer would be
  // committed and would itself collide across branches.
  await writeFile(join(dir, '.gitignore'), '.harness/\n');
  await writeFile(join(dir, 'README.md'), '# seed\n');
  await git(dir, 'add', '-A');
  await git(dir, 'commit', '-qm', 'seed');
}

async function seedLegacyTask(dir, user, task, { created, doneInLedger, handoffMarker }) {
  const taskDir = join(dir, 'docs', user, task);
  await mkdir(taskDir, { recursive: true });
  await writeFile(join(taskDir, `${task}-spec.md`), `# ${task} — Spec\n`);
  await writeFile(
    join(taskDir, `${task}-handoff.md`),
    `# ${task} — Handoff\n${handoffMarker ? `\n## 2026-01-01T00:00:00.000Z — 완료\n\n태스크 종료.\n` : ''}`,
  );
  return { user, task, created, doneInLedger };
}

test('병렬 브랜치가 각각 task를 만들어도 원장 충돌이 없다', async () => {
  const dir = await mkdtemp(join(tmpdir(), 'harness-summary-'));
  try {
    await initRepo(dir);
    const flags = { member: 'chad' };

    await runTask({ targetDir: dir, flags, taskArgs: ['alpha'] });
    await git(dir, 'add', '-A');
    await git(dir, 'commit', '-qm', 'alpha');

    await git(dir, 'checkout', '-qb', 'branch-b', 'main');
    await runTask({ targetDir: dir, flags, taskArgs: ['beta'] });
    await git(dir, 'add', '-A');
    await git(dir, 'commit', '-qm', 'beta');

    await git(dir, 'checkout', '-qb', 'branch-c', 'main');
    await runTask({ targetDir: dir, flags, taskArgs: ['gamma'] });
    await git(dir, 'add', '-A');
    await git(dir, 'commit', '-qm', 'gamma');

    await git(dir, 'merge', '--no-edit', 'branch-b');
    const { stdout } = await git(dir, 'diff', '--name-only', '--diff-filter=U');
    assert.equal(stdout.trim(), '', '병렬 task 생성은 충돌 파일을 남기지 않아야 한다');
  } finally {
    await rm(dir, { recursive: true, force: true });
  }
});

test('task/done은 공유 원장을 건드리지 않고 per-task meta만 쓴다', async () => {
  const dir = await mkdtemp(join(tmpdir(), 'harness-summary-'));
  try {
    const flags = { member: 'chad' };
    await runTask({ targetDir: dir, flags, taskArgs: ['demo'] });

    const meta = await readTaskMeta(dir, 'chad', 'demo');
    assert.equal(meta.status, 'open');
    assert.ok(meta.created, 'created 날짜가 기록되어야 한다');

    await assert.rejects(() => readFile(join(dir, 'docs', 'task_summary.md'), 'utf8'));
    await assert.rejects(() => readFile(join(dir, 'docs', 'chad', 'chad-task.md'), 'utf8'));
  } finally {
    await rm(dir, { recursive: true, force: true });
  }
});

test('done은 meta의 status를 done으로 바꾸고 closedAt을 남긴다', async () => {
  const dir = await mkdtemp(join(tmpdir(), 'harness-summary-'));
  try {
    const flags = { member: 'chad', force: true };
    await runTask({ targetDir: dir, flags, taskArgs: ['demo'] });
    await runDone({ targetDir: dir, flags });

    const meta = await readTaskMeta(dir, 'chad', 'demo');
    assert.equal(meta.status, 'done');
    assert.ok(meta.closedAt, 'closedAt 타임스탬프가 있어야 한다');
  } finally {
    await rm(dir, { recursive: true, force: true });
  }
});

test('렌더는 결정론적이다 — 같은 입력이면 같은 바이트', () => {
  const tasks = [
    { user: 'chad', task: 'zeta', created: '2026-08-05', status: 'done' },
    { user: 'chad', task: 'alpha', created: '2026-08-12', status: 'open' },
    { user: 'chad', task: 'beta', created: '2026-08-12', status: 'open' },
  ];
  const once = renderTaskSummary(tasks);
  const twice = renderTaskSummary([...tasks].reverse());
  assert.equal(once, twice, '입력 순서가 달라도 렌더 결과는 같아야 한다');
  // created 오름차순 → 이름 오름차순
  assert.match(once, /zeta[\s\S]*alpha[\s\S]*beta/);
});

test('user index는 Open/Completed를 분리하고 created를 유지한다', () => {
  const tasks = [
    { user: 'chad', task: 'closed-one', created: '2026-08-05', status: 'done' },
    { user: 'chad', task: 'live-one', created: '2026-08-12', status: 'open' },
    { user: 'other', task: 'not-mine', created: '2026-08-12', status: 'open' },
  ];
  const out = renderUserIndex('chad', tasks);
  assert.match(out, /## Open\n- live-one \(created 2026-08-12\)/);
  assert.match(out, /## Completed\n- ✅ closed-one/);
  assert.doesNotMatch(out, /not-mine/, '다른 사용자의 task는 섞이지 않아야 한다');
});

test('meta.json이 없는 과거 task는 원장에서 상태와 created를 복원한다', async () => {
  const dir = await mkdtemp(join(tmpdir(), 'harness-summary-'));
  try {
    // 실측 재현: 원장에는 done 4개인데 handoff 완료 마커는 2개뿐.
    // 마커만 믿으면 나머지 2개가 open으로 오표시된다.
    await seedLegacyTask(dir, 'chad', 'with-marker', { created: '2026-08-05', doneInLedger: true, handoffMarker: true });
    await seedLegacyTask(dir, 'chad', 'ledger-only', { created: '2026-08-12', doneInLedger: true, handoffMarker: false });
    await seedLegacyTask(dir, 'chad', 'still-open', { created: '2026-08-18', doneInLedger: false, handoffMarker: false });

    await writeFile(join(dir, 'docs', 'task_summary.md'), `# Task Summary

| User | Task | Status | Created |
|------|------|--------|---------|
| chad | with-marker | ✅ done | 2026-08-05 |
| chad | ledger-only | ✅ done | 2026-08-12 |
| chad | still-open | 🔄 open | 2026-08-18 |
`);

    const tasks = await collectTasks(dir);
    const byName = Object.fromEntries(tasks.map(t => [t.task, t]));

    assert.equal(byName['with-marker'].status, 'done');
    assert.equal(byName['ledger-only'].status, 'done', '원장이 done이면 마커가 없어도 done이다');
    assert.equal(byName['still-open'].status, 'open');
    assert.equal(byName['ledger-only'].created, '2026-08-12', 'created는 원장에서만 복원 가능하다');
  } finally {
    await rm(dir, { recursive: true, force: true });
  }
});

test('--write는 기본 브랜치가 아니면 거부한다', async () => {
  const dir = await mkdtemp(join(tmpdir(), 'harness-summary-'));
  const exitCode = process.exitCode;
  try {
    await initRepo(dir);
    await runTask({ targetDir: dir, flags: { member: 'chad' }, taskArgs: ['demo'] });
    await git(dir, 'checkout', '-qb', 'feature');

    await runSummary({ targetDir: dir, flags: { write: true } });
    assert.equal(process.exitCode, 1, 'feature 브랜치에서는 실패해야 한다');
    await assert.rejects(() => readFile(join(dir, 'docs', 'task_summary.md'), 'utf8'));

    process.exitCode = exitCode;
    await git(dir, 'checkout', '-q', 'main');
    await runSummary({ targetDir: dir, flags: { write: true } });
    const summary = await readFile(join(dir, 'docs', 'task_summary.md'), 'utf8');
    assert.match(summary, /\| chad \| demo \| 🔄 open \|/);
  } finally {
    process.exitCode = exitCode;
    await rm(dir, { recursive: true, force: true });
  }
});

test('--check는 원장이 어긋나면 실패하고 파일을 고치지 않는다', async () => {
  const dir = await mkdtemp(join(tmpdir(), 'harness-summary-'));
  const exitCode = process.exitCode;
  try {
    await initRepo(dir);
    await runTask({ targetDir: dir, flags: { member: 'chad' }, taskArgs: ['demo'] });
    await writeFile(join(dir, 'docs', 'task_summary.md'), '# Task Summary\n\nstale\n');

    await runSummary({ targetDir: dir, flags: { check: true } });
    assert.equal(process.exitCode, 1);
    const after = await readFile(join(dir, 'docs', 'task_summary.md'), 'utf8');
    assert.match(after, /stale/, '--check는 mutation을 하지 않는다');
  } finally {
    process.exitCode = exitCode;
    await rm(dir, { recursive: true, force: true });
  }
});

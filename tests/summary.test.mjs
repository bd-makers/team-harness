import { test } from 'node:test';
import assert from 'node:assert/strict';
import { mkdtemp, rm, readFile, writeFile, mkdir } from 'node:fs/promises';
import { join } from 'node:path';
import { tmpdir } from 'node:os';
import { execFile } from 'node:child_process';
import { promisify } from 'node:util';
import { runTask, runDone } from '../src/commands/task.mjs';
import {
  collectTasks, renderTaskSummary, renderUserIndex, runSummary, readTaskMeta, defaultBranchCandidates,
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

// done 가드의 판정 창은 이 값 하나에 걸려 있다. 재활성화가 이 값을 밀면 오탐이 되돌아온다.
test('재활성화는 meta.firstActivatedAt을 덮어쓰지 않는다 (switchedAt만 갱신)', async () => {
  const dir = await mkdtemp(join(tmpdir(), 'harness-summary-'));
  try {
    const flags = { member: 'chad' };
    await runTask({ targetDir: dir, flags, taskArgs: ['demo'] });
    const created = await readTaskMeta(dir, 'chad', 'demo');
    assert.ok(created.firstActivatedAt, '생성 시 firstActivatedAt이 기록되어야 한다');

    const activePath = join(dir, '.harness', 'active.json');
    const before = JSON.parse(await readFile(activePath, 'utf8'));
    await new Promise(r => setTimeout(r, 5));
    await runTask({ targetDir: dir, flags, taskArgs: ['demo'] }); // 재활성화

    const after = await readTaskMeta(dir, 'chad', 'demo');
    assert.equal(after.firstActivatedAt, created.firstActivatedAt, '판정 창 시작은 불변이어야 한다');
    const active = JSON.parse(await readFile(activePath, 'utf8'));
    assert.notEqual(active.switchedAt, before.switchedAt, 'switchedAt은 재활성화마다 갱신된다');
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

test('기본 브랜치 판정: origin/HEAD도 init.defaultBranch도 없으면 main/master 둘 다 인정한다', async () => {
  const dir = await mkdtemp(join(tmpdir(), 'harness-summary-'));
  try {
    await git(dir, 'init', '-q', '-b', 'master');
    await git(dir, 'config', 'user.email', 'test@example.com');
    await git(dir, 'config', 'user.name', 'test');
    // 로컬 전용 저장소는 origin/HEAD가 없다. master를 feature 브랜치로 오인하면 안 된다.
    const bases = await defaultBranchCandidates(dir);
    assert.ok(bases.includes('master'));
    assert.ok(bases.includes('main'));
  } finally {
    await rm(dir, { recursive: true, force: true });
  }
});

test('--write: origin 없는 master 저장소에서도 기본 브랜치로 인정한다', async () => {
  const dir = await mkdtemp(join(tmpdir(), 'harness-summary-'));
  const exitCode = process.exitCode;
  try {
    await git(dir, 'init', '-q', '-b', 'master');
    await git(dir, 'config', 'user.email', 'test@example.com');
    await git(dir, 'config', 'user.name', 'test');
    await writeFile(join(dir, '.gitignore'), '.harness/\n');
    await runTask({ targetDir: dir, flags: { member: 'chad' }, taskArgs: ['demo'] });

    await runSummary({ targetDir: dir, flags: { write: true } });
    assert.notEqual(process.exitCode, 1, 'master 기본 브랜치는 거부되면 안 된다');
    const summary = await readFile(join(dir, 'docs', 'task_summary.md'), 'utf8');
    assert.match(summary, /\| chad \| demo \|/);

    await git(dir, 'add', '-A');
    await git(dir, 'commit', '-qm', 'seed');
    await git(dir, 'checkout', '-qb', 'feature');
    await runSummary({ targetDir: dir, flags: { write: true } });
    assert.equal(process.exitCode, 1, 'feature 브랜치는 여전히 거부되어야 한다');
  } finally {
    process.exitCode = exitCode;
    await rm(dir, { recursive: true, force: true });
  }
});

test('--write: 소스가 binary 로 취급되지 않도록 키 구분자는 텍스트다', async () => {
  // 구분자로 리터럴 NUL 을 쓰면 git 이 파일 전체를 binary 로 보고 diff 가 사라진다.
  // 리뷰에서 이 파일이 통째로 안 보였다.
  const src = await readFile(new URL('../src/commands/summary.mjs', import.meta.url), 'utf8');
  assert.equal(src.includes('\u0000'), false, 'summary.mjs 에 NUL 바이트가 있으면 안 된다');
});

test('--write: git 조회가 실패하면 fail-closed 로 거부한다', async () => {
  const dir = await mkdtemp(join(tmpdir(), 'harness-summary-'));
  const exitCode = process.exitCode;
  const realPath = process.env.PATH;
  try {
    await initRepo(dir);
    await runTask({ targetDir: dir, flags: { member: 'chad' }, taskArgs: ['demo'] });
    // git 을 찾을 수 없게 만든다 — '브랜치 없음'으로 오해하고 써버리면 안 된다.
    process.env.PATH = '/nonexistent';
    await runSummary({ targetDir: dir, flags: { write: true } });
    assert.equal(process.exitCode, 1, 'git 을 못 쓰면 거부해야 한다');
    await assert.rejects(() => readFile(join(dir, 'docs', 'task_summary.md'), 'utf8'));
  } finally {
    process.env.PATH = realPath;
    process.exitCode = exitCode;
    await rm(dir, { recursive: true, force: true });
  }
});

test('--write: git 저장소가 아니면 그대로 쓴다 (충돌할 브랜치가 없다)', async () => {
  const dir = await mkdtemp(join(tmpdir(), 'harness-summary-'));
  const exitCode = process.exitCode;
  try {
    await runTask({ targetDir: dir, flags: { member: 'chad' }, taskArgs: ['demo'] });
    await runSummary({ targetDir: dir, flags: { write: true } });
    assert.notEqual(process.exitCode, 1);
    const summary = await readFile(join(dir, 'docs', 'task_summary.md'), 'utf8');
    assert.match(summary, /\| chad \| demo \|/);
  } finally {
    process.exitCode = exitCode;
    await rm(dir, { recursive: true, force: true });
  }
});

// escalation packet (권고 ③) — 상호 배타 플래그 거부에도 대안·안전 기본값을 함께 준다.
test('summary --json: --write와 --check 동시 지정 → error 패킷에 alternatives·safe_default', async () => {
  const dir = await mkdtemp(join(tmpdir(), 'harness-summary-both-'));
  const logs = [];
  const orig = console.log;
  console.log = (...a) => logs.push(a.join(' '));
  const prev = process.exitCode;
  try {
    await runSummary({ targetDir: dir, flags: { json: true, write: true, check: true } });
    assert.equal(logs.length, 1, '정확히 한 객체');
    const env = JSON.parse(logs[0]);
    assert.equal(env.status, 'error');
    assert.ok(env.error.alternatives.length > 0, '대안이 최소 하나');
    assert.ok(env.error.safe_default, '무응답 시 남는 상태');
    assert.equal(typeof env.error.root_cause, 'string', 'JSON 엔벨로프의 root_cause 는 string (배열은 text 전용)');
  } finally { console.log = orig; process.exitCode = prev; await rm(dir, { recursive: true, force: true }); }
});

test('summary(text): --write와 --check 동시 지정 → alternatives·default 줄을 낸다', async () => {
  const dir = await mkdtemp(join(tmpdir(), 'harness-summary-both-text-'));
  const logs = [];
  const orig = console.log;
  console.log = (...a) => logs.push(a.join(' '));
  const prev = process.exitCode;
  try {
    await runSummary({ targetDir: dir, flags: { write: true, check: true } });
    assert.ok(logs.some(l => l.startsWith('cause: ')), 'cause 줄');
    assert.ok(logs.some(l => l.startsWith('alternatives: ')), 'alternatives 줄');
    assert.ok(logs.some(l => l.startsWith('default: ')), 'default 줄');
    assert.ok(logs.some(l => l.startsWith('stop: ')), 'stop 줄');
  } finally { console.log = orig; process.exitCode = prev; await rm(dir, { recursive: true, force: true }); }
});

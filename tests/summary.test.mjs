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

function captureLogs() {
  const logs = [];
  const orig = console.log;
  console.log = (...a) => logs.push(a.join(' '));
  return { logs, restore: () => { console.log = orig; } };
}

// 완료 상태의 "만료"는 시간이 아니라 전이다 — done된 task를 다시 활성화하는 행위가 그 완료를
// 무효로 만든다. 만료되지 않으면 지금 작업 중인 활성 task가 원장에서 "✅ done"으로 보인다.
test('done된 task를 재활성화하면 완료가 만료된다 (status open · closedAt 해제 · reopenedAt 기록)', async () => {
  const dir = await mkdtemp(join(tmpdir(), 'harness-summary-'));
  try {
    const flags = { member: 'chad', force: true };
    await runTask({ targetDir: dir, flags, taskArgs: ['demo'] });
    const created = await readTaskMeta(dir, 'chad', 'demo');
    await runDone({ targetDir: dir, flags });
    const closed = await readTaskMeta(dir, 'chad', 'demo');
    assert.equal(closed.status, 'done', '전제: done이 상태를 닫아야 한다');

    await runTask({ targetDir: dir, flags, taskArgs: ['demo'] }); // 재활성화 = 만료

    const after = await readTaskMeta(dir, 'chad', 'demo');
    assert.equal(after.status, 'open', '완료가 만료되어 open으로 돌아가야 한다');
    assert.equal(after.closedAt, null, 'closedAt은 해제되어야 한다');
    assert.ok(after.reopenedAt, 'reopenedAt에 만료 시각이 기록되어야 한다');
    assert.equal(after.firstActivatedAt, created.firstActivatedAt,
      'reopen은 firstActivatedAt의 "생성 시 1회" 불변식을 깨지 않는다');
  } finally {
    await rm(dir, { recursive: true, force: true });
  }
});

test('done된 task의 재활성화는 activated가 아니라 reopened로 보고한다', async () => {
  const dir = await mkdtemp(join(tmpdir(), 'harness-summary-'));
  try {
    const flags = { member: 'chad', force: true };
    await runTask({ targetDir: dir, flags, taskArgs: ['demo'] });
    await runDone({ targetDir: dir, flags });

    const { logs, restore } = captureLogs();
    try {
      await runTask({ targetDir: dir, flags, taskArgs: ['demo'] });
    } finally { restore(); }

    assert.ok(logs.some(l => l.startsWith('reopened: chad/demo')), `reopened 줄이 있어야 한다: ${JSON.stringify(logs)}`);
    assert.ok(!logs.some(l => l.startsWith('activated:')), '만료된 완료를 단순 활성화로 보고하면 전이가 관측되지 않는다');
  } finally {
    await rm(dir, { recursive: true, force: true });
  }
});

// 만료는 done→open 전이에서만 일어난다. 열린 task 사이를 오가는 평범한 재활성화가 meta를
// 건드리면 판정 창이 흔들린다(done-guard-window가 고친 바로 그 오탐).
test('열려 있는 task의 재활성화는 meta를 건드리지 않는다 (activated 유지)', async () => {
  const dir = await mkdtemp(join(tmpdir(), 'harness-summary-'));
  try {
    const flags = { member: 'chad' };
    await runTask({ targetDir: dir, flags, taskArgs: ['demo'] });
    const before = await readTaskMeta(dir, 'chad', 'demo');

    const { logs, restore } = captureLogs();
    try {
      await runTask({ targetDir: dir, flags, taskArgs: ['demo'] });
    } finally { restore(); }

    const after = await readTaskMeta(dir, 'chad', 'demo');
    assert.deepEqual(after, before, '열린 task의 재활성화는 meta를 그대로 둔다');
    assert.ok(logs.some(l => l.startsWith('activated: chad/demo')), 'activated로 보고해야 한다');
  } finally {
    await rm(dir, { recursive: true, force: true });
  }
});

// meta.json이 없는 구 task도 완료 상태를 가진다 — 원장·handoff에서 추론될 뿐이다.
// 그쪽을 만료시키지 못하면 레거시 설치에서 이 기능이 통째로 없는 것과 같다:
// 재활성화해도 원장은 계속 "✅ done"이다. (2026-09-06 Codex 리뷰 P2)
test('meta.json이 없는 완료 task도 재활성화하면 만료된다 (추론값을 굳혀 open으로)', async () => {
  const dir = await mkdtemp(join(tmpdir(), 'harness-summary-'));
  try {
    const td = join(dir, 'docs', 'tester', 'old');
    await mkdir(td, { recursive: true });
    await writeFile(join(td, 'old-spec.md'), '# old — Spec\n');
    await writeFile(join(td, 'old-plan.md'), '# old — Plan\n- [x] 끝\n');
    await writeFile(join(td, 'old-handoff.md'), '## 2026-01-01 — 완료\n');
    await writeFile(join(dir, 'docs', 'task_summary.md'),
      '| User | Task | Status | Created |\n|--|--|--|--|\n| tester | old | ✅ done | 2026-01-01 |\n');

    await runTask({ targetDir: dir, flags: { member: 'tester' }, taskArgs: ['old'] });

    const meta = await readTaskMeta(dir, 'tester', 'old');
    assert.ok(meta, 'meta가 만들어져야 한다 — 추론에 계속 기대면 원장이 done으로 남는다');
    assert.equal(meta.status, 'open', '완료가 만료되어야 한다');
    assert.equal(meta.closedAt, null);
    assert.ok(meta.reopenedAt, '만료 시각이 남아야 한다');
    assert.equal(meta.created, '2026-01-01', 'created는 원장에서 복원한 값을 보존한다 (지어내지 않는다)');
    assert.equal(meta.firstActivatedAt, undefined,
      '알 수 없는 창 시작점을 지어내지 않는다 — 구 task는 시각 가드를 건너뛴다');

    const tasks = await collectTasks(dir);
    assert.equal(tasks.find(t => t.task === 'old').status, 'open', '원장도 open으로 렌더되어야 한다');
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

// origin/<기본브랜치>와 같은 커밋에 서 있는 브랜치("동기화된 브랜치")를 만든다.
// bare 원격에서 clone 하는 이유는 origin/HEAD 를 함께 얻기 위해서다 — 워크트리 세션이 보는
// 실제 형태이고, 이때 defaultBranchCandidates 는 후보 하나만 낸다.
async function cloneWithOrigin(baseDir) {
  const source = join(baseDir, 'source');
  const bare = join(baseDir, 'remote.git');
  const clone = join(baseDir, 'clone');
  await mkdir(source, { recursive: true });
  await initRepo(source);
  // 두 번째 커밋 — behind 케이스가 HEAD~1 로 되감을 자리를 만든다.
  await writeFile(join(source, 'README.md'), '# seed\n\nsecond\n');
  await git(source, 'add', '-A');
  await git(source, 'commit', '-qm', 'second');
  await pexec('git', ['init', '-q', '--bare', '-b', 'main', bare]);
  await git(source, 'remote', 'add', 'origin', bare);
  await git(source, 'push', '-q', 'origin', 'main');
  await pexec('git', ['clone', '-q', bare, clone]);
  await git(clone, 'config', 'user.email', 'test@example.com');
  await git(clone, 'config', 'user.name', 'test');
  return clone;
}

test('--write: origin/main과 같은 커밋이면 비-main 브랜치에서도 원장을 쓴다', async () => {
  const dir = await mkdtemp(join(tmpdir(), 'harness-summary-synced-'));
  const exitCode = process.exitCode;
  try {
    const repo = await cloneWithOrigin(dir);
    assert.deepEqual(await defaultBranchCandidates(repo), ['main'], 'clone 은 origin/HEAD 를 갖는다');

    await git(repo, 'checkout', '-qb', 'claude/worktree-session');
    await runTask({ targetDir: repo, flags: { member: 'chad' }, taskArgs: ['demo'] });

    await runSummary({ targetDir: repo, flags: { write: true } });
    assert.notEqual(process.exitCode, 1, 'origin/main 과 같은 커밋이면 거부되면 안 된다');
    const summary = await readFile(join(repo, 'docs', 'task_summary.md'), 'utf8');
    assert.match(summary, /\| chad \| demo \| 🔄 open \|/);
  } finally {
    process.exitCode = exitCode;
    await rm(dir, { recursive: true, force: true });
  }
});

test('--write: origin/main보다 앞선(ahead) 브랜치는 계속 거부한다', async () => {
  const dir = await mkdtemp(join(tmpdir(), 'harness-summary-ahead-'));
  const exitCode = process.exitCode;
  try {
    const repo = await cloneWithOrigin(dir);
    await git(repo, 'checkout', '-qb', 'claude/feature');
    await runTask({ targetDir: repo, flags: { member: 'chad' }, taskArgs: ['demo'] });
    await git(repo, 'add', '-A');
    await git(repo, 'commit', '-qm', 'local work');

    await runSummary({ targetDir: repo, flags: { write: true } });
    assert.equal(process.exitCode, 1, '로컬 커밋이 있으면 진짜 feature 브랜치다');
    await assert.rejects(() => readFile(join(repo, 'docs', 'task_summary.md'), 'utf8'));
  } finally {
    process.exitCode = exitCode;
    await rm(dir, { recursive: true, force: true });
  }
});

test('--write: origin/main보다 뒤진(behind) 브랜치도 거부한다', async () => {
  const dir = await mkdtemp(join(tmpdir(), 'harness-summary-behind-'));
  const exitCode = process.exitCode;
  try {
    const repo = await cloneWithOrigin(dir);
    await git(repo, 'checkout', '-qb', 'claude/stale');
    await git(repo, 'reset', '-q', '--hard', 'HEAD~1');
    await runTask({ targetDir: repo, flags: { member: 'chad' }, taskArgs: ['demo'] });

    await runSummary({ targetDir: repo, flags: { write: true } });
    assert.equal(process.exitCode, 1, '낡은 base 위에 원장을 쓰면 push 가 non-FF 로 실패한다');
    await assert.rejects(() => readFile(join(repo, 'docs', 'task_summary.md'), 'utf8'));
  } finally {
    process.exitCode = exitCode;
    await rm(dir, { recursive: true, force: true });
  }
});

test('--write: 커밋이 하나도 없는 저장소의 비-기본 브랜치는 거부한다 (HEAD 조회 실패는 fail-closed)', async () => {
  const dir = await mkdtemp(join(tmpdir(), 'harness-summary-unborn-'));
  const exitCode = process.exitCode;
  try {
    // unborn HEAD: `branch --show-current` 는 이름을 내지만 `rev-parse HEAD` 는 실패한다.
    // 그 실패를 "동기화됨"으로 읽으면 가드가 조용히 열린다.
    await git(dir, 'init', '-q', '-b', 'claude/fresh');
    await git(dir, 'config', 'user.email', 'test@example.com');
    await git(dir, 'config', 'user.name', 'test');
    await writeFile(join(dir, '.gitignore'), '.harness/\n');
    await runTask({ targetDir: dir, flags: { member: 'chad' }, taskArgs: ['demo'] });

    await runSummary({ targetDir: dir, flags: { write: true } });
    assert.equal(process.exitCode, 1, 'HEAD 를 못 읽으면 허용이 아니라 거부로 떨어져야 한다');
    await assert.rejects(() => readFile(join(dir, 'docs', 'task_summary.md'), 'utf8'));
  } finally {
    process.exitCode = exitCode;
    await rm(dir, { recursive: true, force: true });
  }
});

// origin/HEAD 가 없고, 갈라진 origin/main·origin/master 가 둘 다 남아 있는 저장소.
// 기본 브랜치가 master 에서 main 으로 옮겨간 뒤 옛 브랜치를 지우지 않으면 이 모양이 된다.
// defaultBranchCandidates 는 이때 ['main','master'] 를 내므로, 후보를 모두 대조하면
// 실제 기본(main)이 아닌 origin/master tip 에 서 있는 브랜치까지 열리게 된다.
async function cloneWithoutOriginHead(baseDir) {
  const source = join(baseDir, 'source');
  const bare = join(baseDir, 'remote.git');
  const clone = join(baseDir, 'clone');
  await mkdir(source, { recursive: true });
  await initRepo(source);
  await git(source, 'checkout', '-qb', 'master');
  await writeFile(join(source, 'OLD.md'), 'old default\n');
  await git(source, 'add', '-A');
  await git(source, 'commit', '-qm', 'old default');
  await git(source, 'checkout', '-q', 'main');
  await writeFile(join(source, 'NEW.md'), 'new default\n');
  await git(source, 'add', '-A');
  await git(source, 'commit', '-qm', 'new default');
  await pexec('git', ['init', '-q', '--bare', '-b', 'main', bare]);
  await git(source, 'remote', 'add', 'origin', bare);
  await git(source, 'push', '-q', 'origin', 'main', 'master');
  await pexec('git', ['clone', '-q', bare, clone]);
  await git(clone, 'config', 'user.email', 'test@example.com');
  await git(clone, 'config', 'user.name', 'test');
  await git(clone, 'symbolic-ref', '-d', 'refs/remotes/origin/HEAD');
  return clone;
}

test('--write: origin/HEAD가 없으면 origin/master tip에 서 있어도 거부한다 (기본 브랜치를 특정할 수 없다)', async () => {
  const dir = await mkdtemp(join(tmpdir(), 'harness-summary-nohead-'));
  const exitCode = process.exitCode;
  try {
    const repo = await cloneWithoutOriginHead(dir);
    assert.deepEqual(
      await defaultBranchCandidates(repo), ['main', 'master'],
      'origin/HEAD 가 없으면 관용적 이름 둘 다 후보가 된다',
    );

    // 실제 기본은 main 이다. origin/master 는 갈라진 옛 기본이므로, 그 위에 얹은 원장 커밋은
    // main 으로 fast-forward 되지 않는다 — behind 를 거부하는 이유와 같은 상황이다.
    await git(repo, 'checkout', '-qb', 'claude/on-old-default', 'origin/master');
    await runTask({ targetDir: repo, flags: { member: 'chad' }, taskArgs: ['demo'] });

    await runSummary({ targetDir: repo, flags: { write: true } });
    assert.equal(process.exitCode, 1, '기본 브랜치를 특정할 수 없으면 새 경로를 열지 않는다');
    await assert.rejects(() => readFile(join(repo, 'docs', 'task_summary.md'), 'utf8'));
  } finally {
    process.exitCode = exitCode;
    await rm(dir, { recursive: true, force: true });
  }
});

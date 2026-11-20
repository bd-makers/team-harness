import { test } from 'node:test';
import assert from 'node:assert/strict';
import { mkdtemp, mkdir, writeFile, readFile, rm } from 'node:fs/promises';
import { join } from 'node:path';
import { tmpdir } from 'node:os';
import { adoptTaskReviews, collectReviewAdoptionCandidates } from '../src/commands/migrate.mjs';
import { runDone } from '../src/commands/task.mjs';
import { readTaskMeta } from '../src/commands/summary.mjs';

// 구 task = meta 에 `reviews` 키가 없는 task. 그 task 의 verify 증거는 artifact 마커다.
// 채택(adopt)은 그 키를 넣어 CLI 소유로 넘기는 명시적 조작이고, 그 순간 손 마커는 verify 증거에서 빠진다.
const MARKER = (kind, at) => `<!-- harness:review kind=${kind} scope=worktree tip=none at=${at} -->`;

async function makeLegacyTask({
  task = 'demo',
  status = 'open',
  firstActivatedAt = '2026-09-01T00:00:00.000Z',
  markers = [],
  verify = 'required',
  reviewsKey = false,
  dir = null,
} = {}) {
  const root = dir ?? await mkdtemp(join(tmpdir(), 'harness-adopt-'));
  await mkdir(join(root, '.harness'), { recursive: true });
  await writeFile(join(root, '.harness/active.json'), JSON.stringify({ user: 'tester', task, path: `docs/tester/${task}` }));
  const taskDir = join(root, 'docs', 'tester', task);
  await mkdir(taskDir, { recursive: true });
  await writeFile(join(taskDir, `${task}-spec.md`),
    `# ${task} — Spec\n\n## Done evidence\n\n\`\`\`json\n{ "version": 1, "verify": "${verify}", "tests": "skip" }\n\`\`\`\n`);
  await writeFile(join(taskDir, `${task}-plan.md`), `# ${task} — Plan\n\n## 단계\n- [x] 완료\n`);
  await writeFile(join(taskDir, `${task}-artifact.md`), `# ${task} — Artifact\n\n## 결과\n실제 결과.\n\n## Reviews\n${markers.join('\n')}\n`);
  const meta = { user: 'tester', task, created: '2026-09-01', firstActivatedAt, status, closedAt: status === 'done' ? '2026-09-02' : null };
  if (reviewsKey) meta.reviews = [];
  await writeFile(join(taskDir, `${task}-meta.json`), JSON.stringify(meta, null, 2) + '\n');
  return { dir: root, taskDir, meta };
}

function captureLogs() {
  const logs = [];
  const orig = console.log;
  console.log = (...a) => logs.push(a.join(' '));
  return { logs, restore: () => { console.log = orig; } };
}

async function withExit(fn) {
  const prev = process.exitCode;
  process.exitCode = undefined;
  try { return { result: await fn(), exitCode: process.exitCode }; } finally { process.exitCode = prev; }
}

test('후보 필터: 열린 구 task만 — done 이거나 이미 CLI 소유면 제외', async () => {
  const { dir } = await makeLegacyTask({ task: 'open-legacy' });
  await makeLegacyTask({ task: 'closed-legacy', status: 'done', dir });
  await makeLegacyTask({ task: 'already-cli', reviewsKey: true, dir });
  try {
    const names = (await collectReviewAdoptionCandidates(dir)).map(c => c.task).sort();
    assert.deepEqual(names, ['open-legacy']);
  } finally { await rm(dir, { recursive: true, force: true }); }
});

test('잃는 증거 N 은 가드와 같은 수다 — 판정 창 밖 마커와 비-verify kind 는 세지 않는다', async () => {
  const { dir } = await makeLegacyTask({
    firstActivatedAt: '2026-09-01T00:00:00.000Z',
    markers: [
      MARKER('codex-adversarial', '2026-08-15T00:00:00.000Z'), // 창 밖
      MARKER('codex', '2026-09-05T00:00:00.000Z'),             // verify kind 아님
      MARKER('codex-adversarial', '2026-09-05T00:00:00.000Z'), // 유일하게 세는 것
    ],
  });
  const { logs, restore } = captureLogs();
  try {
    const [candidate] = await collectReviewAdoptionCandidates(dir);
    assert.equal(candidate.dropped, 1);
    assert.equal(candidate.verifyRequired, true);

    // 가드와 대조: 채택 전에는 그 마커로 verify 가 통과한다.
    await withExit(() => runDone({ targetDir: dir, flags: {} }));
    assert.ok(logs.some(l => l.startsWith('done:')), '전제: 채택 전에는 손 마커가 verify 증거다');
  } finally { restore(); await rm(dir, { recursive: true, force: true }); }
});

test('--adopt-reviews 없이는 아무것도 바꾸지 않는다 — --yes 단독도 마찬가지', async () => {
  const { dir, taskDir } = await makeLegacyTask();
  const before = await readFile(join(taskDir, 'demo-meta.json'), 'utf8');
  const { logs, restore } = captureLogs();
  try {
    assert.equal(await adoptTaskReviews({ targetDir: dir, flags: {} }), false);
    assert.equal(await adoptTaskReviews({ targetDir: dir, flags: { yes: true } }), false, '--yes 는 옵트인이 아니다');
    assert.equal(await readFile(join(taskDir, 'demo-meta.json'), 'utf8'), before, 'meta 는 바이트 단위로 불변');
    assert.ok(logs.some(l => l.includes('--adopt-reviews')), '경로를 안내한다');
  } finally { restore(); await rm(dir, { recursive: true, force: true }); }
});

test('채택하면 reviews: [] 가 들어가고 다른 필드는 보존된다 — 그리고 가드가 CLI 소유로 판정을 바꾼다', async () => {
  const { dir, taskDir } = await makeLegacyTask({
    markers: [MARKER('codex-adversarial', '2026-09-05T00:00:00.000Z')],
  });
  const { logs, restore } = captureLogs();
  try {
    assert.equal(await adoptTaskReviews({ targetDir: dir, flags: { 'adopt-reviews': true, yes: true } }), true);
    const meta = await readTaskMeta(dir, 'tester', 'demo');
    assert.deepEqual(meta.reviews, []);
    assert.equal(meta.firstActivatedAt, '2026-09-01T00:00:00.000Z', '판정 창은 그대로');
    assert.equal(meta.created, '2026-09-01');
    assert.ok(logs.some(l => l.includes('검증 마커 1개')), '비용을 수로 보여준다');
    assert.ok(logs.some(l => l.includes('재실행 필요')), '비용을 결과로도 말한다');

    logs.length = 0;
    await withExit(() => runDone({ targetDir: dir, flags: {} }));
    assert.ok(logs.some(l => l.includes('검증 항목이 meta.reviews에 없음')), '채택 뒤에는 손 마커가 verify 증거가 아니다');
  } finally { restore(); await rm(dir, { recursive: true, force: true }); }
});

test('verify 를 요구하지 않는 task 는 채택 비용이 0임을 그대로 말한다', async () => {
  const { dir } = await makeLegacyTask({ verify: 'optional' });
  const { logs, restore } = captureLogs();
  try {
    await adoptTaskReviews({ targetDir: dir, flags: { 'adopt-reviews': true, yes: true } });
    assert.ok(logs.some(l => l.includes('잃는 증거 없음')));
    assert.deepEqual((await readTaskMeta(dir, 'tester', 'demo')).reviews, []);
  } finally { restore(); await rm(dir, { recursive: true, force: true }); }
});

test('실제 CLI: 확인에서 거부하면 meta 는 바이트 단위로 그대로다', async () => {
  // confirm 은 stdin 을 읽으므로 진짜 바이너리로 돌린다 — 여기서 "n" 이 먹지 않으면 안내가 아니라 강제다.
  const { run, BIN } = await import('./e2e/sandbox.mjs');
  const { dir, taskDir } = await makeLegacyTask({
    markers: [MARKER('codex-adversarial', '2026-09-05T00:00:00.000Z')],
  });
  const metaPath = join(taskDir, 'demo-meta.json');
  const before = await readFile(metaPath, 'utf8');
  try {
    const r = await run(process.execPath, [BIN, 'migrate', '--adopt-reviews', '--target', dir], { input: 'n\n' });
    assert.match(r.stdout, /검증 마커 1개가 증거에서 빠짐/, '비용을 먼저 보여준다');
    assert.match(r.stdout, /Skipped review evidence adoption/);
    assert.equal(await readFile(metaPath, 'utf8'), before);
  } finally { await rm(dir, { recursive: true, force: true }); }
});

// 가드와 같은 판정: 시나리오를 선언한 task는 -scenario 만 verify 증거다 — 다른 검증 마커는 지금도
// 증거가 아니므로 "채택하면 잃는 증거"로 세면 안 된다 (r2-scenario-evidence codex 리뷰 P3).
test('R2: scenarios 선언 task는 -scenario 마커만 잃는 증거로 센다', async () => {
  const at = '2026-09-05T00:00:00.000Z';
  const { dir, taskDir } = await makeLegacyTask({ markers: [MARKER('codex-adversarial', at), MARKER('codex-scenario', at)] });
  const scenario = { id: 'S1', given: 'g', when: 'w', then: 't', test: 'demo', cmd: 'true' };
  await writeFile(join(taskDir, 'demo-spec.md'),
    `# demo — Spec\n\n## Done evidence\n\n\`\`\`json\n${JSON.stringify({ version: 1, verify: 'required', tests: 'skip', scenarios: [scenario] })}\n\`\`\`\n`);
  try {
    const [c] = await collectReviewAdoptionCandidates(dir);
    assert.equal(c.dropped, 1, '-adversarial 은 세지 않고 -scenario 하나만');
    assert.equal(c.verifyRequired, true);
  } finally { await rm(dir, { recursive: true, force: true }); }
});

// ---- 기본 브랜치 R 에서 종결된 task 는 후보가 아니다 (done-derive 리뷰 P2-6, 결정 A) ----
// 머지가 곧 종결이라 R 에서 종결된 task 는 done 가드를 다시 지나지 않는다 — 후보로 보이면 거짓 비용(소음)이다.
// R 은 `refs/remotes/origin/main` 을 직접 옮겨 머지 전·후를 만든다(task-reopen.test 와 같은 방식).
const pexec = (await import('node:util')).promisify((await import('node:child_process')).execFile);
const GIT_ID = ['-c', 'user.name=t', '-c', 'user.email=t@t', '-c', 'commit.gpgsign=false'];
const git = (dir, args) => pexec('git', ['-C', dir, ...GIT_ID, ...args]).then(r => r.stdout);
const PLAN_OPEN = '# demo — Plan\n\n## 단계\n- [x] 구현\n- [ ] ship 완료\n';

async function commitAsDefault(dir) {
  await git(dir, ['add', '-A']);
  await git(dir, ['commit', '-q', '-m', 'snapshot']);
  await git(dir, ['update-ref', 'refs/remotes/origin/main', 'HEAD']);
}

const candidateNames = async dir => (await collectReviewAdoptionCandidates(dir)).map(c => c.task).sort();

test('P2-6: R 에서 plan 으로 종결된 task 는 후보에서 빠진다 — 로컬 plan 만 종결(머지 전)이면 남는다', async () => {
  const { dir } = await makeLegacyTask({ task: 'merged' });
  const { taskDir: unmergedDir } = await makeLegacyTask({ task: 'unmerged', dir });
  await writeFile(join(unmergedDir, 'unmerged-plan.md'), PLAN_OPEN);
  try {
    await git(dir, ['init', '-q', '-b', 'main']);
    await commitAsDefault(dir); // R: merged 는 plan 전부 체크, unmerged 는 열린 plan
    // 브랜치에서 unmerged 를 ship — 로컬 plan 은 종결이지만 R 에서는 아직 열려 있다.
    await writeFile(join(unmergedDir, 'unmerged-plan.md'), PLAN_OPEN.replace('- [ ] ship', '- [x] ship'));
    assert.deepEqual(await candidateNames(dir), ['unmerged']);
  } finally { await rm(dir, { recursive: true, force: true }); }
});

test('P2-6: R 에서 종결 뒤 재개한 task 는 후보로 남는다 — 재개보다 앞선 재개 이력은 제외를 막지 않는다', async () => {
  const { dir, taskDir, meta } = await makeLegacyTask({ task: 'demo' });
  const metaPath = join(taskDir, 'demo-meta.json');
  try {
    await git(dir, ['init', '-q', '-b', 'main']);
    await commitAsDefault(dir);
    // 재개 MR 이 머지되기 전: R 은 closed 지만 로컬 재개가 그 종결보다 나중이다 → 가드를 다시 지난다.
    await writeFile(metaPath, JSON.stringify({ ...meta, reopenedAt: '2099-01-01T00:00:00.000Z' }, null, 2) + '\n');
    assert.deepEqual(await candidateNames(dir), ['demo']);
    // 재개가 R 의 종결보다 앞이면 그 뒤 다시 종결·머지된 것이다 → 제외.
    await writeFile(metaPath, JSON.stringify({ ...meta, reopenedAt: '2000-01-01T00:00:00.000Z' }, null, 2) + '\n');
    assert.deepEqual(await candidateNames(dir), []);
  } finally { await rm(dir, { recursive: true, force: true }); }
});

test('P2-6: R 이 없으면(git 저장소 아님) 종전대로 plan 으로 닫힌 task 도 후보다', async () => {
  const { dir } = await makeLegacyTask({ task: 'demo' });
  try {
    assert.deepEqual(await candidateNames(dir), ['demo']);
  } finally { await rm(dir, { recursive: true, force: true }); }
});

import { test } from 'node:test';
import assert from 'node:assert/strict';
import { mkdtemp, mkdir, writeFile, readFile, rm, chmod } from 'node:fs/promises';
import { join } from 'node:path';
import { tmpdir } from 'node:os';
import {
  runReview, buildPrompt, buildReviewKind, posixSingleQuote, fenceFor, truncateOutput,
  renderReviewBlock, resolveEngine, REVIEW_PROMPT_TEMPLATE, REVIEW_OUTPUT_MAX_BYTES, SCOPES,
} from '../src/commands/review.mjs';
import { execFile } from 'node:child_process';
import { promisify } from 'node:util';
import { readTaskMeta } from '../src/commands/summary.mjs';
import { parseReviewMarkers, taskArtifactTemplate, VERIFY_KIND_SUFFIXES, runTask, runDone } from '../src/commands/task.mjs';
import { promptPlaceholderIsBare, resolveScope } from '../src/commands/review.mjs';
import { FRAMING_TEMPLATES, RUBRICS, findFramingTemplate, promptMarker } from '../src/commands/review-prompts.mjs';

const pexec = promisify(execFile);
const git = (dir, ...args) => pexec('git', ['-C', dir, ...args]);

// 비-git tmpdir: scope 는 worktree 로 degrade, tip 은 none. custom 엔진을 가짜 스크립트로 두어
// 실제 spawn 경로(sh -c + {prompt} 치환)를 외부 CLI 없이 결정론적으로 탄다.
async function makeFixture({ script, meta = { user: 'tester', task: 'demo', created: '2026-09-10', status: 'open', closedAt: null, reviews: [] } } = {}) {
  const dir = await mkdtemp(join(tmpdir(), 'harness-review-'));
  await mkdir(join(dir, '.harness'), { recursive: true });
  await writeFile(join(dir, '.harness/active.json'), JSON.stringify({ user: 'tester', task: 'demo', path: 'docs/tester/demo' }));
  const taskDir = join(dir, 'docs', 'tester', 'demo');
  await mkdir(taskDir, { recursive: true });
  await writeFile(join(taskDir, 'demo-artifact.md'), taskArtifactTemplate('demo'));
  if (meta !== null) await writeFile(join(taskDir, 'demo-meta.json'), JSON.stringify(meta, null, 2) + '\n');
  const fake = join(dir, 'fake-reviewer.sh');
  await writeFile(fake, script ?? '#!/bin/sh\necho "P3 nit: nothing serious"\necho "verdict: ok"\n');
  await chmod(fake, 0o755);
  await writeFile(join(dir, '.harness/reviewers.json'), JSON.stringify({ custom: { command: `${fake} {prompt}` } }));
  return { dir, taskDir, fake };
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

test('custom 엔진 exit 0 → meta.reviews 항목 + artifact 블록 + 종전 형식 마커가 기록된다', async () => {
  const { dir, taskDir } = await makeFixture();
  const { logs, restore } = captureLogs();
  try {
    const { result } = await withExit(() => runReview({ targetDir: dir, flags: {}, taskArgs: ['custom', 'focus', 'here'] }));
    assert.equal(result.recorded, true);
    const meta = await readTaskMeta(dir, 'tester', 'demo');
    assert.equal(meta.reviews.length, 1);
    const [entry] = meta.reviews;
    assert.equal(entry.kind, 'custom');
    assert.equal(entry.engine, 'custom');
    assert.equal(entry.scope, 'worktree', '비-git 은 worktree 로 degrade');
    assert.equal(entry.tip, 'none');
    assert.equal(entry.exitCode, 0);
    assert.ok(entry.outputBytes > 0);
    assert.ok(!Number.isNaN(Date.parse(entry.at)));

    const artifact = await readFile(join(taskDir, 'demo-artifact.md'), 'utf8');
    assert.ok(artifact.includes('### ') && artifact.includes('— custom (harness-team review)'), '블록 헤딩');
    assert.ok(artifact.includes('P3 nit: nothing serious'), '엔진 출력이 artifact 에 들어간다');
    const markers = parseReviewMarkers(artifact);
    assert.equal(markers.length, 1, '종전 형식 마커가 함께 남는다(사람용·하위 호환)');
    assert.equal(markers[0].kind, 'custom');
    assert.equal(markers[0].at, Date.parse(entry.at), '마커 at == meta at');
    assert.ok(logs.some(l => l.startsWith('review: custom recorded')));
  } finally { restore(); await rm(dir, { recursive: true, force: true }); }
});

test('엔진 exit ≠ 0 → meta 도 artifact 도 쓰지 않고 error 패킷 (stderr tail 포함)', async () => {
  const { dir, taskDir } = await makeFixture({ script: '#!/bin/sh\necho "boom: auth failed" >&2\nexit 3\n' });
  const before = await readFile(join(taskDir, 'demo-artifact.md'), 'utf8');
  const { logs, restore } = captureLogs();
  try {
    const { exitCode } = await withExit(() => runReview({ targetDir: dir, flags: {}, taskArgs: ['custom'] }));
    assert.equal(exitCode, 1);
    assert.deepEqual((await readTaskMeta(dir, 'tester', 'demo')).reviews, [], 'meta.reviews 불변');
    assert.equal(await readFile(join(taskDir, 'demo-artifact.md'), 'utf8'), before, 'artifact 불변');
    assert.ok(logs.some(l => l.startsWith('✗ review:')));
    assert.ok(logs.some(l => l.includes('exit 3')));
    assert.ok(logs.some(l => l.includes('stderr: boom: auth failed')), 'stderr tail 이 cause 에 실린다');
    assert.ok(logs.some(l => l.startsWith('default:') && l.includes('기록되지 않았다')));
  } finally { restore(); await rm(dir, { recursive: true, force: true }); }
});

test('--framing 은 kind 를 <engine>-<suffix> 로 조립하고, 열거 밖은 실행 전에 거부한다', async () => {
  for (const suffix of VERIFY_KIND_SUFFIXES) {
    assert.deepEqual(buildReviewKind('codex', suffix), { kind: `codex-${suffix}` });
  }
  assert.deepEqual(buildReviewKind('codex'), { kind: 'codex' });
  assert.ok(buildReviewKind('codex', 'bogus').error);

  const { dir, taskDir } = await makeFixture();
  const { restore } = captureLogs();
  try {
    await withExit(() => runReview({ targetDir: dir, flags: { framing: 'adversarial' }, taskArgs: ['custom'] }));
    const meta = await readTaskMeta(dir, 'tester', 'demo');
    assert.equal(meta.reviews[0].kind, 'custom-adversarial');

    const before = await readFile(join(taskDir, 'demo-artifact.md'), 'utf8');
    const { exitCode } = await withExit(() => runReview({ targetDir: dir, flags: { framing: 'bogus' }, taskArgs: ['custom'] }));
    assert.equal(exitCode, 1);
    assert.equal((await readTaskMeta(dir, 'tester', 'demo')).reviews.length, 1, '거부된 실행은 기록되지 않는다');
    assert.equal(await readFile(join(taskDir, 'demo-artifact.md'), 'utf8'), before);
  } finally { restore(); await rm(dir, { recursive: true, force: true }); }
});

test('출력 상한: 초과분은 잘라내고 잘랐다고 적으며, outputBytes 는 전체 크기다', async () => {
  const big = 'x'.repeat(REVIEW_OUTPUT_MAX_BYTES + 500);
  const t = truncateOutput(big);
  assert.equal(t.truncated, true);
  assert.equal(t.bytes, REVIEW_OUTPUT_MAX_BYTES + 500);
  assert.ok(t.text.includes('truncated:'));

  const { dir, taskDir } = await makeFixture({ script: `#!/bin/sh\nhead -c ${REVIEW_OUTPUT_MAX_BYTES + 500} /dev/zero | tr '\\0' 'y'\n` });
  const { restore } = captureLogs();
  try {
    await withExit(() => runReview({ targetDir: dir, flags: {}, taskArgs: ['custom'] }));
    const meta = await readTaskMeta(dir, 'tester', 'demo');
    assert.equal(meta.reviews[0].outputBytes, REVIEW_OUTPUT_MAX_BYTES + 500);
    const artifact = await readFile(join(taskDir, 'demo-artifact.md'), 'utf8');
    assert.ok(artifact.includes('truncated:'), 'artifact 에 절단 표기');
    assert.ok(artifact.includes('(artifact에는 앞부분만)'));
  } finally { restore(); await rm(dir, { recursive: true, force: true }); }
});

test('{prompt} 치환은 POSIX 단일 인용 리터럴 — 셸 문법이 섞인 focus 도 데이터로 전달된다', async () => {
  assert.equal(posixSingleQuote(`it's; rm -rf /`), `'it'\\''s; rm -rf /'`);
  // 가짜 리뷰어가 받은 첫 인자를 그대로 출력 → artifact 에서 회수해 대조한다.
  const { dir, taskDir } = await makeFixture({ script: '#!/bin/sh\nprintf "%s" "$1"\n' });
  const { restore } = captureLogs();
  try {
    await withExit(() => runReview({ targetDir: dir, flags: {}, taskArgs: ['custom', "don't", '$(echo pwned)', '`x`'] }));
    const artifact = await readFile(join(taskDir, 'demo-artifact.md'), 'utf8');
    assert.ok(artifact.includes("don't $(echo pwned) `x`"), '치환 문자열이 명령이 아니라 데이터로 도착한다');
    assert.ok(!artifact.includes('pwned\n'), '$(...) 가 실행되지 않았다');
  } finally { restore(); await rm(dir, { recursive: true, force: true }); }
});

test('fence 는 출력 안의 가장 긴 백틱 런보다 길다', () => {
  assert.equal(fenceFor('plain'), '```');
  assert.equal(fenceFor('has ``` inside'), '````');
  const block = renderReviewBlock({ kind: 'k', engine: 'e', scope: 'worktree', tip: 'none', at: '2026-09-10T00:00:00.000Z', output: 'a\n```js\nb\n```' });
  assert.ok(block.includes('````text'));
  assert.ok(block.includes('<!-- harness:review kind=k scope=worktree tip=none at=2026-09-10T00:00:00.000Z -->'));
});

test('공용 리뷰 프롬프트 상수 ↔ commands/harness-review.md text 블록 동기화 (pin)', async () => {
  const doc = await readFile(new URL('../commands/harness-review.md', import.meta.url), 'utf8');
  // 안내 문장이 몇 줄이든, "공용 리뷰 프롬프트" 다음에 오는 첫 text 블록이 정본이다.
  const m = doc.match(/공용 리뷰 프롬프트[\s\S]*?```text\n([\s\S]*?)\n\s*```/);
  assert.ok(m, '문서에 공용 리뷰 프롬프트 text 블록이 있다');
  const docPrompt = m[1].split('\n').map(l => l.replace(/^ {3}/, '')).join('\n');
  assert.equal(docPrompt, REVIEW_PROMPT_TEMPLATE);
  // 치환 결과에 placeholder 가 남지 않는다.
  const p = buildPrompt({ scope: 'diff', base: 'origin/main', focus: ['auth', 'only'] });
  assert.ok(p.includes('Scope: diff against origin/main.'));
  assert.ok(p.endsWith('say so explicitly. auth only'));
  assert.ok(!p.includes('<'));
  const w = buildPrompt({ scope: 'worktree', focus: [] });
  assert.ok(w.includes('Scope: working tree changes.') && w.endsWith('say so explicitly.'));
  const custom = buildPrompt({ scope: 'task-docs', focus: ['f'], promptText: 'MY PROMPT\n' });
  assert.equal(custom, 'MY PROMPT\nf');
});

test('scope 값은 목록 안에서만, task-docs 는 --prompt-file 필수, 활성 task 없으면 실행 전 거부', async () => {
  assert.deepEqual(SCOPES, ['worktree', 'diff', 'task-docs']);
  const { dir, taskDir } = await makeFixture();
  const { logs, restore } = captureLogs();
  try {
    let r = await withExit(() => runReview({ targetDir: dir, flags: { scope: 'nope' }, taskArgs: ['custom'] }));
    assert.equal(r.exitCode, 1);
    r = await withExit(() => runReview({ targetDir: dir, flags: { scope: 'task-docs' }, taskArgs: ['custom'] }));
    assert.equal(r.exitCode, 1);
    assert.ok(logs.some(l => l.includes('--prompt-file')));
    assert.deepEqual((await readTaskMeta(dir, 'tester', 'demo')).reviews, [], '거부 경로는 아무것도 쓰지 않는다');

    const promptFile = join(dir, 'p.txt');
    await writeFile(promptFile, 'DOC REVIEW PROMPT');
    r = await withExit(() => runReview({ targetDir: dir, flags: { scope: 'task-docs', 'prompt-file': promptFile, framing: 'contrarian' }, taskArgs: ['custom'] }));
    assert.equal(r.result.recorded, true);
    const meta = await readTaskMeta(dir, 'tester', 'demo');
    assert.equal(meta.reviews[0].scope, 'task-docs');
    assert.equal(meta.reviews[0].kind, 'custom-contrarian');
    assert.ok((await readFile(join(taskDir, 'demo-artifact.md'), 'utf8')).includes('scope: task-docs'));

    await writeFile(join(dir, '.harness/active.json'), 'null');
    r = await withExit(() => runReview({ targetDir: dir, flags: {}, taskArgs: ['custom'] }));
    assert.equal(r.exitCode, 1);
    assert.ok(logs.some(l => l.includes('활성 task')));
  } finally { restore(); await rm(dir, { recursive: true, force: true }); }
});

test('엔진 결정: 명시 엔진은 PATH 확인, 없으면 probe 체인 codex → claude, custom 은 설정 확인', async () => {
  const { dir } = await makeFixture();
  try {
    const only = (...names) => async (n) => (names.includes(n) ? `/bin/${n}` : null);
    assert.deepEqual(await resolveEngine('codex', { targetDir: dir, which: only('codex') }), { engine: 'codex' });
    assert.ok((await resolveEngine('codex', { targetDir: dir, which: only() })).error, 'PATH 에 없으면 error');
    assert.ok((await resolveEngine('gemini', { targetDir: dir, which: only('gemini') })).error, '열거 밖 엔진');
    assert.deepEqual(await resolveEngine(undefined, { targetDir: dir, which: only('claude') }), { engine: 'claude', probed: true });
    assert.deepEqual(await resolveEngine(undefined, { targetDir: dir, which: only('codex', 'claude') }), { engine: 'codex', probed: true });
    assert.ok((await resolveEngine(undefined, { targetDir: dir, which: only() })).error, '체인 전부 없음');
    const custom = await resolveEngine('custom', { targetDir: dir, which: only('/nonexistent') });
    assert.ok(custom.error === undefined || custom.error, 'custom 은 설정의 첫 토큰을 probe 한다');
    await writeFile(join(dir, '.harness/reviewers.json'), '{}');
    assert.ok((await resolveEngine('custom', { targetDir: dir, which: only('x') })).error, 'custom.command 없음');
  } finally { await rm(dir, { recursive: true, force: true }); }
});

// ─── adversarial 리뷰(2026-09-10) 반영 ─────────────────────────────────────

test('P1: {prompt} 가 템플릿 따옴표 안에 있으면 실행 전에 거부한다 — 단일 인용 계약이 깨지는 자리', async () => {
  assert.equal(promptPlaceholderIsBare('mycli review {prompt}'), true);
  assert.equal(promptPlaceholderIsBare('{prompt}'), true);
  assert.equal(promptPlaceholderIsBare('a {prompt} b {prompt}'), true);
  assert.equal(promptPlaceholderIsBare("echo '{prompt}'"), false);
  assert.equal(promptPlaceholderIsBare('echo "{prompt}"'), false);
  assert.equal(promptPlaceholderIsBare('x={prompt}'), false);
  assert.equal(promptPlaceholderIsBare('mycli --p={prompt} x'), false);
  assert.equal(promptPlaceholderIsBare('no placeholder'), false);

  // 실제 경로: 리뷰어가 제시한 PoC — echo '{prompt}' + "hello; <cmd>" 가 명령으로 새는지.
  const { dir, taskDir, fake } = await makeFixture();
  const canary = join(dir, 'canary');
  await writeFile(join(dir, '.harness/reviewers.json'), JSON.stringify({ custom: { command: `echo '{prompt}'` } }));
  const { logs, restore } = captureLogs();
  try {
    const { exitCode } = await withExit(() => runReview({ targetDir: dir, flags: {}, taskArgs: ['custom', `hello; touch ${canary}`] }));
    assert.equal(exitCode, 1, '거부');
    assert.ok(logs.some(l => l.includes('독립 토큰')), '사유가 자리 문제를 가리킨다');
    let leaked = true;
    try { await readFile(canary); } catch { leaked = false; }
    assert.equal(leaked, false, '엔진이 실행되지 않았으므로 셸 명령도 실행되지 않는다');
    assert.deepEqual((await readTaskMeta(dir, 'tester', 'demo')).reviews, []);
    void fake; void taskDir;
  } finally { restore(); await rm(dir, { recursive: true, force: true }); }
});

test('P1: reviews 키 없는 구 task 에 review 를 돌려도 키를 만들지 않는다 — 기존 손 마커 증거가 무효화되지 않는다', async () => {
  const legacy = { user: 'tester', task: 'demo', created: '2026-08-01', status: 'open', closedAt: null };
  const { dir, taskDir } = await makeFixture({ meta: legacy });
  const { logs, restore } = captureLogs();
  try {
    const { result } = await withExit(() => runReview({ targetDir: dir, flags: {}, taskArgs: ['custom'] }));
    assert.equal(result.recorded, true);
    assert.equal(result.metaRecorded, false);
    assert.deepEqual(await readTaskMeta(dir, 'tester', 'demo'), legacy, 'meta 는 바이트 단위로 불변');
    const artifact = await readFile(join(taskDir, 'demo-artifact.md'), 'utf8');
    assert.equal(parseReviewMarkers(artifact).length, 1, '증거는 종전 방식(artifact 마커)으로 남는다');
    assert.ok(logs.some(l => l.includes('구 task')), '출력이 legacy 경로임을 말한다');
  } finally { restore(); await rm(dir, { recursive: true, force: true }); }
});

test('통합: 새 템플릿 task → review --framing adversarial → done 이 verify: required 를 meta.reviews 로 통과한다', async () => {
  const dir = await mkdtemp(join(tmpdir(), 'harness-review-'));
  const { logs, restore } = captureLogs();
  try {
    await runTask({ targetDir: dir, flags: { member: 'tester' }, taskArgs: ['demo'] }); // 실제 템플릿 → reviews: []
    const taskDir = join(dir, 'docs', 'tester', 'demo');
    await writeFile(join(taskDir, 'demo-spec.md'), '# demo — Spec\n\n## Done evidence\n\n```json\n{ "version": 1, "verify": "required", "tests": "skip" }\n```\n');
    await writeFile(join(taskDir, 'demo-plan.md'), '# demo — Plan\n\n## 단계\n- [x] 완료\n');
    await writeFile(join(taskDir, 'demo-artifact.md'), '# demo — Artifact\n\n## 결과\n실제 결과.\n');
    const fake = join(dir, 'fake.sh');
    await writeFile(fake, '#!/bin/sh\necho verdict: survives\n'); await chmod(fake, 0o755);
    await writeFile(join(dir, '.harness/reviewers.json'), JSON.stringify({ custom: { command: `${fake} {prompt}` } }));

    // 손으로 쓴 마커만으로는 막힌다 (runDone 은 차단 시 process.exitCode 를 세운다 — 감싼다)
    await withExit(() => runDone({ targetDir: dir, flags: {} }));
    assert.ok(logs.some(l => l.includes('검증 항목이 meta.reviews에 없음')), '전제: CLI 소유 task 는 손 마커를 세지 않는다');
    logs.length = 0;

    const { result } = await withExit(() => runReview({ targetDir: dir, flags: { framing: 'adversarial' }, taskArgs: ['custom'] }));
    assert.equal(result.metaRecorded, true);
    await withExit(() => runDone({ targetDir: dir, flags: {} }));
    assert.ok(logs.some(l => l.startsWith('done:')), 'CLI 가 쓴 meta.reviews 항목으로 verify 통과');
  } finally { restore(); await rm(dir, { recursive: true, force: true }); }
});

async function makeGitFixture() {
  const { dir, taskDir, fake } = await makeFixture();
  await git(dir, 'init', '-q', '-b', 'main');
  await git(dir, 'config', 'user.email', 't@e.com');
  await git(dir, 'config', 'user.name', 't');
  await writeFile(join(dir, '.gitignore'), '.harness/\n');
  await writeFile(join(dir, 'a.txt'), 'a\n');
  await git(dir, 'add', '-A');
  await git(dir, 'commit', '-qm', 'base');
  return { dir, taskDir, fake };
}

test('P2: 실제 git 저장소에서 scope 판정 — dirty→worktree, clean→diff(base 폴백), 빈 diff→미기록, 없는 base→error', async () => {
  const { dir } = await makeGitFixture();
  const { restore } = captureLogs();
  try {
    const head = (await git(dir, 'rev-parse', 'HEAD')).stdout.trim();
    // clean + main 위 → base 폴백은 origin/main 없음 → main → HEAD 와 같아 diff 비어 있음
    let r = await resolveScope({ targetDir: dir });
    assert.deepEqual(r, { empty: true, base: 'main', tip: head });
    const { result } = await withExit(() => runReview({ targetDir: dir, flags: {}, taskArgs: ['custom'] }));
    assert.equal(result.recorded, false, '빈 diff 는 기록하지 않는다');
    assert.deepEqual((await readTaskMeta(dir, 'tester', 'demo')).reviews, []);

    // 브랜치에서 커밋 → clean → diff scope
    await git(dir, 'checkout', '-qb', 'feature');
    await writeFile(join(dir, 'b.txt'), 'b\n');
    await git(dir, 'add', '-A'); await git(dir, 'commit', '-qm', 'feat');
    r = await resolveScope({ targetDir: dir });
    assert.equal(r.scope, 'diff'); assert.equal(r.base, 'main'); assert.equal(r.tip, (await git(dir, 'rev-parse', 'HEAD')).stdout.trim());

    // dirty → worktree (명시 --scope 없음)
    await writeFile(join(dir, 'a.txt'), 'changed\n');
    r = await resolveScope({ targetDir: dir });
    assert.equal(r.scope, 'worktree');
    const rr = await withExit(() => runReview({ targetDir: dir, flags: {}, taskArgs: ['custom'] }));
    assert.equal(rr.result.entry.scope, 'worktree');
    assert.equal(rr.result.entry.tip.length, 40, 'tip 은 HEAD sha');

    // 명시 --scope diff + 없는 base → error 패킷, 기록 없음
    const n = (await readTaskMeta(dir, 'tester', 'demo')).reviews.length;
    const e = await withExit(() => runReview({ targetDir: dir, flags: { scope: 'diff', base: 'nope' }, taskArgs: ['custom'] }));
    assert.equal(e.exitCode, 1);
    assert.equal((await readTaskMeta(dir, 'tester', 'demo')).reviews.length, n);
  } finally { restore(); await rm(dir, { recursive: true, force: true }); }
});

test('P3: which() 는 경로 토큰을 PATH 가 아니라 그 파일로 판정한다', async () => {
  const { which } = await import('../src/commands/review.mjs');
  const { dir, fake } = await makeFixture();
  try {
    assert.equal(await which(fake), fake);
    assert.equal(await which(join(dir, 'missing')), null);
    assert.equal(await which('definitely-not-a-binary-xyz', { PATH: dir }), null);
  } finally { await rm(dir, { recursive: true, force: true }); }
});

// --- 0.38.0: 기록 품질 3건 (2026-09-11 codex 실측 리뷰 P3) ---

test('P3: 리뷰 블록은 `## Learnings` 앞에 삽입된다 — 기본 템플릿에서 `## Reviews` 아래', async () => {
  const { dir, taskDir } = await makeFixture();
  const { restore } = captureLogs();
  try {
    await withExit(() => runReview({ targetDir: dir, flags: {}, taskArgs: ['custom'] }));
    const artifact = await readFile(join(taskDir, 'demo-artifact.md'), 'utf8');
    const block = artifact.indexOf('(harness-team review)');
    assert.ok(block > 0, '블록이 있다');
    assert.ok(block > artifact.indexOf('## Reviews'), '`## Reviews` 아래');
    assert.ok(block < artifact.indexOf('\n## Learnings'), '`## Learnings` 위');
  } finally { restore(); await rm(dir, { recursive: true, force: true }); }
});

test('P3: 두 번째 리뷰는 이전 리뷰 출력 안의 `## Learnings` 문자열을 자리로 착각하지 않는다', async () => {
  // 이 저장소를 리뷰하면 엔진 출력에 `## Learnings` 가 그대로 들어온다 — fence 를 세지 않으면
  // 두 번째 리뷰가 첫 블록의 fence 안쪽을 찍어 파일을 깨뜨린다.
  const { dir, taskDir } = await makeFixture({ script: '#!/bin/sh\necho "artifact 템플릿에는"\necho "## Learnings"\necho "가 있다"\n' });
  const { restore } = captureLogs();
  try {
    await withExit(() => runReview({ targetDir: dir, flags: {}, taskArgs: ['custom'] }));
    await withExit(() => runReview({ targetDir: dir, flags: {}, taskArgs: ['custom'] }));
    const artifact = await readFile(join(taskDir, 'demo-artifact.md'), 'utf8');
    assert.equal(parseReviewMarkers(artifact).length, 2, '두 블록 모두 온전하다');
    const body = 'artifact 템플릿에는\n## Learnings\n가 있다';
    assert.equal(artifact.split(body).length - 1, 2, '두 블록의 출력이 갈라지지 않고 온전히 남아 있다');
    const [first, second] = [...artifact.matchAll(/\(harness-team review\)/g)].map(m => m.index);
    // 진짜 헤딩은 fence 안쪽 문자열들보다 뒤에 있다 — 삽입이 fence 안을 찍었다면 순서가 뒤집힌다.
    assert.ok(first < second && second < artifact.lastIndexOf('\n## Learnings'), '두 블록 모두 진짜 Learnings 헤딩 위, 순서대로');
    // 첫 블록의 fence 가 닫힌 채로 남아야 한다 — 삽입이 한가운데를 갈랐다면 fence 수가 홀수가 된다.
    assert.equal(artifact.split('\n').filter(l => /^```/.test(l)).length % 2, 0, 'fence 짝이 맞는다');
  } finally { restore(); await rm(dir, { recursive: true, force: true }); }
});

test('P3: `## Learnings` 가 없는 artifact 는 종전대로 EOF append', async () => {
  const { dir, taskDir } = await makeFixture();
  await writeFile(join(taskDir, 'demo-artifact.md'), '# demo — Artifact\n\n## 결과\n손으로 쓴 결과.\n');
  const { restore } = captureLogs();
  try {
    await withExit(() => runReview({ targetDir: dir, flags: {}, taskArgs: ['custom'] }));
    const artifact = await readFile(join(taskDir, 'demo-artifact.md'), 'utf8');
    assert.ok(artifact.startsWith('# demo — Artifact\n\n## 결과\n손으로 쓴 결과.\n'), '기존 내용 보존');
    assert.equal(parseReviewMarkers(artifact).length, 1);
  } finally { restore(); await rm(dir, { recursive: true, force: true }); }
});

test('P3: exit 0 이어도 stdout 이 공백뿐이면 거부 — meta·artifact 어느 쪽도 바뀌지 않는다', async () => {
  const { dir, taskDir } = await makeFixture({ script: '#!/bin/sh\necho "설정이 틀려 아무것도 못 봤다" >&2\nprintf "  \\n\\n"\n' });
  const before = await readFile(join(taskDir, 'demo-artifact.md'), 'utf8');
  const { logs, restore } = captureLogs();
  try {
    const { result, exitCode } = await withExit(() => runReview({ targetDir: dir, flags: {}, taskArgs: ['custom'] }));
    assert.equal(exitCode, 1);
    assert.equal(result.recorded, false);
    assert.deepEqual((await readTaskMeta(dir, 'tester', 'demo')).reviews, []);
    assert.equal(await readFile(join(taskDir, 'demo-artifact.md'), 'utf8'), before, 'artifact 불변');
    assert.ok(logs.some(l => l.includes('출력이 비어 있음')), '사유를 말한다');
    assert.ok(logs.some(l => l.includes('설정이 틀려')), 'stderr 꼬리를 패킷에 담는다 — 아니면 디버그 불가');
  } finally { restore(); await rm(dir, { recursive: true, force: true }); }
});

test('P3: 거부된 빈 출력 실행은 artifact 파일을 만들지도 않는다 (부수효과 없음)', async () => {
  const { dir, taskDir } = await makeFixture({ script: '#!/bin/sh\nexit 0\n' });
  await rm(join(taskDir, 'demo-artifact.md'));
  const { restore } = captureLogs();
  try {
    await withExit(() => runReview({ targetDir: dir, flags: {}, taskArgs: ['custom'] }));
    let created = true;
    try { await readFile(join(taskDir, 'demo-artifact.md')); } catch { created = false; }
    assert.equal(created, false, '거부한 실행이 템플릿을 만들면 safeDefault 가 거짓말이 된다');
  } finally { restore(); await rm(dir, { recursive: true, force: true }); }
});

test('P2: PATH 항목 자체가 상대 경로여도 실행 기준(cwd)으로 푼다', async () => {
  // 첫 토큰만 고치고 PATH 항목을 process cwd 로 두면 `PATH=bin` 같은 설정에서 같은 오거부가 남는다.
  const { which } = await import('../src/commands/review.mjs');
  const { dir } = await makeFixture();
  await mkdir(join(dir, 'bin'), { recursive: true });
  const tool = join(dir, 'bin', 'mycli');
  await writeFile(tool, '#!/bin/sh\nexit 0\n');
  await chmod(tool, 0o755);
  try {
    assert.equal(await which('mycli', { PATH: 'bin' }, dir), tool);
    assert.equal(await which('mycli', { PATH: 'bin' }, tmpdir()), null, '다른 기준에서는 없다');
  } finally { await rm(dir, { recursive: true, force: true }); }
});

test('P3: custom 의 상대경로 preflight 는 targetDir 기준 — process cwd 기준이면 오거부한다', async () => {
  const { which } = await import('../src/commands/review.mjs');
  const { dir } = await makeFixture();
  await writeFile(join(dir, '.harness/reviewers.json'), JSON.stringify({ custom: { command: './fake-reviewer.sh {prompt}' } }));
  const { restore } = captureLogs();
  try {
    assert.equal(await which('./fake-reviewer.sh', process.env, dir), join(dir, 'fake-reviewer.sh'));
    assert.equal(await which('./fake-reviewer.sh', process.env, tmpdir()), null, '다른 기준에서는 없다');
    const resolved = await resolveEngine('custom', { targetDir: dir });
    assert.equal(resolved.error, undefined, `--target 아래 상대경로 reviewer 는 실행 가능하다: ${resolved.error || ''}`);
    const { result } = await withExit(() => runReview({ targetDir: dir, flags: {}, taskArgs: ['custom'] }));
    assert.equal(result.recorded, true, '실행 기준(cwd=targetDir)과 preflight 기준이 같다');
  } finally { restore(); await rm(dir, { recursive: true, force: true }); }
});

// ─── 프레이밍 프롬프트 src 이관 (framing-prompts-in-src) ─────────────────────

test('프레이밍 템플릿 7종 ↔ 커맨드 문서 마커 다음 text 블록 동기화 (pin) + allowlist 양방향', async () => {
  assert.equal(FRAMING_TEMPLATES.length, 7, '5 접미사 + testcritic 루브릭 2 추가');
  assert.deepEqual([...new Set(FRAMING_TEMPLATES.map(t => t.framing))].sort(), [...VERIFY_KIND_SUFFIXES].sort(),
    '템플릿의 framing 집합 == verify allowlist');
  assert.deepEqual(FRAMING_TEMPLATES.filter(t => t.framing === 'testcritic').map(t => t.rubric), RUBRICS);
  let markers = 0;
  const seenDocs = new Set();
  for (const t of FRAMING_TEMPLATES) {
    const doc = await readFile(new URL(`../${t.doc}`, import.meta.url), 'utf8');
    if (!seenDocs.has(t.doc)) { seenDocs.add(t.doc); markers += doc.split('<!-- harness:prompt ').length - 1; }
    const marker = promptMarker(t);
    const idx = doc.indexOf(marker);
    assert.ok(idx >= 0, `${t.doc}: 마커 ${marker} 가 있다`);
    const m = doc.slice(idx).match(/```text\n([\s\S]*?)\n\s*```/);
    assert.ok(m, `${t.doc}: 마커 다음에 text 블록이 있다`);
    const docPrompt = m[1].split('\n').map(l => l.replace(/^ {3}/, '')).join('\n');
    assert.equal(docPrompt, t.template, `${t.doc}: ${marker} 블록이 src 상수와 한 글자도 다르지 않다`);
    assert.ok(t.template.endsWith('<focus arguments, if any>'), `${t.framing}: focus 자리`);
    if (t.target === 'git') assert.ok(t.template.includes('<working tree changes | diff against <base>>'), `${t.framing}: scope 자리`);
    else assert.ok(!t.template.includes('<working tree changes'), `${t.framing}: task-docs 템플릿은 git scope 를 말하지 않는다`);
  }
  assert.equal(markers, FRAMING_TEMPLATES.length, '문서에만 있는 고아 마커가 없다');
});

test('findFramingTemplate: testcritic 은 --rubric 필수, 다른 프레이밍은 rubric 없이 하나로 결정된다', () => {
  assert.equal(findFramingTemplate('adversarial').template.framing, 'adversarial');
  assert.equal(findFramingTemplate('contrarian').template.target, 'task-docs');
  assert.ok(findFramingTemplate('testcritic').error.includes('--rubric'));
  assert.equal(findFramingTemplate('testcritic', 'component').template.doc, 'commands/harness-comptest.md');
  assert.ok(findFramingTemplate('testcritic', 'bogus').error);
  assert.ok(findFramingTemplate('nope').error);
});

test('--framing contrarian 은 --prompt-file 없이 src 템플릿으로 실행되고, scope 는 task-docs 가 기본값이며 경로가 채워진다', async () => {
  const { dir, taskDir } = await makeFixture();
  const prompts = [];
  const runEngine = async ({ prompt }) => { prompts.push(prompt); return { exitCode: 0, stdout: 'A1 pass\nverdict: ok', stderr: '' }; };
  const { logs, restore } = captureLogs();
  try {
    const r = await withExit(() => runReview({ targetDir: dir, flags: { framing: 'contrarian' }, taskArgs: ['custom', 'focus-x'] }, { runEngine }));
    assert.equal(r.result.recorded, true);
    const meta = await readTaskMeta(dir, 'tester', 'demo');
    assert.equal(meta.reviews[0].kind, 'custom-contrarian');
    assert.equal(meta.reviews[0].scope, 'task-docs', 'task-docs target 의 기본 scope');
    assert.equal('rubric' in meta.reviews[0], false, 'rubric 없는 프레이밍은 필드를 만들지 않는다');
    const [p] = prompts;
    assert.ok(p.includes('docs/tester/demo/demo-spec.md') && p.includes('docs/tester/demo/demo-plan.md'), '활성 task 경로 치환');
    assert.ok(p.includes('A1 [BLOCKER]'), '루브릭 행이 프롬프트에 있다');
    assert.ok(p.endsWith('focus-x'), 'focus 는 끝에');
    assert.ok(!/<(spec|plan|artifact) path>|<focus arguments|<working tree/.test(p), 'placeholder 가 남지 않는다');
    assert.ok((await readFile(join(taskDir, 'demo-artifact.md'), 'utf8')).includes('scope: task-docs'));

    // 충돌 scope 는 실행 전 거부 — 프롬프트는 문서를 보는데 diff 로 기록하면 거짓 기록.
    const c = await withExit(() => runReview({ targetDir: dir, flags: { framing: 'simplifier', scope: 'worktree' }, taskArgs: ['custom'] }, { runEngine }));
    assert.equal(c.exitCode, 1);
    assert.equal(prompts.length, 1, '거부 경로는 엔진을 돌리지 않는다');
    assert.equal((await readTaskMeta(dir, 'tester', 'demo')).reviews.length, 1);
    void logs;
  } finally { restore(); await rm(dir, { recursive: true, force: true }); }
});

test('testcritic 은 --rubric 으로 루브릭을 고르고 kind 는 그대로다 — 조합이 틀리면 실행 전에 거부한다', async () => {
  const { dir, taskDir } = await makeFixture();
  const prompts = [];
  const runEngine = async ({ prompt }) => { prompts.push(prompt); return { exitCode: 0, stdout: 'C1 pass', stderr: '' }; };
  const { logs, restore } = captureLogs();
  try {
    let r = await withExit(() => runReview({ targetDir: dir, flags: { framing: 'testcritic' }, taskArgs: ['custom'] }, { runEngine }));
    assert.equal(r.exitCode, 1, 'rubric 없는 testcritic 은 거부');
    assert.ok(logs.some(l => l.includes('--rubric')), '사유가 --rubric 을 가리킨다');
    r = await withExit(() => runReview({ targetDir: dir, flags: { framing: 'testcritic', rubric: 'bogus' }, taskArgs: ['custom'] }, { runEngine }));
    assert.equal(r.exitCode, 1, '열거 밖 rubric');
    r = await withExit(() => runReview({ targetDir: dir, flags: { framing: 'adversarial', rubric: 'unit' }, taskArgs: ['custom'] }, { runEngine }));
    assert.equal(r.exitCode, 1, 'testcritic 아닌 프레이밍에 rubric');
    assert.equal(prompts.length, 0, '거부 세 경로 모두 엔진을 돌리지 않는다');
    assert.deepEqual((await readTaskMeta(dir, 'tester', 'demo')).reviews, []);

    r = await withExit(() => runReview({ targetDir: dir, flags: { framing: 'testcritic', rubric: 'component' }, taskArgs: ['custom'] }, { runEngine }));
    assert.equal(r.result.recorded, true);
    const meta = await readTaskMeta(dir, 'tester', 'demo');
    assert.equal(meta.reviews[0].kind, 'custom-testcritic', 'kind 는 rubric 과 무관');
    assert.equal(meta.reviews[0].rubric, 'component');
    assert.equal(meta.reviews[0].scope, 'worktree', 'git target 은 종전 scope 결정');
    assert.ok(prompts[0].includes('C1 [BLOCKER]') && !prompts[0].includes('T1 [BLOCKER]'), '고른 루브릭만');
    assert.ok(prompts[0].includes('docs/tester/demo/demo-artifact.md'), 'artifact 경로 치환');
    assert.ok((await readFile(join(taskDir, 'demo-artifact.md'), 'utf8')).includes('· rubric: component ·'), 'artifact 정보 줄에 rubric');
  } finally { restore(); await rm(dir, { recursive: true, force: true }); }
});

test('git target 프레이밍은 task-docs scope 를 받지 않고, --prompt-file 은 템플릿을 override 한다', async () => {
  const { dir } = await makeFixture();
  const prompts = [];
  const runEngine = async ({ prompt }) => { prompts.push(prompt); return { exitCode: 0, stdout: 'ok', stderr: '' }; };
  const { logs, restore } = captureLogs();
  try {
    let r = await withExit(() => runReview({ targetDir: dir, flags: { framing: 'adversarial', scope: 'task-docs' }, taskArgs: ['custom'] }, { runEngine }));
    assert.equal(r.exitCode, 1, 'adversarial 은 git 을 보므로 task-docs 로 기록할 수 없다');
    assert.equal(prompts.length, 0);

    const promptFile = join(dir, 'p.txt');
    await writeFile(promptFile, 'MY OWN PROMPT\n');
    r = await withExit(() => runReview({ targetDir: dir, flags: { framing: 'testcritic', 'prompt-file': promptFile }, taskArgs: ['custom', 'f'] }, { runEngine }));
    assert.equal(r.result.recorded, true, 'override 경로에서는 rubric 이 없어도 된다');
    assert.equal(prompts[0], 'MY OWN PROMPT\nf', '파일 내용이 프롬프트, 템플릿은 쓰지 않는다');
    assert.equal((await readTaskMeta(dir, 'tester', 'demo')).reviews[0].kind, 'custom-testcritic');
    void logs;
  } finally { restore(); await rm(dir, { recursive: true, force: true }); }
});

test('프레이밍 문서 7종과 verify 힌트에 "프롬프트를 파일에 쓰고 --prompt-file" 지시가 남아 있지 않다', async () => {
  for (const doc of new Set(FRAMING_TEMPLATES.map(t => t.doc))) {
    const text = await readFile(new URL(`../${doc}`, import.meta.url), 'utf8');
    assert.ok(!/파일에 쓰고|--prompt-file <path>/.test(text), `${doc}: 옮겨 쓰기 지시 부재`);
  }
  const task = await readFile(new URL('../src/commands/task.mjs', import.meta.url), 'utf8');
  assert.ok(!task.includes('--prompt-file <프롬프트>'), 'verify 힌트가 파일 경로를 요구하지 않는다');
  const review = await readFile(new URL('../commands/harness-review.md', import.meta.url), 'utf8');
  assert.ok(!review.includes('자기 프롬프트를 파일에 두고'), 'harness-review.md 5단계');
});

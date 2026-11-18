// A6(task review-model) — review 엔진과 모델 분리: `--model`, `.harness/reviewers.json` profiles·default, task 프로필
// (spec Done evidence "reviewer"), `task --reviewer`. 우선순위·거부·argv·기록의 계약 정본은 commands/harness-review.md 1·3·5단계와
// runner 표, `--reviewer` 는 commands/harness-task.md 다.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { mkdtemp, mkdir, writeFile, readFile, rm, chmod } from 'node:fs/promises';
import { join } from 'node:path';
import { tmpdir } from 'node:os';
import { runReview, resolveReviewer, resolveEngine, engineArgv, renderReviewBlock } from '../src/commands/review.mjs';
import { modelIssue, reviewersConfigIssue } from '../src/reviewers-config.mjs';
import { readTaskMeta } from '../src/commands/summary.mjs';
import { taskArtifactTemplate, taskSpecTemplate, parseDoneEvidenceDeclaration, runTask, runDone } from '../src/commands/task.mjs';
import { runScenarioCheck } from '../src/commands/scenario.mjs';

const only = (...names) => async (n) => (names.includes(n) ? `/bin/${n}` : null);
const PROFILES = {
  profiles: {
    deep: { engine: 'codex', model: 'gpt-5.5' },
    fast: { engine: 'claude', model: 'claude-haiku-5-5' },
    plain: { engine: 'claude' },
  },
  default: 'fast',
};
const specWith = (declaration) => `# demo — Spec\n\n## Done evidence\n\`\`\`json\n${JSON.stringify(declaration)}\n\`\`\`\n`;

async function makeFixture({ reviewers = PROFILES, spec } = {}) {
  const dir = await mkdtemp(join(tmpdir(), 'harness-review-model-'));
  await mkdir(join(dir, '.harness'), { recursive: true });
  await writeFile(join(dir, '.harness/active.json'), JSON.stringify({ user: 'tester', task: 'demo', path: 'docs/tester/demo' }));
  const taskDir = join(dir, 'docs', 'tester', 'demo');
  await mkdir(taskDir, { recursive: true });
  await writeFile(join(taskDir, 'demo-artifact.md'), taskArtifactTemplate('demo'));
  await writeFile(join(taskDir, 'demo-meta.json'), JSON.stringify({ user: 'tester', task: 'demo', created: '2026-11-18', status: 'open', closedAt: null, reviews: [] }, null, 2) + '\n');
  if (spec !== undefined) await writeFile(join(taskDir, 'demo-spec.md'), spec);
  if (reviewers !== null) {
    await writeFile(join(dir, '.harness/reviewers.json'), typeof reviewers === 'string' ? reviewers : JSON.stringify(reviewers));
  }
  return { dir, taskDir };
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

// 엔진을 실제로 띄우지 않고 runReview 가 넘긴 인자를 받는다 — 프로필의 모델이 실행까지 도착하는지 본다.
function recordingEngine() {
  const calls = [];
  return { calls, runEngine: async (args) => { calls.push(args); return { exitCode: 0, stdout: 'P3 nit\nverdict: ok', stderr: '' }; } };
}

async function review(dir, { flags = {}, taskArgs = [], which = only('codex', 'claude') } = {}) {
  const engine = recordingEngine();
  const { logs, restore } = captureLogs();
  try {
    const { result, exitCode } = await withExit(() => runReview({ targetDir: dir, flags, taskArgs }, { which, runEngine: engine.runEngine }));
    return { result, exitCode, logs, calls: engine.calls };
  } finally { restore(); }
}

// ─── argv ─────────────────────────────────────────────────────────────────

test('engineArgv: 모델 없으면 argv 는 이 기능 이전과 같고, 모델은 프롬프트 앞 한 칸으로 들어간다', () => {
  assert.deepEqual(engineArgv('codex', { prompt: 'P' }), ['exec', '--sandbox', 'read-only', 'P']);
  assert.deepEqual(engineArgv('claude', { prompt: 'P', model: null }), ['-p', '--permission-mode', 'plan', 'P']);
  assert.deepEqual(engineArgv('codex', { prompt: 'P', model: 'gpt-5.5' }), ['exec', '--sandbox', 'read-only', '-m', 'gpt-5.5', 'P']);
  assert.deepEqual(engineArgv('claude', { prompt: 'P', model: 'opus' }), ['-p', '--permission-mode', 'plan', '--model', 'opus', 'P']);
  assert.throws(() => engineArgv('custom', { prompt: 'P', model: 'x' }), /custom/);
});

// runner 표가 정본이고 review.mjs 가 그것을 옮긴다 — 표의 bash 행을 engineArgv 로 다시 만들어 대조한다.
test('runner 표(commands/harness-review.md) ↔ engineArgv 동기화 (pin)', async () => {
  const doc = await readFile(new URL('../commands/harness-review.md', import.meta.url), 'utf8');
  const prompt = '"<공용 리뷰 프롬프트>"';
  for (const engine of ['codex', 'claude']) {
    for (const model of [null, '<id>']) {
      const line = [engine, ...engineArgv(engine, { prompt, model })].join(' ');
      assert.ok(doc.includes(line), `runner 표에 \`${line}\` 행이 있어야 한다`);
    }
  }
});

test('modelIssue: 빈 값·공백·제어문자·선행 - 를 거부한다', () => {
  for (const ok of ['gpt-5.5', 'claude-opus-5-5', 'o4/mini:latest']) assert.equal(modelIssue(ok), null, ok);
  for (const bad of ['', ' ', 'a b', 'a\tb', 'x\n', '-x', '--help', 5, null]) assert.ok(modelIssue(bad), JSON.stringify(bad));
});

// ─── reviewers.json 스키마 ───────────────────────────────────────────────────

test('reviewersConfigIssue: profiles·default 스키마 — 최상위 다른 키는 보지 않는다', () => {
  assert.equal(reviewersConfigIssue({ custom: { command: 'x {prompt}' } }), null, '기존 custom 전용 파일');
  assert.equal(reviewersConfigIssue({ custom: { command: 'x {prompt}' }, ...PROFILES, future: 1 }), null, 'custom 과 공존·미래 키');
  assert.equal(reviewersConfigIssue({ profiles: { c: { engine: 'custom' } }, default: 'c' }), null, 'custom 프로필');
  const broken = [
    [[], /object/],
    [{ profiles: [] }, /profiles/],
    [{ profiles: { a: 'codex' } }, /profiles\.a/],
    [{ profiles: { a: { engine: 'codex', modle: 'x' } } }, /알 수 없는 키 modle/],
    [{ profiles: { a: { engine: 'gemini' } } }, /engine/],
    [{ profiles: { a: { engine: 'custom', model: 'x' } } }, /custom 프로필은 model/],
    [{ profiles: { a: { engine: 'codex', model: '-x' } } }, /model/],
    [{ profiles: { a: { engine: 'codex' } }, default: 'b' }, /"b"/],
    [{ default: 'a' }, /"a"/],
    [{ profiles: { a: { engine: 'codex' } }, default: 1 }, /default/],
  ];
  for (const [cfg, re] of broken) assert.match(reviewersConfigIssue(cfg) ?? '', re, JSON.stringify(cfg));
});

// ─── 우선순위 ───────────────────────────────────────────────────────────────

test('resolveReviewer: ① 위치 인자 > ② task 프로필 > ③ default > ④ probe 체인', async () => {
  const { dir } = await makeFixture();
  try {
    const spec = specWith({ version: 1, reviewer: 'deep' });
    assert.deepEqual(await resolveReviewer({ requested: 'claude', model: 'm1', spec, targetDir: dir, which: only('codex', 'claude') }),
      { engine: 'claude', model: 'm1' }, '① 위치 인자 엔진 + --model, 프로필 무시');
    assert.deepEqual(await resolveReviewer({ requested: 'codex', spec, targetDir: dir, which: only('codex') }),
      { engine: 'codex', model: null }, '① 모델 없이도 프로필 무시');
    assert.deepEqual(await resolveReviewer({ spec, targetDir: dir, which: only('codex', 'claude') }),
      { engine: 'codex', model: 'gpt-5.5', profile: 'deep', source: 'task' }, '② task 프로필이 default 를 이긴다');
    assert.deepEqual(await resolveReviewer({ spec: specWith({ version: 1, tests: 'required' }), targetDir: dir, which: only('codex', 'claude') }),
      { engine: 'claude', model: 'claude-haiku-5-5', profile: 'fast', source: 'default' }, '③ task 프로필 없으면 default');
    assert.deepEqual(await resolveReviewer({ spec: specWith({ version: 1, reviewer: 'plain' }), targetDir: dir, which: only('codex', 'claude') }),
      { engine: 'claude', model: null, profile: 'plain', source: 'task' }, 'model 없는 프로필은 null');
  } finally { await rm(dir, { recursive: true, force: true }); }

  const bare = await makeFixture({ reviewers: { custom: { command: 'x {prompt}' } } });
  try {
    assert.deepEqual(await resolveReviewer({ spec: null, targetDir: bare.dir, which: only('codex', 'claude') }),
      { engine: 'codex', probed: true, model: null }, '④ 프로필·default 없으면 probe 체인(D2 불변)');
  } finally { await rm(bare.dir, { recursive: true, force: true }); }

  const none = await makeFixture({ reviewers: null });
  try {
    assert.deepEqual(await resolveReviewer({ spec: null, targetDir: none.dir, which: only('claude') }),
      { engine: 'claude', probed: true, model: null }, '④ reviewers.json 이 없으면 종전과 같다');
  } finally { await rm(none.dir, { recursive: true, force: true }); }
});

test('resolveReviewer: 고른 프로필(②·③)의 엔진이 없으면 error — probe 로 내려가지 않는다', async () => {
  const { dir } = await makeFixture();
  try {
    const task = await resolveReviewer({ spec: specWith({ version: 1, reviewer: 'deep' }), targetDir: dir, which: only('claude') });
    assert.match(task.error, /프로필 "deep"\(task\).*codex CLI 가 PATH 에 없음/);
    const dflt = await resolveReviewer({ spec: null, targetDir: dir, which: only('codex') });
    assert.match(dflt.error, /프로필 "fast"\(default\).*claude CLI 가 PATH 에 없음/);
    const missing = await resolveReviewer({ spec: specWith({ version: 1, reviewer: 'nope' }), targetDir: dir, which: only('codex', 'claude') });
    assert.match(missing.error, /"nope"/);
    assert.equal(missing.profileError, true);
  } finally { await rm(dir, { recursive: true, force: true }); }
});

test('resolveReviewer: 깨진 reviewers.json·Done evidence 는 엔진 생략 경로에서만 error, 위치 인자 엔진은 보지 않는다', async () => {
  for (const reviewers of ['{ not json', JSON.stringify({ profiles: { a: { engine: 'codex', modle: 'x' } } })]) {
    const { dir } = await makeFixture({ reviewers });
    try {
      const omitted = await resolveReviewer({ spec: null, targetDir: dir, which: only('codex', 'claude') });
      assert.match(omitted.error, /reviewers\.json/);
      assert.equal(omitted.profileError, true);
      assert.deepEqual(await resolveReviewer({ requested: 'codex', targetDir: dir, which: only('codex') }), { engine: 'codex', model: null });
    } finally { await rm(dir, { recursive: true, force: true }); }
  }
  const { dir } = await makeFixture();
  try {
    const invalid = await resolveReviewer({ spec: specWith({ version: 1, reviewer: 7 }), targetDir: dir, which: only('codex', 'claude') });
    assert.match(invalid.error, /Done evidence/);
    assert.deepEqual(await resolveReviewer({ requested: 'claude', spec: specWith({ version: 1, reviewer: 7 }), targetDir: dir, which: only('claude') }),
      { engine: 'claude', model: null });
  } finally { await rm(dir, { recursive: true, force: true }); }
});

test('resolveEngine 반환 모양은 그대로다 (기존 호출부 호환)', async () => {
  const { dir } = await makeFixture();
  try {
    assert.deepEqual(await resolveEngine('codex', { targetDir: dir, which: only('codex') }), { engine: 'codex' });
    assert.deepEqual(await resolveEngine(undefined, { targetDir: dir, which: only('claude') }), { engine: 'claude', probed: true });
  } finally { await rm(dir, { recursive: true, force: true }); }
});

// ─── runReview: 거부·argv·기록 ──────────────────────────────────────────────

test('review --model: custom·엔진 생략·잘못된 값은 실행 전에 거부하고 아무것도 쓰지 않는다', async () => {
  const { dir, taskDir } = await makeFixture();
  try {
    const before = await readFile(join(taskDir, 'demo-artifact.md'), 'utf8');
    for (const [taskArgs, model, re] of [
      [['custom'], 'x', /custom 엔진과 함께 쓸 수 없음/],
      [[], 'gpt-5.5', /엔진 위치 인자/],
      [['focus'], 'gpt-5.5', /엔진 위치 인자/],
      [['codex'], '', /비어 있지 않은/],
      [['codex'], 'a b', /공백/],
      [['claude'], '-x', /`-` 로 시작/],
      [['claude'], '--dangerously-skip-permissions', /`-` 로 시작/],
    ]) {
      const r = await review(dir, { flags: { model }, taskArgs });
      assert.equal(r.exitCode, 1, `${taskArgs.join(' ')} --model ${model}`);
      assert.ok(r.logs.some(l => re.test(l)), `${taskArgs.join(' ')} --model ${JSON.stringify(model)}: ${r.logs.join(' | ')}`);
      assert.equal(r.calls.length, 0, '엔진을 실행하지 않는다');
    }
    assert.deepEqual((await readTaskMeta(dir, 'tester', 'demo')).reviews, []);
    assert.equal(await readFile(join(taskDir, 'demo-artifact.md'), 'utf8'), before);
  } finally { await rm(dir, { recursive: true, force: true }); }
});

test('review <engine> --model <id>: 모델이 엔진까지 도착하고 meta·artifact 에 기록된다 (marker·kind 불변)', async () => {
  const { dir, taskDir } = await makeFixture({ spec: specWith({ version: 1, reviewer: 'deep' }) });
  try {
    const r = await review(dir, { flags: { model: 'gpt-5.5-pro' }, taskArgs: ['codex', 'focus'] });
    assert.equal(r.exitCode, undefined, r.logs.join('\n'));
    assert.equal(r.calls[0].engine, 'codex');
    assert.equal(r.calls[0].model, 'gpt-5.5-pro', '위치 인자 + --model 은 task 프로필을 보지 않는다');
    const [entry] = (await readTaskMeta(dir, 'tester', 'demo')).reviews;
    assert.equal(entry.model, 'gpt-5.5-pro');
    assert.equal(entry.kind, 'codex', 'kind 는 엔진·프레이밍만');
    const artifact = await readFile(join(taskDir, 'demo-artifact.md'), 'utf8');
    assert.match(artifact, /^- engine: codex · model: gpt-5\.5-pro · scope: /m);
    assert.match(artifact, /<!-- harness:review kind=codex scope=\S+ tip=\S+ at=\S+ -->/, '마커 형식 불변');
  } finally { await rm(dir, { recursive: true, force: true }); }
});

test('review (엔진 생략): task 프로필의 엔진·모델로 돌고, 모델 없으면 meta 에 null·artifact 에 default', async () => {
  const { dir, taskDir } = await makeFixture({ spec: specWith({ version: 1, reviewer: 'deep' }) });
  try {
    const r = await review(dir);
    assert.equal(r.exitCode, undefined, r.logs.join('\n'));
    assert.deepEqual([r.calls[0].engine, r.calls[0].model], ['codex', 'gpt-5.5']);
    assert.ok(r.logs.some(l => l.includes('프로필 deep(task spec)이 codex · gpt-5.5 선택')), r.logs.join('\n'));
    assert.equal((await readTaskMeta(dir, 'tester', 'demo')).reviews[0].model, 'gpt-5.5');

    const plain = await review(dir, { taskArgs: ['claude'] });
    assert.equal(plain.calls[0].model, null);
    const reviews = (await readTaskMeta(dir, 'tester', 'demo')).reviews;
    assert.equal(reviews[1].model, null, 'null 이지 생략이 아니다');
    assert.ok(Object.hasOwn(reviews[1], 'model'));
    assert.match(await readFile(join(taskDir, 'demo-artifact.md'), 'utf8'), /^- engine: claude · model: default · scope: /m);
  } finally { await rm(dir, { recursive: true, force: true }); }
});

test('review (엔진 생략): 프로필 오류의 error 패킷은 위치 인자 엔진을 탈출구로 안내한다', async () => {
  const { dir } = await makeFixture({ reviewers: '{ broken', spec: specWith({ version: 1 }) });
  try {
    const r = await review(dir);
    assert.equal(r.exitCode, 1);
    assert.equal(r.calls.length, 0);
    assert.ok(r.logs.some(l => l.includes('엔진을 위치 인자로 명시하면 프로필을 보지 않는다')), r.logs.join('\n'));
    const ok = await review(dir, { taskArgs: ['codex'] });
    assert.equal(ok.exitCode, undefined, '위치 인자 엔진은 깨진 reviewers.json 을 보지 않는다');
  } finally { await rm(dir, { recursive: true, force: true }); }
});

test('review (엔진 생략): custom 프로필은 custom.command 로 돈다', async () => {
  const dir0 = await mkdtemp(join(tmpdir(), 'harness-review-model-custom-'));
  const fake = join(dir0, 'fake.sh');
  await writeFile(fake, '#!/bin/sh\necho "verdict: ok"\n');
  await chmod(fake, 0o755);
  const { dir } = await makeFixture({ reviewers: { custom: { command: `${fake} {prompt}` }, profiles: { mine: { engine: 'custom' } }, default: 'mine' } });
  const { logs, restore } = captureLogs();
  try {
    const { exitCode } = await withExit(() => runReview({ targetDir: dir, flags: {}, taskArgs: [] }));
    assert.equal(exitCode, undefined, logs.join('\n'));
    const [entry] = (await readTaskMeta(dir, 'tester', 'demo')).reviews;
    assert.deepEqual([entry.engine, entry.kind, entry.model], ['custom', 'custom', null]);
  } finally { restore(); await rm(dir, { recursive: true, force: true }); await rm(dir0, { recursive: true, force: true }); }
});

test('renderReviewBlock: model 키가 없으면(구 호출) 표기하지 않는다', () => {
  const base = { kind: 'k', engine: 'codex', scope: 'worktree', tip: 'none', at: '2026-11-18T00:00:00.000Z', output: 'x' };
  assert.match(renderReviewBlock(base), /^- engine: codex · scope: worktree/m);
  assert.match(renderReviewBlock({ ...base, model: null }), /^- engine: codex · model: default · scope:/m);
});

// ─── Done evidence "reviewer" ────────────────────────────────────────────────

test('parseDoneEvidenceDeclaration: reviewer 는 비어 있지 않은 문자열만 — 요건 값은 바꾸지 않는다', () => {
  const d = parseDoneEvidenceDeclaration(specWith({ version: 1, reviewer: 'deep' }));
  assert.deepEqual(d, { status: 'configured', tests: 'optional', review: 'optional', verify: 'optional', reviewer: 'deep' });
  for (const reviewer of [5, '', '  ', null, ['deep']]) {
    assert.equal(parseDoneEvidenceDeclaration(specWith({ version: 1, reviewer })).status, 'invalid', JSON.stringify(reviewer));
  }
  assert.equal(parseDoneEvidenceDeclaration('# spec\n').reviewer, undefined);
});

test('reviewer 만 있는 블록은 done·scenario check 의 요건·출력을 바꾸지 않는다', async () => {
  const outputs = [];
  for (const spec of ['# demo — Spec\n', specWith({ version: 1, reviewer: 'deep' })]) {
    const { dir } = await makeFixture({ spec });
    await writeFile(join(dir, 'docs/tester/demo/demo-plan.md'), '# demo — Plan\n\n## 단계\n- [x] done\n');
    await writeFile(join(dir, 'docs/tester/demo/demo-artifact.md'), taskArtifactTemplate('demo') + '\n- 결과\n');
    const { logs, restore } = captureLogs();
    try {
      const scenario = await withExit(() => runScenarioCheck({ targetDir: dir, flags: {} }));
      assert.equal(scenario.result.status, 'not-configured');
      await withExit(() => runDone({ targetDir: dir, flags: {} }));
      outputs.push(logs.filter(l => !/\d{4}-\d{2}-\d{2}/.test(l)).join('\n'));
    } finally { restore(); await rm(dir, { recursive: true, force: true }); }
  }
  assert.equal(outputs[1], outputs[0]);
});

// ─── task --reviewer ─────────────────────────────────────────────────────────

const noRemote = { doneOnMain: async () => null };

async function task(dir, name, flags = {}) {
  const { logs, restore } = captureLogs();
  const before = process.exitCode;
  try {
    process.exitCode = undefined;
    await runTask({ targetDir: dir, flags: { member: 'tester', ...flags }, taskArgs: [name] }, noRemote);
    return { logs, exitCode: process.exitCode ?? 0 };
  } finally { restore(); process.exitCode = before; }
}

async function bareRepo(reviewers = PROFILES) {
  const dir = await mkdtemp(join(tmpdir(), 'harness-task-reviewer-'));
  await mkdir(join(dir, '.harness'), { recursive: true });
  if (reviewers) await writeFile(join(dir, '.harness/reviewers.json'), JSON.stringify(reviewers));
  return dir;
}

test('task <new> --reviewer: 주석 예시 앞에 새 블록을 쓰고 파서가 그 프로필을 읽는다', async () => {
  const dir = await bareRepo();
  try {
    const r = await task(dir, 'feat', { reviewer: 'deep' });
    assert.equal(r.exitCode, 0, r.logs.join('\n'));
    const spec = await readFile(join(dir, 'docs/tester/feat/feat-spec.md'), 'utf8');
    assert.equal(spec, taskSpecTemplate('feat', { reviewer: 'deep' }));
    assert.match(spec, /## Done evidence\n```json\n\{ "version": 1, "reviewer": "deep" \}\n```\n<!--\n```json\n\{ "version": 1, "review": "required", "tests": "required" \}/);
    assert.equal(parseDoneEvidenceDeclaration(spec).reviewer, 'deep');
    assert.ok(r.logs.some(l => l.startsWith('reviewer: deep')));
  } finally { await rm(dir, { recursive: true, force: true }); }
});

test('task --reviewer 없으면 spec 템플릿은 종전 그대로다', () => {
  assert.equal(taskSpecTemplate('feat', {}), taskSpecTemplate('feat'));
  assert.ok(!taskSpecTemplate('feat').includes('"reviewer"'));
  assert.equal(parseDoneEvidenceDeclaration(taskSpecTemplate('feat')).status, 'not-configured');
});

test('task --reviewer: 없는 프로필·reviewers.json 없음·깨진 스키마는 디렉터리를 만들기 전에 거부한다', async () => {
  for (const [reviewers, re] of [
    [PROFILES, /profiles 에 "nope" 가 없음/],
    [null, /profiles 에 "nope" 가 없음/],
    [{ profiles: { nope: { engine: 'codex', modle: 'x' } } }, /스키마 오류/],
  ]) {
    const dir = await bareRepo(reviewers);
    try {
      const r = await task(dir, 'feat', { reviewer: 'nope' });
      assert.equal(r.exitCode, 1);
      assert.ok(r.logs.some(l => re.test(l)), r.logs.join('\n'));
      await assert.rejects(readFile(join(dir, 'docs/tester/feat/feat-spec.md')), /ENOENT/);
      await assert.rejects(readFile(join(dir, '.harness/active.json')), /ENOENT/);
    } finally { await rm(dir, { recursive: true, force: true }); }
  }
});

test('task <existing> --reviewer: 사람이 쓴 spec 을 고치지 않고, 활성 포인터도 옮기지 않고 거부한다', async () => {
  const dir = await bareRepo();
  try {
    assert.equal((await task(dir, 'web-feat')).exitCode, 0);
    assert.equal((await task(dir, 'other')).exitCode, 0);
    const specBefore = await readFile(join(dir, 'docs/tester/web-feat/web-feat-spec.md'), 'utf8');
    const activeBefore = await readFile(join(dir, '.harness/active.json'), 'utf8');
    const metaBefore = await readFile(join(dir, 'docs/tester/web-feat/web-feat-meta.json'), 'utf8');
    const r = await task(dir, 'web-feat', { reviewer: 'deep', area: 'web' });
    assert.equal(r.exitCode, 1);
    assert.ok(r.logs.some(l => l.includes('새 task 를 만들 때만')), r.logs.join('\n'));
    assert.ok(r.logs.some(l => l.includes('"reviewer": "deep"')), 'spec 손 편집을 안내한다');
    assert.equal(await readFile(join(dir, 'docs/tester/web-feat/web-feat-spec.md'), 'utf8'), specBefore);
    assert.equal(await readFile(join(dir, '.harness/active.json'), 'utf8'), activeBefore, '활성 포인터 불변');
    assert.equal(await readFile(join(dir, 'docs/tester/web-feat/web-feat-meta.json'), 'utf8'), metaBefore, 'area 채택 meta 쓰기도 없다');
  } finally { await rm(dir, { recursive: true, force: true }); }
});

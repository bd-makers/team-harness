import { test } from 'node:test';
import assert from 'node:assert/strict';
import { mkdtemp, mkdir, writeFile, readFile, readdir, rm, symlink, chmod } from 'node:fs/promises';
import { join, resolve, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { tmpdir } from 'node:os';
import {
  parseLearnings, parseRuleMarker, ruleMarker, renderRule, annotatePromoted, parsePathsFlag,
} from '../src/commands/rules.mjs';
import { splitRulePaths } from '../src/harness.mjs';
import { runRules } from '../src/commands/rules.mjs';
import { exists } from '../src/fsx.mjs';
import { OBSERVATION_SCHEMA } from '../src/observation.mjs';
import { checkRuleProvenance, TEMPLATE_RULE_ORIGIN } from '../src/commands/rules.mjs';
import { runDoctor } from '../src/commands/doctor.mjs';

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), '..');

const ARTIFACT = `# demo — Artifact

## 결과

- 결과 불릿은 학습이 아니다

## Reviews

## Learnings

- 첫 학습 — 한 줄
- 둘째 학습이 길어서
  다음 줄로 이어진다

### 소제목은 절을 끝내지 않는다

- 셋째 학습 (→ rules/third.md, 2026-09-05)

## Learnings (2026-09-06)

-
- 넷째 학습
`;

test('parseLearnings: Learnings 절 아래 불릿만 파일 순서로 번호, 이어지는 줄은 한 항목, 빈 불릿 제외, ### 는 절 안', () => {
  const entries = parseLearnings(ARTIFACT);
  assert.deepEqual(entries.map(e => [e.index, e.date, e.text, e.promoted]), [
    [1, null, '첫 학습 — 한 줄', null],
    [2, null, '둘째 학습이 길어서 다음 줄로 이어진다', null],
    [3, null, '셋째 학습', { rule: 'third', at: '2026-09-05' }],
    [4, '2026-09-06', '넷째 학습', null],
  ]);
});

test('parseLearnings: start/end 는 이어지는 줄을 포함한 0-based 줄 번호', () => {
  const [, second] = parseLearnings(ARTIFACT);
  const lines = ARTIFACT.split('\n');
  assert.match(lines[second.start], /^- 둘째/);
  assert.match(lines[second.end], /^  다음 줄로/);
});

test('parseLearnings: Learnings 절이 없으면 빈 배열', () => {
  assert.deepEqual(parseLearnings('# x\n\n## 결과\n\n- a\n'), []);
});

test('ruleMarker ↔ parseRuleMarker 왕복; origin·since 누락·날짜 아님·다른 마커는 null', () => {
  assert.deepEqual(parseRuleMarker(ruleMarker({ origin: 'hslee/demo', since: '2026-09-05' })),
    { origin: 'hslee/demo', since: '2026-09-05' });
  assert.deepEqual(parseRuleMarker('---\npaths:\n  - "a"\n---\n<!-- harness:rule origin="a/b" since=2026-01-02 -->\n# x\n'),
    { origin: 'a/b', since: '2026-01-02' });
  assert.equal(parseRuleMarker('# 규칙\n'), null);
  assert.equal(parseRuleMarker(null), null);
  assert.equal(parseRuleMarker('<!-- harness:rule origin=hslee/demo -->'), null);
  assert.equal(parseRuleMarker('<!-- harness:rule origin=hslee/demo since=어제 -->'), null);
  assert.equal(parseRuleMarker('<!-- harness:mirror -->'), null);
});

test('renderRule: paths 없으면 frontmatter 없이 마커가 첫 줄; 있으면 splitRulePaths가 같은 paths를 되돌리고 마커는 본문', () => {
  const plain = renderRule({ slug: 'no-nul', text: 'NUL은 \\u0000 표기로', origin: 'hslee/demo', since: '2026-09-05' });
  assert.equal(plain, '<!-- harness:rule origin=hslee/demo since=2026-09-05 -->\n# no-nul\n\n- NUL은 \\u0000 표기로\n');
  assert.deepEqual(splitRulePaths(plain).paths, []);

  const scoped = renderRule({ slug: 'api', text: 't', origin: 'hslee/demo', since: '2026-09-05', paths: ['src/**/*.ts', '[id].tsx'] });
  const split = splitRulePaths(scoped);
  assert.deepEqual(split.paths, ['src/**/*.ts', '[id].tsx']);
  assert.ok(split.body.startsWith('<!-- harness:rule '), '마커는 frontmatter가 아니라 본문 첫 줄');
  assert.equal(parseRuleMarker(scoped).origin, 'hslee/demo');
});

test('annotatePromoted: 항목의 마지막 줄 끝에만 표기, 나머지 바이트 동일, 다시 파싱하면 promoted', () => {
  const out = annotatePromoted(ARTIFACT, 2, 'second', '2026-09-06');
  const idx = ARTIFACT.split('\n').findIndex(l => l.startsWith('  다음 줄로'));
  assert.equal(out.split('\n')[idx], '  다음 줄로 이어진다 (→ rules/second.md, 2026-09-06)');
  assert.equal(out.replace(' (→ rules/second.md, 2026-09-06)', ''), ARTIFACT);
  assert.deepEqual(parseLearnings(out)[1].promoted, { rule: 'second', at: '2026-09-06' });
});

test('annotatePromoted: 범위 밖 index는 RangeError', () => {
  assert.throws(() => annotatePromoted(ARTIFACT, 9, 'x', '2026-09-06'), RangeError);
});

test('parsePathsFlag: 쉼표 구분·trim·빈 조각 제거, 문자열 아니면 []', () => {
  assert.deepEqual(parsePathsFlag(' src/**/*.ts, ,lib/** '), ['src/**/*.ts', 'lib/**']);
  assert.deepEqual(parsePathsFlag(undefined), []);
  assert.deepEqual(parsePathsFlag(true), []);
});

// ── 러너 ───────────────────────────────────────────────────────────────────

async function makeProject({ artifact = ARTIFACT, active = true } = {}) {
  const dir = await mkdtemp(join(tmpdir(), 'harness-rules-'));
  await mkdir(join(dir, '.harness'), { recursive: true });
  await writeFile(join(dir, '.harness/active.json'),
    active ? JSON.stringify({ user: 'tester', task: 'demo', path: 'docs/tester/demo' }) : '{}');
  await mkdir(join(dir, 'docs/tester/demo'), { recursive: true });
  if (artifact !== null) await writeFile(join(dir, 'docs/tester/demo/demo-artifact.md'), artifact);
  return dir;
}

function capture() {
  const logs = [];
  const orig = console.log;
  console.log = (...args) => logs.push(args.join(' '));
  return { logs, restore: () => { console.log = orig; } };
}

// exitCode를 매 호출 전 비우고 끝나면 원복 — 다른 테스트 파일과 같은 프로세스를 공유한다.
async function run(dir, taskArgs, flags = {}) {
  const prev = process.exitCode;
  process.exitCode = undefined;
  const { logs, restore } = capture();
  try {
    const result = await runRules({ targetDir: dir, flags, taskArgs });
    return { result, logs, exitCode: process.exitCode };
  } finally { restore(); process.exitCode = prev; }
}

const ARTIFACT_PATH = 'docs/tester/demo/demo-artifact.md';

test('runRules promote (번호 없음): 항목을 번호·날짜·승격 표시와 함께 나열, exit 0, 파일 무변경', async () => {
  const dir = await makeProject();
  try {
    const { result, logs, exitCode } = await run(dir, ['promote']);
    assert.equal(exitCode, undefined);
    assert.equal(result.status, 'listed');
    assert.equal(result.entries.length, 4);
    assert.match(logs[0], /^✓ rules promote: docs\/tester\/demo\/demo-artifact\.md — Learnings 4개/);
    assert.match(logs.join('\n'), /  1\. \[날짜 없음\] 첫 학습 — 한 줄/);
    assert.match(logs.join('\n'), /  3\. \[날짜 없음\] 셋째 학습  \[promoted → rules\/third\.md, 2026-09-05\]/);
    assert.match(logs.join('\n'), /  4\. \[2026-09-06\] 넷째 학습/);
    assert.equal(await readFile(join(dir, ARTIFACT_PATH), 'utf8'), ARTIFACT);
    assert.equal(await exists(join(dir, '.claude/rules')), false);
  } finally { await rm(dir, { recursive: true, force: true }); }
});

test('runRules promote --json (번호 없음): listed envelope + learnings 배열', async () => {
  const dir = await makeProject();
  try {
    const { logs } = await run(dir, ['promote'], { json: true });
    assert.equal(logs.length, 1);
    const env = JSON.parse(logs[0]);
    assert.equal(env.schema, OBSERVATION_SCHEMA);
    assert.equal(env.command, 'rules');
    assert.equal(env.status, 'listed');
    assert.equal(env.action, 'promote');
    assert.deepEqual(env.learnings[2], { index: 3, date: null, text: '셋째 학습', promoted: { rule: 'third', at: '2026-09-05' } });
    assert.deepEqual(env.artifacts, [ARTIFACT_PATH]);
  } finally { await rm(dir, { recursive: true, force: true }); }
});

test('runRules promote: Learnings 없음 → no-data, exit 0', async () => {
  const dir = await makeProject({ artifact: '# demo — Artifact\n\n## 결과\n\n- x\n' });
  try {
    const { result, logs, exitCode } = await run(dir, ['promote']);
    assert.equal(exitCode, undefined);
    assert.equal(result.status, 'no-data');
    assert.match(logs[0], /^- rules promote: .*Learnings 항목 없음/);
    assert.match(logs.at(-1), /harness-team retro/);
  } finally { await rm(dir, { recursive: true, force: true }); }
});

test('runRules promote <n> --name --paths: 규칙 파일(마커·paths·본문) + artifact 표기 + cursor 미러', async () => {
  const dir = await makeProject();
  try {
    const { result, logs, exitCode } = await run(dir, ['promote', '2'], { name: 'second-rule', paths: 'src/**/*.ts, tests/**' });
    assert.equal(exitCode, undefined);
    assert.equal(result.status, 'success');
    assert.equal(result.rule, '.claude/rules/second-rule.md');
    assert.equal(result.index, 2);
    assert.deepEqual(result.paths, ['src/**/*.ts', 'tests/**']);
    assert.equal(result.mirrored, 1);

    const rule = await readFile(join(dir, '.claude/rules/second-rule.md'), 'utf8');
    assert.deepEqual(parseRuleMarker(rule), { origin: 'tester/demo', since: result.since });
    assert.match(result.since, /^\d{4}-\d{2}-\d{2}$/);
    assert.deepEqual(splitRulePaths(rule).paths, ['src/**/*.ts', 'tests/**']);
    assert.match(rule, /\n# second-rule\n\n- 둘째 학습이 길어서 다음 줄로 이어진다\n$/);

    const artifact = await readFile(join(dir, ARTIFACT_PATH), 'utf8');
    assert.deepEqual(parseLearnings(artifact)[1].promoted, { rule: 'second-rule', at: result.since });
    assert.equal(artifact.replace(` (→ rules/second-rule.md, ${result.since})`, ''), ARTIFACT, '표기 외 바이트 동일');

    const mdc = await readFile(join(dir, '.cursor/rules/second-rule.mdc'), 'utf8');
    assert.match(mdc, /globs: src\/\*\*\/\*\.ts, tests\/\*\*/);
    assert.match(mdc, /<!-- harness:rule origin=tester\/demo/);

    assert.match(logs[0], /^✓ rules promote: \.claude\/rules\/second-rule\.md 승격 \(origin=tester\/demo since=\d{4}-\d{2}-\d{2}, paths=src\/\*\*\/\*\.ts,tests\/\*\*\)$/);
    assert.match(logs[1], /^✓ artifact: docs\/tester\/demo\/demo-artifact\.md #2 에 승격 표기$/);
    assert.match(logs[2], /^✓ cursor mirror: 1 rule\(s\)$/);
  } finally { await rm(dir, { recursive: true, force: true }); }
});

test('runRules promote --json 성공: success envelope + artifacts 2개 + extra', async () => {
  const dir = await makeProject();
  try {
    const { logs } = await run(dir, ['promote', '1'], { name: 'first', json: true });
    const env = JSON.parse(logs[0]);
    assert.equal(env.status, 'success');
    assert.equal(env.error, null);
    assert.deepEqual(env.artifacts, ['.claude/rules/first.md', ARTIFACT_PATH]);
    assert.equal(env.action, 'promote');
    assert.equal(env.index, 1);
    assert.deepEqual(env.paths, []);
    assert.equal(env.mirrored, 1);
    assert.equal(splitRulePaths(await readFile(join(dir, '.claude/rules/first.md'), 'utf8')).paths.length, 0, 'paths 없으면 frontmatter 없음');
  } finally { await rm(dir, { recursive: true, force: true }); }
});

test('runRules promote: 이미 승격된 항목 → already-promoted, exit 2, 무변경', async () => {
  const dir = await makeProject();
  try {
    const { result, logs, exitCode } = await run(dir, ['promote', '3'], { name: 'again' });
    assert.equal(exitCode, 2);
    assert.deepEqual(result, { status: 'error', code: 'already-promoted' });
    assert.match(logs[0], /^✗ rules promote: already-promoted$/);
    assert.match(logs[1], /rules\/third\.md/);
    assert.equal(await exists(join(dir, '.claude/rules/again.md')), false);
    assert.equal(await readFile(join(dir, ARTIFACT_PATH), 'utf8'), ARTIFACT);
  } finally { await rm(dir, { recursive: true, force: true }); }
});

test('runRules promote: 번호가 정수 아님·0·범위 밖 → invalid-index, exit 2', async () => {
  const dir = await makeProject();
  try {
    for (const bad of ['x', '0', '5', '1.5']) {
      const { result, exitCode } = await run(dir, ['promote', bad], { name: 'ok' });
      assert.equal(exitCode, 2, bad);
      assert.equal(result.code, 'invalid-index', bad);
    }
    assert.equal(await exists(join(dir, '.claude/rules')), false);
  } finally { await rm(dir, { recursive: true, force: true }); }
});

test('runRules promote: --name 없음·경로 구분자·상위 참조 → invalid-name, exit 2', async () => {
  const dir = await makeProject();
  try {
    for (const flags of [{}, { name: '../escape' }, { name: 'a/b' }, { name: 'sp ace' }]) {
      const { result, exitCode } = await run(dir, ['promote', '1'], flags);
      assert.equal(exitCode, 2, JSON.stringify(flags));
      assert.equal(result.code, 'invalid-name', JSON.stringify(flags));
    }
    assert.equal(await exists(join(dir, '.claude/rules')), false);
    assert.equal(await exists(join(dir, 'escape.md')), false);
  } finally { await rm(dir, { recursive: true, force: true }); }
});

test('runRules promote: 대상 규칙 파일이 이미 있음 → rule-exists, exit 2, 기존 내용·artifact 보존', async () => {
  const dir = await makeProject();
  try {
    await mkdir(join(dir, '.claude/rules'), { recursive: true });
    await writeFile(join(dir, '.claude/rules/dup.md'), 'keep me\n');
    const { result, exitCode } = await run(dir, ['promote', '1'], { name: 'dup' });
    assert.equal(exitCode, 2);
    assert.equal(result.code, 'rule-exists');
    assert.equal(await readFile(join(dir, '.claude/rules/dup.md'), 'utf8'), 'keep me\n');
    assert.equal(await readFile(join(dir, ARTIFACT_PATH), 'utf8'), ARTIFACT);
  } finally { await rm(dir, { recursive: true, force: true }); }
});

test('runRules promote: 활성 task 없음 → no-active-task, exit 1, escalation packet 계약 (--json 도)', async () => {
  const dir = await makeProject({ active: false });
  try {
    const text = await run(dir, ['promote']);
    assert.equal(text.exitCode, 1);
    assert.equal(text.result.code, 'no-active-task');
    assert.deepEqual(text.logs.map(l => l.split(':')[0]),
      ['✗ rules promote', 'cause', 'retry', 'alternatives', 'default', 'stop']);
    const json = await run(dir, ['promote'], { json: true });
    const env = JSON.parse(json.logs[0]);
    assert.equal(env.status, 'error');
    assert.ok(env.error.root_cause && env.error.safe_retry && env.error.stop_condition);
    // escalation packet (권고 ③) — 대안과 무응답 시 남는 상태를 함께 준다.
    assert.ok(Array.isArray(env.error.alternatives) && env.error.alternatives.length > 0, 'alternatives');
    assert.ok(env.error.safe_default, 'safe_default');
    assert.equal(env.code, 'no-active-task');
  } finally { await rm(dir, { recursive: true, force: true }); }
});

test('runRules promote: artifact.md 없음 → no-artifact, exit 2', async () => {
  const dir = await makeProject({ artifact: null });
  try {
    const { result, exitCode } = await run(dir, ['promote']);
    assert.equal(exitCode, 2);
    assert.equal(result.code, 'no-artifact');
  } finally { await rm(dir, { recursive: true, force: true }); }
});

test('runRules: 첫 토큰이 promote 가 아니면 invalid-action + usage, exit 2', async () => {
  const dir = await makeProject();
  try {
    const { result, logs, exitCode } = await run(dir, ['nope']);
    assert.equal(exitCode, 2);
    assert.equal(result.status, 'invalid-action');
    assert.match(logs[1], /^usage: harness-team rules promote \[<n>\] \[--name <slug>\] \[--paths <a,b>\]$/);
  } finally { await rm(dir, { recursive: true, force: true }); }
});

// ── 유래 검사 · 템플릿 계약 · doctor 배선 ────────────────────────────────────

const TEMPLATE_RULES_DIR = join(ROOT, 'templates/.claude/rules');

// 템플릿이 곧 가장 강한 "유래 있음" fixture — 마커를 빼먹으면 모든 신규 설치가 doctor 경고를 받는다(checkDecisionLog 계약과 같은 방식).
test('templates/.claude/rules 4종은 본문 첫 줄에 유효한 harness:rule 마커를 지닌다 (템플릿↔검사 계약)', async () => {
  const files = (await readdir(TEMPLATE_RULES_DIR)).filter(f => f.endsWith('.md')).sort();
  assert.deepEqual(files, ['navigation.md', 'state-management.md', 'styling.md', 'testing.md']);
  for (const f of files) {
    const content = await readFile(join(TEMPLATE_RULES_DIR, f), 'utf8');
    const marker = parseRuleMarker(content);
    assert.ok(marker, `${f}: 마커 없음`);
    assert.equal(marker.origin, TEMPLATE_RULE_ORIGIN, f);
    const { paths, body } = splitRulePaths(content);
    assert.ok(paths.length > 0, `${f}: paths frontmatter 는 유지돼야 한다`);
    assert.ok(body.startsWith('<!-- harness:rule '), `${f}: 마커는 frontmatter 뒤 본문 첫 줄`);
  }
});

test('checkRuleProvenance: .claude/rules 없음 → null', async () => {
  const dir = await mkdtemp(join(tmpdir(), 'harness-prov-'));
  try { assert.equal(await checkRuleProvenance(dir), null); }
  finally { await rm(dir, { recursive: true, force: true }); }
});

test('checkRuleProvenance: 템플릿 4종을 복사한 설치 → null', async () => {
  const dir = await mkdtemp(join(tmpdir(), 'harness-prov-tpl-'));
  try {
    await mkdir(join(dir, '.claude/rules'), { recursive: true });
    for (const f of await readdir(TEMPLATE_RULES_DIR)) {
      await writeFile(join(dir, '.claude/rules', f), await readFile(join(TEMPLATE_RULES_DIR, f)));
    }
    assert.equal(await checkRuleProvenance(dir), null);
  } finally { await rm(dir, { recursive: true, force: true }); }
});

test('checkRuleProvenance: 마커 없음·since 없음 규칙(하위 디렉터리 포함)만 정렬해 나열 + 스탬프 안내', async () => {
  const dir = await mkdtemp(join(tmpdir(), 'harness-prov-miss-'));
  try {
    await mkdir(join(dir, '.claude/rules/sub'), { recursive: true });
    await writeFile(join(dir, '.claude/rules/ok.md'), `${ruleMarker({ origin: 'u/t', since: '2026-09-05' })}\n# ok\n`);
    await writeFile(join(dir, '.claude/rules/zeta.md'), '<!-- harness:rule origin=u/t -->\n# since 없음\n');
    await writeFile(join(dir, '.claude/rules/sub/alpha.md'), '# 마커 없음\n');
    const w = await checkRuleProvenance(dir);
    assert.ok(typeof w === 'string');
    assert.match(w, /유래 없는 규칙 2개: sub\/alpha\.md, zeta\.md/);
    assert.doesNotMatch(w, /ok\.md/);
    assert.match(w, /<!-- harness:rule origin=<user>\/<task> since=<YYYY-MM-DD> -->/);
    assert.match(w, /harness-team rules promote/);
  } finally { await rm(dir, { recursive: true, force: true }); }
});

test('runDoctor --json: 마커 없는 규칙이 있으면 checks[] 에 rule provenance warning (fail 아님)', async () => {
  const dir = await mkdtemp(join(tmpdir(), 'harness-prov-doctor-'));
  await mkdir(join(dir, '.claude/rules'), { recursive: true });
  await writeFile(join(dir, '.claude/rules/orphan.md'), '# 유래 없는 규칙\n');
  const { logs, restore } = capture();
  const prev = process.exitCode;
  try {
    await runDoctor({ targetDir: dir, root: ROOT, flags: { json: true } });
    const env = JSON.parse(logs.join('\n'));
    const check = env.checks.find(c => c.label === 'rule provenance');
    assert.ok(check, 'rule provenance check 존재');
    assert.equal(check.status, 'warning');
    assert.match(check.detail, /orphan\.md/);
  } finally { restore(); process.exitCode = prev; await rm(dir, { recursive: true, force: true }); }
});

// ── codex 리뷰(2026-09-05) 발견 재현 ──────────────────────────────────────

test('runRules promote: 대상 이름이 dangling symlink 여도 rule-exists — 링크 바깥으로 쓰지 않는다 (codex P1)', async () => {
  const dir = await makeProject();
  const outside = join(dir, 'outside-target.md');
  try {
    await mkdir(join(dir, '.claude/rules'), { recursive: true });
    await symlink(outside, join(dir, '.claude/rules/evil.md'));
    const { result, exitCode } = await run(dir, ['promote', '1'], { name: 'evil' });
    assert.equal(exitCode, 2);
    assert.equal(result.code, 'rule-exists');
    assert.equal(await exists(outside), false, '링크 대상이 생성되면 안 된다');
    assert.equal(await readFile(join(dir, ARTIFACT_PATH), 'utf8'), ARTIFACT);
  } finally { await rm(dir, { recursive: true, force: true }); }
});

test('runRules promote: artifact 쓰기 실패 시 방금 쓴 규칙 파일을 되돌리고 artifact-write-failed (codex P2)',
  { skip: process.getuid?.() === 0 ? 'root 는 권한 비트를 무시한다' : false }, async () => {
  const dir = await makeProject();
  try {
    await chmod(join(dir, ARTIFACT_PATH), 0o444);
    const { result, exitCode } = await run(dir, ['promote', '1'], { name: 'orphan' });
    assert.equal(exitCode, 2);
    assert.equal(result.code, 'artifact-write-failed');
    assert.equal(await exists(join(dir, '.claude/rules/orphan.md')), false, '고아 규칙이 남으면 안 된다');
    assert.equal(await readFile(join(dir, ARTIFACT_PATH), 'utf8'), ARTIFACT);
  } finally { await chmod(join(dir, ARTIFACT_PATH), 0o644).catch(() => {}); await rm(dir, { recursive: true, force: true }); }
});

test('runRules promote: cursor 미러 실패는 승격을 되돌리지 않고 경고 + sync 안내 (codex P2)', async () => {
  const dir = await makeProject();
  try {
    await mkdir(join(dir, '.cursor'), { recursive: true });
    await writeFile(join(dir, '.cursor/rules'), 'not a directory\n');   // mkdir .cursor/rules 가 실패한다
    const { result, logs, exitCode } = await run(dir, ['promote', '1'], { name: 'first' });
    assert.equal(exitCode, undefined);
    assert.equal(result.status, 'success');
    assert.equal(result.mirrored, null);
    assert.equal(await exists(join(dir, '.claude/rules/first.md')), true);
    assert.deepEqual(parseLearnings(await readFile(join(dir, ARTIFACT_PATH), 'utf8'))[0].promoted?.rule, 'first');
    assert.match(logs.join('\n'), /⚠️ cursor mirror: .*harness-team sync/);
  } finally { await rm(dir, { recursive: true, force: true }); }
});

test('parseRuleMarker: 마커는 frontmatter 뒤 본문 첫 줄(앞 빈 줄 허용)에만 유효 — 본문 중간·fenced 예시는 무시 (codex P2)', () => {
  assert.equal(parseRuleMarker('# 규칙\n\n예시:\n```\n<!-- harness:rule origin=u/t since=2026-09-05 -->\n```\n'), null);
  assert.deepEqual(parseRuleMarker('\n\n<!-- harness:rule origin=u/t since=2026-09-05 -->\n# x\n'), { origin: 'u/t', since: '2026-09-05' });
  assert.deepEqual(parseRuleMarker('---\npaths:\n  - "a"\n---\n\n<!-- harness:rule origin=u/t since=2026-09-05 -->\n'), { origin: 'u/t', since: '2026-09-05' });
});

test('annotatePromoted: CRLF artifact 는 CRLF 를 유지하고 표기 한 건만 바뀐다 (codex P2)', () => {
  const crlf = ARTIFACT.replace(/\n/g, '\r\n');
  const out = annotatePromoted(crlf, 1, 'first', '2026-09-06');
  assert.equal((out.match(/\r\n/g) || []).length, (crlf.match(/\r\n/g) || []).length);
  assert.equal(out.replace(' (→ rules/first.md, 2026-09-06)', ''), crlf);
  assert.match(out, /- 첫 학습 — 한 줄 \(→ rules\/first\.md, 2026-09-06\)\r\n/);
  assert.deepEqual(parseLearnings(out)[0].promoted, { rule: 'first', at: '2026-09-06' });
});

test('runRules --json: 첫 토큰이 promote 가 아니면 error envelope (code invalid-action), exit 2 (codex P2)', async () => {
  const dir = await makeProject();
  try {
    const { logs, exitCode } = await run(dir, ['nope'], { json: true });
    assert.equal(exitCode, 2);
    assert.equal(logs.length, 1);
    const env = JSON.parse(logs[0]);
    assert.equal(env.command, 'rules');
    assert.equal(env.status, 'error');
    assert.equal(env.code, 'invalid-action');
    assert.ok(env.error.root_cause && env.error.safe_retry && env.error.stop_condition);
    // escalation packet (권고 ③) — 대안과 무응답 시 남는 상태를 함께 준다.
    assert.ok(Array.isArray(env.error.alternatives) && env.error.alternatives.length > 0, 'alternatives');
    assert.ok(env.error.safe_default, 'safe_default');
  } finally { await rm(dir, { recursive: true, force: true }); }
});

test('checkRuleProvenance: 읽을 수 없는 규칙(dangling symlink)은 "유래 없음"이 아니라 별도 항목으로 보고 (codex P3)', async () => {
  const dir = await mkdtemp(join(tmpdir(), 'harness-prov-unread-'));
  try {
    await mkdir(join(dir, '.claude/rules'), { recursive: true });
    await writeFile(join(dir, '.claude/rules/ok.md'), `${ruleMarker({ origin: 'u/t', since: '2026-09-05' })}\n# ok\n`);
    await symlink(join(dir, 'gone.md'), join(dir, '.claude/rules/broken.md'));
    const w = await checkRuleProvenance(dir);
    assert.ok(typeof w === 'string');
    assert.match(w, /읽을 수 없는 규칙 1개: broken\.md/);
    assert.doesNotMatch(w, /유래 없는 규칙/);
  } finally { await rm(dir, { recursive: true, force: true }); }
});

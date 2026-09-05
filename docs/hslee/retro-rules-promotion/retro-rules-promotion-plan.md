# retro-rules-promotion — Plan

> **For agentic workers:** 이 저장소는 D4(단일 스레드 쓰기)라 **inline 실행**(superpowers:executing-plans)만 쓴다 — 서브에이전트 작성 금지.
> 각 Task는 RED→GREEN→커밋 사이클 하나. 체크박스는 실행하면서 `- [x]`로 닫는다(`done` 가드가 미완 박스를 막는다).

**Goal:** 활성 task artifact의 `## Learnings` 항목을 사용자가 고르면 `.claude/rules/<slug>.md`(유래 마커 포함)로 기계적으로 복사하고 cursor 미러를 재생성하는 `harness-team rules promote`를 만들고, 템플릿 4종에 마커를 박고, doctor가 유래 없는 규칙을 경고하게 한다.

**Architecture:** `src/commands/rules.mjs` 한 모듈 — 순수(`parseLearnings`·`parseRuleMarker`·`renderRule`·`annotatePromoted`) → I/O(`checkRuleProvenance`·`runRulesPromote`·`runRules`). 기존 `readActive`(task.mjs)·`collectRuleFiles`/`mirrorCursorRules`/`splitRulePaths`(harness.mjs)·envelope(observation.mjs)를 재사용한다. retro 계약·artifact 템플릿·훅은 불변.

**Tech Stack:** Node ≥24 ESM, `node:test`, 기존 `src/fsx.mjs`·`src/observation.mjs`.

**Spec:** `docs/hslee/retro-rules-promotion/retro-rules-promotion-spec.md`

## Global Constraints

- 승격은 **복사 + 표기**: artifact 항목을 지우지 않는다. 기존 `.claude/rules/<slug>.md`는 덮어쓰지 않는다. 검증은 첫 쓰기 전에 모두 끝낸다(거부 시 파일 무변경).
- 마커 문법: `<!-- harness:rule origin=<user>/<task> since=<YYYY-MM-DD> -->` — origin·since 둘 다 있어야 유효. 템플릿 origin은 `harness-aijient-team/templates`, since는 `2026-09-05`(릴리스 번호 금지).
- 승격 표기: 항목 **마지막 줄** 끝에 ` (→ rules/<slug>.md, YYYY-MM-DD)`.
- slug 규칙 `^[\w.-]+$`(task 이름과 동일). `--paths`는 쉼표 구분·trim·빈 조각 제거.
- exit: 활성 task 없음 1, 그 외 거부 2, 목록·no-data·성공 0. `--json`은 `buildEnvelope({ command: 'rules', extra: { action: 'promote', … } })`.
- doctor 경고는 warning(fail 카운트·exit 영향 없음), plugin-dev 게이트 없음.
- `--json`·`--target`은 GLOBAL 플래그(cli-args)라 명령 행 `flags`에 적지 않는다. `name`·`paths`는 `VALUE_FLAGS`에 추가.
- 신규 파일은 `git add` 후 `npm run docs:generate`(overview 인벤토리는 `git ls-files` 기준).
- post-commit 훅이 커밋마다 `docs/hslee/hslee-handoff.md`·`docs/hslee/retro-rules-promotion/retro-rules-promotion-handoff.md`를 더럽힌다 → 코드 커밋 직후 `git checkout -- <두 파일>`, task 문서 커밋에는 포함.
- `templates/CLAUDE.md.hbs` `workflow` 구획을 고치면 저장소 `CLAUDE.md` 같은 구획도 **바이트 동일**하게 고친다(`tests/agent-files.test.mjs`가 대조).

## 파일 구조

| 파일 | 책임 |
|---|---|
| `src/commands/rules.mjs` (신규) | 상수 · `ruleMarker` · `parseRuleMarker` · `parseLearnings` · `renderRule` · `annotatePromoted` · `parsePathsFlag` · `checkRuleProvenance` · `runRulesPromote` · `runRules` |
| `tests/rules.test.mjs` (신규) | 파서·렌더 왕복 · 러너 전 분기 · provenance 검사 · 템플릿↔검사 계약 · doctor 배선 |
| `src/harness.mjs` | `collectRuleFiles`에 `export` 추가(한 단어) |
| `src/cli-args.mjs` | `VALUE_FLAGS`에 `name`·`paths`, `COMMANDS`에 `rules` 행 |
| `bin/harness-team.mjs` | import · `taskCmds`·`taskArgs`에 `rules` · `case 'rules'` |
| `tests/cli-args.test.mjs` | `rules promote` 파싱·dangling `--name` 거부 |
| `src/commands/doctor.mjs` | import + `rule provenance` warning 한 항목 |
| `templates/.claude/rules/{navigation,state-management,styling,testing}.md` | frontmatter 뒤 마커 한 줄 |
| `commands/harness-promote.md` · `skills/harness-promote/SKILL.md` · `skills/harness-promote/agents/openai.yaml` · `.claude-plugin/plugin.json` · `README.md` · `CHANGELOG.md` · `templates/CLAUDE.md.hbs` · `CLAUDE.md` · `docs/harness-overview.html`(생성) | 이름을 부르는 표면(manifest-sync·agent-files·overview 테스트가 고정) |

---

## 단계

- [x] Task 0: task 생성 · 브레인스토밍(`rules promote` 하위명령 · HTML 주석 마커 · doctor 경고+템플릿 스탬프 · 다이어그램 아니오) · spec Ambiguity 게이트 · 설계 승인

### Task 1: 순수 함수 — 파서·렌더·표기

**Files:** Create `src/commands/rules.mjs`, Create `tests/rules.test.mjs`

**Interfaces (Produces):**
- `RULE_MARKER_RE`, `RULE_NAME_RE = /^[\w.-]+$/`, `PROMOTED_SUFFIX_RE`, `TEMPLATE_RULE_ORIGIN = 'harness-aijient-team/templates'`
- `ruleMarker({ origin, since }): string`
- `parseRuleMarker(content: string|null): { origin, since } | null`
- `parseLearnings(artifact: string): Array<{ index, date: string|null, start, end, text, promoted: { rule, at } | null }>` — `start`/`end`는 0-based 줄 번호
- `renderRule({ slug, text, origin, since, paths = [] }): string`
- `annotatePromoted(artifact, index, slug, date): string` — 범위 밖 index는 `RangeError`
- `parsePathsFlag(value): string[]`

- [x] **Step 1.1: RED — 테스트 작성** `tests/rules.test.mjs`

```js
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { mkdtemp, mkdir, writeFile, readFile, readdir, rm } from 'node:fs/promises';
import { join, resolve, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { tmpdir } from 'node:os';
import {
  parseLearnings, parseRuleMarker, ruleMarker, renderRule, annotatePromoted, parsePathsFlag,
} from '../src/commands/rules.mjs';
import { splitRulePaths } from '../src/harness.mjs';

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
```

- [x] **Step 1.2: RED 확인** — `node --test tests/rules.test.mjs` → `ERR_MODULE_NOT_FOUND`(rules.mjs 없음)로 실패.

- [x] **Step 1.3: GREEN — `src/commands/rules.mjs` 순수 부분 작성**

```js
import { join } from 'node:path';
import { exists, readTextSafe, writeText } from '../fsx.mjs';
import { buildEnvelope, emitObservation } from '../observation.mjs';
import { collectRuleFiles, mirrorCursorRules } from '../harness.mjs';
import { readActive } from './task.mjs';

// ── 순수 부분 ──────────────────────────────────────────────────────────────

// 규칙 파일의 유래 마커. `harness:review`와 같은 key=value 속성 문법이고 `harness:mirror`처럼 HTML 주석이다 —
// Cursor는 렌더하지 않고, Claude Code는 block-level 주석을 컨텍스트 주입 전에 벗긴다(공식 memory 문서).
// frontmatter 키로 두지 않는 이유: rules frontmatter의 공인 키는 `paths`뿐이라 임의 키 처리가 미명시다.
export const RULE_MARKER_RE = /<!--\s*harness:rule\s+([^>]*?)\s*-->/;
// task 이름과 같은 규칙 — `/`·`..`가 못 들어오므로 `.claude/rules` 밖으로 나갈 수 없다.
export const RULE_NAME_RE = /^[\w.-]+$/;
export const TEMPLATE_RULE_ORIGIN = 'harness-aijient-team/templates';
// artifact 항목 마지막 줄 끝의 승격 표기 — 목록 표시와 재승격 거부의 유일한 근거.
export const PROMOTED_SUFFIX_RE = /\s*\(→ rules\/([\w.-]+)\.md, (\d{4}-\d{2}-\d{2})\)\s*$/;

const LEARNINGS_HEADING_RE = /^## Learnings(?:\s*\((\d{4}-\d{2}-\d{2})\))?\s*$/;
// `#`·`##`만 절을 끝낸다 — Learnings 안의 `###` 소제목은 절의 일부다.
const SECTION_END_RE = /^#{1,2}\s/;
const BULLET_RE = /^- (.*)$/;
const CONTINUATION_RE = /^\s+(\S.*)$/;
const DATE_RE = /^\d{4}-\d{2}-\d{2}$/;

export function ruleMarker({ origin, since }) {
  return `<!-- harness:rule origin=${origin} since=${since} -->`;
}

export function parseRuleMarker(content) {
  const match = RULE_MARKER_RE.exec(content ?? '');
  if (!match) return null;
  const attrs = {};
  for (const kv of match[1].matchAll(/([a-z][a-z0-9-]*)=("[^"]*"|\S+)/gi)) {
    attrs[kv[1].toLowerCase()] = kv[2].replace(/^"|"$/g, '');
  }
  if (!attrs.origin || !DATE_RE.test(attrs.since ?? '')) return null;
  return { origin: attrs.origin, since: attrs.since };
}

export function parseLearnings(artifact) {
  const lines = artifact.split(/\r?\n/);
  const entries = [];
  let inLearnings = false;
  let date = null;
  let current = null;
  const flush = () => {
    if (!current) return;
    const raw = current.parts.join(' ').trim();
    const promotedMatch = PROMOTED_SUFFIX_RE.exec(raw);
    const text = promotedMatch ? raw.slice(0, promotedMatch.index).trim() : raw;
    // retro가 인수 없이 만든 빈 불릿은 승격할 본문이 없다 — 세지 않는다.
    if (text) {
      entries.push({
        date: current.date, start: current.start, end: current.end, text,
        promoted: promotedMatch ? { rule: promotedMatch[1], at: promotedMatch[2] } : null,
      });
    }
    current = null;
  };
  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    const heading = LEARNINGS_HEADING_RE.exec(line);
    if (heading) { flush(); inLearnings = true; date = heading[1] ?? null; continue; }
    if (SECTION_END_RE.test(line)) { flush(); inLearnings = false; continue; }
    if (!inLearnings) continue;
    const bullet = BULLET_RE.exec(line);
    if (bullet) { flush(); current = { date, start: i, end: i, parts: [bullet[1]] }; continue; }
    const continuation = current ? CONTINUATION_RE.exec(line) : null;
    if (continuation) { current.end = i; current.parts.push(continuation[1]); continue; }
    flush();
  }
  flush();
  return entries.map((entry, idx) => ({ index: idx + 1, ...entry }));
}

export function renderRule({ slug, text, origin, since, paths = [] }) {
  const frontmatter = paths.length
    ? `---\npaths:\n${paths.map(p => `  - "${p.replace(/"/g, '\\"')}"`).join('\n')}\n---\n`
    : '';
  return `${frontmatter}${ruleMarker({ origin, since })}\n# ${slug}\n\n- ${text}\n`;
}

// 표기는 항목의 *마지막* 줄에 붙는다 — 이어지는 줄이 있는 항목의 첫 줄에 붙이면 합친 본문 한가운데에 들어가
// PROMOTED_SUFFIX_RE(`$` 앵커)가 못 본다. 줄 단위로 다시 합치므로 CRLF 파일은 LF로 정규화된다.
export function annotatePromoted(artifact, index, slug, date) {
  const entry = parseLearnings(artifact).find(e => e.index === index);
  if (!entry) throw new RangeError(`no Learnings entry at index ${index}`);
  const lines = artifact.split(/\r?\n/);
  lines[entry.end] = `${lines[entry.end].replace(/\s+$/, '')} (→ rules/${slug}.md, ${date})`;
  return lines.join('\n');
}

export function parsePathsFlag(value) {
  if (typeof value !== 'string') return [];
  return value.split(',').map(p => p.trim()).filter(Boolean);
}
```

(이 단계에서는 import만 있는 `exists`·`writeText`·`buildEnvelope`·`emitObservation`·`collectRuleFiles`·`mirrorCursorRules`·`readActive`가 미사용이다 — Task 2·4에서 쓴다. `collectRuleFiles`는 아직 export되지 않아 **import 시점에 SyntaxError**가 난다 → Step 1.3에서 `src/harness.mjs:387` `async function collectRuleFiles`를 `export async function collectRuleFiles`로 바꾼다.)

- [x] **Step 1.4: GREEN 확인** — `node --test tests/rules.test.mjs` → 8 pass. `node --test tests/cursor-rules-mirror.test.mjs` 여전히 pass(export 추가는 동작 불변).
- [x] **Step 1.5: 커밋** — `git add src/commands/rules.mjs src/harness.mjs tests/rules.test.mjs && git commit -m "feat(rules): Learnings 파서·유래 마커·규칙 렌더·승격 표기 순수 함수 (+collectRuleFiles export)"` → 훅이 더럽힌 handoff 2파일 `git checkout --`.

### Task 2: 러너 `runRulesPromote` / `runRules`

**Files:** Modify `src/commands/rules.mjs`, Modify `tests/rules.test.mjs`

**Interfaces:**
- Consumes: Task 1 전부, `readActive(targetDir)`, `mirrorCursorRules(ctx)` → `[{ path, action: 'mirror'|'prune' }]`, `buildEnvelope`/`emitObservation`
- Produces: `runRules(ctx)` — `ctx = { targetDir, flags, taskArgs }`, `taskArgs[0]` 이 `'promote'`, `taskArgs[1]` 이 선택 번호. 반환 `{ status: 'listed'|'no-data', entries } | { status: 'success', rule, index, origin, since, paths, mirrored } | { status: 'error', code } | { status: 'invalid-action' }`

- [x] **Step 2.1: RED — 테스트 추가** (`tests/rules.test.mjs` 하단)

```js
import { runRules } from '../src/commands/rules.mjs';   // 파일 상단 import 목록에 합친다
import { exists } from '../src/fsx.mjs';
import { OBSERVATION_SCHEMA } from '../src/observation.mjs';

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

    assert.match(logs[0], /^✓ rules promote: \.claude\/rules\/second-rule\.md \(origin=tester\/demo since=\d{4}-\d{2}-\d{2}, paths=src\/\*\*\/\*\.ts,tests\/\*\*\)$/);
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

test('runRules promote: 활성 task 없음 → no-active-task, exit 1, cause/retry/stop 계약 (--json 도)', async () => {
  const dir = await makeProject({ active: false });
  try {
    const text = await run(dir, ['promote']);
    assert.equal(text.exitCode, 1);
    assert.equal(text.result.code, 'no-active-task');
    assert.deepEqual(text.logs.map(l => l.split(':')[0]), ['✗ rules promote', 'cause', 'retry', 'stop']);
    const json = await run(dir, ['promote'], { json: true });
    const env = JSON.parse(json.logs[0]);
    assert.equal(env.status, 'error');
    assert.ok(env.error.root_cause && env.error.safe_retry && env.error.stop_condition);
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
```

- [x] **Step 2.2: RED 확인** — `node --test tests/rules.test.mjs` → 신규 12건이 `runRules is not a function`류로 실패, 기존 8건 pass.

- [x] **Step 2.3: GREEN — 러너 구현** (`src/commands/rules.mjs` 하단에 추가)

```js
// ── I/O 부분 ───────────────────────────────────────────────────────────────

function today() {
  return new Date().toISOString().slice(0, 10);
}

const USAGE = 'harness-team rules promote [<n>] [--name <slug>] [--paths <a,b>]';

// retro·task와 같은 cause/retry/stop 계약. exitCode 기본 2(인수·상태 거부), 활성 task 없음만 1(retro와 동일).
function fail(ctx, { code, cause, retry, stop, exitCode = 2 }) {
  process.exitCode = exitCode;
  if (ctx.flags?.json) {
    emitObservation(buildEnvelope({
      command: 'rules',
      status: 'error',
      summary: `rules promote 실패: ${code}`,
      error: { root_cause: cause, safe_retry: retry, stop_condition: stop },
      extra: { action: 'promote', code },
    }));
  } else {
    console.log(`✗ rules promote: ${code}`);
    console.log(`cause: ${cause}`);
    console.log(`retry: ${retry}`);
    console.log(`stop: ${stop}`);
  }
  return { status: 'error', code };
}

function listLearnings(ctx, { entries, relArtifact }) {
  const status = entries.length ? 'listed' : 'no-data';
  const summary = entries.length
    ? `${relArtifact} — Learnings ${entries.length}개`
    : `${relArtifact} — Learnings 항목 없음`;
  const nextActions = entries.length
    ? [`승격할 항목을 골라 \`${USAGE}\` 실행 — 선택은 사용자 승인`]
    : ['`harness-team retro "<학습>"` 으로 Learnings를 먼저 기록'];
  if (ctx.flags?.json) {
    emitObservation(buildEnvelope({
      command: 'rules', status, summary, nextActions, artifacts: [relArtifact],
      extra: { action: 'promote', learnings: entries.map(({ index, date, text, promoted }) => ({ index, date, text, promoted })) },
    }));
  } else {
    console.log(`${entries.length ? '✓' : '-'} rules promote: ${summary}`);
    for (const e of entries) {
      const flag = e.promoted ? `  [promoted → rules/${e.promoted.rule}.md, ${e.promoted.at}]` : '';
      console.log(`  ${e.index}. [${e.date ?? '날짜 없음'}] ${e.text}${flag}`);
    }
    console.log(`next: ${nextActions[0]}`);
  }
  return { status, entries };
}

export async function runRulesPromote(ctx) {
  const active = await readActive(ctx.targetDir);
  if (!active || !active.task) {
    return fail(ctx, {
      code: 'no-active-task', exitCode: 1,
      cause: '.harness/active.json 에 활성 task가 없어 승격 원천 artifact.md를 찾을 수 없음',
      retry: '`harness-team task <name>` 로 task를 활성화한 뒤 다시 실행',
      stop: 'task가 하나도 없으면 먼저 task를 생성하라',
    });
  }
  const { user, task } = active;
  const relArtifact = `docs/${user}/${task}/${task}-artifact.md`;
  const artifactPath = join(ctx.targetDir, relArtifact);
  const artifact = await readTextSafe(artifactPath);
  if (artifact === null) {
    return fail(ctx, {
      code: 'no-artifact',
      cause: `${relArtifact} 이(가) 없음`,
      retry: '`harness-team retro "<학습>"` 으로 Learnings를 먼저 기록한 뒤 다시 실행',
      stop: 'artifact.md가 없으면 승격할 항목이 없다',
    });
  }
  const entries = parseLearnings(artifact);
  const selector = (ctx.taskArgs || [])[1];
  if (selector === undefined) return listLearnings(ctx, { entries, relArtifact });

  if (!/^\d+$/.test(selector) || Number(selector) < 1 || Number(selector) > entries.length) {
    return fail(ctx, {
      code: 'invalid-index',
      cause: `"${selector}" 은(는) 1..${entries.length} 범위의 정수가 아님`,
      retry: '`harness-team rules promote` 로 번호 목록을 확인한 뒤 다시 실행',
      stop: '항목이 0개면 승격할 것이 없다',
    });
  }
  const entry = entries[Number(selector) - 1];
  if (entry.promoted) {
    return fail(ctx, {
      code: 'already-promoted',
      cause: `#${entry.index} 은(는) 이미 rules/${entry.promoted.rule}.md 로 승격됨 (${entry.promoted.at})`,
      retry: '다른 항목 번호를 고르거나, 되돌리려면 규칙 파일 삭제 + artifact 표기 제거를 수동으로',
      stop: '같은 항목을 두 번 승격하지 않는다',
    });
  }
  const name = ctx.flags?.name;
  if (typeof name !== 'string' || !RULE_NAME_RE.test(name)) {
    return fail(ctx, {
      code: 'invalid-name',
      cause: `--name 이 없거나 이름 규칙(^[\\w.-]+$)을 만족하지 않음: ${JSON.stringify(name ?? null)}`,
      retry: '`--name <slug>` 를 영문·숫자·`_`·`.`·`-` 만으로 지정',
      stop: '경로 구분자가 들어간 이름으로는 만들지 않는다',
    });
  }
  const relRule = `.claude/rules/${name}.md`;
  const rulePath = join(ctx.targetDir, relRule);
  if (await exists(rulePath)) {
    return fail(ctx, {
      code: 'rule-exists',
      cause: `${relRule} 이(가) 이미 있음 — 덮어쓰지 않는다`,
      retry: '다른 `--name` 을 쓰거나 기존 규칙을 직접 편집',
      stop: '기존 규칙 파일은 보존한다',
    });
  }

  const paths = parsePathsFlag(ctx.flags?.paths);
  const since = today();
  const origin = `${user}/${task}`;
  // 검증은 위에서 끝났다. 쓰기 순서: 규칙 → artifact 표기 → 미러. 표기가 먼저면 규칙 쓰기 실패 시 유령 표기가 남는다.
  await writeText(rulePath, renderRule({ slug: name, text: entry.text, origin, since, paths }));
  await writeText(artifactPath, annotatePromoted(artifact, entry.index, name, since));
  const mirrored = (await mirrorCursorRules(ctx)).filter(r => r.action === 'mirror').length;

  const summary = `${relRule} 승격 (origin=${origin} since=${since}${paths.length ? `, paths=${paths.join(',')}` : ''})`;
  const nextActions = ['규칙 본문을 다듬고 커밋하라', '되돌리려면 규칙 파일 삭제 + artifact 표기 제거 + `harness-team sync`'];
  if (ctx.flags?.json) {
    emitObservation(buildEnvelope({
      command: 'rules', status: 'success', summary, nextActions, artifacts: [relRule, relArtifact],
      extra: { action: 'promote', index: entry.index, rule: relRule, origin, since, paths, mirrored },
    }));
  } else {
    console.log(`✓ rules promote: ${summary}`);
    console.log(`✓ artifact: ${relArtifact} #${entry.index} 에 승격 표기`);
    console.log(`✓ cursor mirror: ${mirrored} rule(s)`);
    console.log(`next: ${nextActions[0]}`);
  }
  return { status: 'success', rule: relRule, index: entry.index, origin, since, paths, mirrored };
}

export async function runRules(ctx) {
  if ((ctx.taskArgs || [])[0] === 'promote') return runRulesPromote(ctx);
  process.exitCode = 2;
  console.log('rules: invalid-action');
  console.log(`usage: ${USAGE}`);
  return { status: 'invalid-action' };
}
```

- [x] **Step 2.4: GREEN 확인** — `node --test tests/rules.test.mjs` → 20 pass.
- [x] **Step 2.5: 커밋** — `git add src/commands/rules.mjs tests/rules.test.mjs && git commit -m "feat(rules): rules promote 러너 — 목록·승격(규칙+표기+cursor 미러)·거부 6종(cause/retry/stop)"` → handoff 2파일 `git checkout --`.

### Task 3: CLI 배선 (cli-args · bin 라우터)

**Files:** Modify `src/cli-args.mjs:18,66`, Modify `bin/harness-team.mjs:21,51,57,79`, Modify `tests/cli-args.test.mjs`

- [x] **Step 3.1: RED — cli-args 테스트 추가** (`tests/cli-args.test.mjs` 하단)

```js
test('cli-args: rules promote 는 번호 positional 과 --name/--paths 값 플래그를 받고, dangling --name 은 오류', () => {
  const inv = resolveInvocation(['rules', 'promote', '2', '--name', 'api-errors', '--paths', 'src/**/*.ts,lib/**']);
  assert.equal(inv.kind, 'run');
  assert.deepEqual(inv.positional, ['promote', '2']);
  assert.equal(inv.flags.name, 'api-errors');
  assert.equal(inv.flags.paths, 'src/**/*.ts,lib/**');
  assert.equal(resolveInvocation(['rules', 'promote']).kind, 'run');
  assert.equal(resolveInvocation(['rules', 'promote', '1', '--name']).kind, 'error');
  assert.equal(resolveInvocation(['rules', 'promote', '--days', '3']).kind, 'error', 'rules 는 --days 를 받지 않는다');
});
```

- [x] **Step 3.2: RED 확인** — `node --test tests/cli-args.test.mjs` → `rules` unknown command로 실패.

- [x] **Step 3.3: GREEN — 배선**

`src/cli-args.mjs`:
```js
export const VALUE_FLAGS = new Set(['stack', 'member', 'target', 'backup-dir', 'backup-parent', 'days', 'name', 'paths']);
```
`COMMANDS`의 `retro` 행 다음에:
```js
  { name: 'rules', args: 'promote [<n>] [--name <slug>] [--paths <a,b>]',
    summary: "Promote a Learnings entry from the active task's artifact.md into .claude/rules/<slug>.md (lists entries when <n> is omitted)",
    flags: ['name', 'paths'] },
```
`bin/harness-team.mjs`:
```js
import { runRules } from '../src/commands/rules.mjs';
// …
  const taskCmds = new Set(['task', 'list', 'summary', 'done', 'handoff', 'retro', 'release', 'context', 'boundary', 'session-context', 'observe', 'rules']);
// …
    taskArgs: (cmd === 'task' || cmd === 'retro' || cmd === 'release' || cmd === 'context' || cmd === 'boundary' || cmd === 'rules') ? positional : [],
// … switch 에 `case 'retro'` 다음:
    case 'rules': return runRules(ctx);
```

- [x] **Step 3.4: GREEN 확인** — `node --test tests/cli-args.test.mjs tests/rules.test.mjs` pass. 수동: `node bin/harness-team.mjs help rules`(usage에 `--name --paths --json --target` 노출), `node bin/harness-team.mjs rules promote`(이 저장소 → 활성 task artifact에 Learnings 없음 → `- rules promote: … Learnings 항목 없음`, exit 0), `node bin/harness-team.mjs rules nope; echo $?` → 2.
- [x] **Step 3.5: 커밋** — `git add src/cli-args.mjs bin/harness-team.mjs tests/cli-args.test.mjs && git commit -m "feat(cli): harness-team rules promote — COMMANDS 행·name/paths 값 플래그·라우터 배선"` → handoff 2파일 `git checkout --`.

### Task 4: 템플릿 스탬프 + `checkRuleProvenance` + doctor 배선

**Files:** Modify `templates/.claude/rules/{navigation,state-management,styling,testing}.md`, Modify `src/commands/rules.mjs`, Modify `src/commands/doctor.mjs:9,~627`, Modify `tests/rules.test.mjs`

**Interfaces (Produces):** `checkRuleProvenance(targetDir): Promise<string|null>`

- [x] **Step 4.1: RED — 테스트 추가** (`tests/rules.test.mjs` 하단; import 목록에 `checkRuleProvenance, TEMPLATE_RULE_ORIGIN` 와 `runDoctor` 추가)

```js
import { checkRuleProvenance, TEMPLATE_RULE_ORIGIN } from '../src/commands/rules.mjs';
import { runDoctor } from '../src/commands/doctor.mjs';

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
```

- [x] **Step 4.2: RED 확인** — `node --test tests/rules.test.mjs` → 템플릿 계약 1건(마커 없음), provenance 3건(`checkRuleProvenance is not a function`), doctor 1건(check 없음) 실패.

- [x] **Step 4.3: GREEN — 템플릿 스탬프**

```bash
for f in templates/.claude/rules/*.md; do
  awk 'BEGIN{c=0} {print} /^---$/{c++; if (c==2) print "<!-- harness:rule origin=harness-aijient-team/templates since=2026-09-05 -->"}' "$f" > "$f.tmp" && mv "$f.tmp" "$f"
done
git diff --stat templates/.claude/rules   # 4 files, +1 each
```

- [x] **Step 4.4: GREEN — `checkRuleProvenance`** (`src/commands/rules.mjs`, `today()` 위에 추가)

```js
// doctor용. 마커가 없거나 origin·since 중 하나라도 빠진 규칙을 나열한다. `.claude/rules`가 없으면 검사할 것이 없다(null).
// 읽기 실패도 경고로 돌려준다 — warn 수준 검사가 doctor를 crash 시키면 envelope 자체가 안 나온다.
export async function checkRuleProvenance(targetDir) {
  const dir = join(targetDir, '.claude/rules');
  if (!(await exists(dir))) return null;
  let files;
  try {
    files = await collectRuleFiles(dir);
  } catch (error) {
    return `.claude/rules 읽기 실패(${error?.code ?? error?.message}) — 디렉터리 상태를 확인하라`;
  }
  const missing = [];
  for (const rel of files) {
    if (!parseRuleMarker(await readTextSafe(join(dir, rel)))) missing.push(rel);
  }
  if (!missing.length) return null;
  missing.sort();
  const stamp = ruleMarker({ origin: '<user>/<task>', since: '<YYYY-MM-DD>' });
  return `.claude/rules에 유래 없는 규칙 ${missing.length}개: ${missing.join(', ')} — 각 파일 본문 첫 줄(frontmatter 뒤)에 \`${stamp}\`를 추가하거나 \`harness-team rules promote\`로 승격한 규칙만 두라`;
}
```

- [x] **Step 4.5: GREEN — doctor 배선** (`src/commands/doctor.mjs`)

import 블록에:
```js
import { checkRuleProvenance } from './rules.mjs';
```
`eagerTierWarning` 처리 다음에:
```js
  // Not gated on pluginDev: a rule without provenance is drift wherever it lives —
  // and this repo ships no .claude/rules of its own, so the source tree stays silent.
  const provenanceWarning = await checkRuleProvenance(ctx.targetDir);
  if (provenanceWarning) add('rule provenance', 'warning', provenanceWarning, `\n⚠️ ${provenanceWarning}`);
```

- [x] **Step 4.6: GREEN 확인** — `node --test tests/rules.test.mjs tests/doctor.test.mjs tests/cursor-rules-mirror.test.mjs tests/stack-conditional-rules.test.mjs tests/observation-commands.test.mjs` pass. 수동: `node bin/harness-team.mjs doctor`(이 저장소 — `rule provenance` 항목 없음: `.claude/rules` 부재).
- [x] **Step 4.7: 커밋** — `git add templates/.claude/rules src/commands/rules.mjs src/commands/doctor.mjs tests/rules.test.mjs && git commit -m "feat(doctor): rule provenance 경고 + 규칙 템플릿 4종에 harness:rule 유래 마커"` → handoff 2파일 `git checkout --`.

### Task 5: 이름을 부르는 표면 (manifest-sync · agent-files · overview 가 고정)

**Files:** Create `commands/harness-promote.md`, Create `skills/harness-promote/SKILL.md`, Create `skills/harness-promote/agents/openai.yaml`, Modify `.claude-plugin/plugin.json:12`, Modify `README.md:352-355`, Modify `CHANGELOG.md:19`, Modify `templates/CLAUDE.md.hbs:29-35`, Modify `CLAUDE.md:29-35`, Regenerate `docs/harness-overview.html`

- [x] **Step 5.1: RED 확인** — `commands/harness-promote.md`만 먼저 만들고 `node --test tests/manifest-sync.test.mjs` → Codex 동등 스킬 없음·plugin.json 미등록으로 2건 실패. (템플릿 §3을 먼저 고치고 `node --test tests/agent-files.test.mjs` → 저장소 `CLAUDE.md` 드리프트 1건 실패도 관찰한다.)

- [x] **Step 5.2: 파일 작성**

`commands/harness-promote.md`:
````markdown
---
description: 활성 task artifact의 Learnings 항목을 사용자 승인 후 .claude/rules/<slug>.md로 승격 — 유래 마커 부착·cursor 미러 재생성
phase: Workflow
argument-hint: '[<n> --name <slug> [--paths <a,b>]]'
---

이 명령은 활성 task `artifact.md`의 `## Learnings` 항목 하나를 `.claude/rules/<slug>.md`로 **기계적으로 복사**한다.
어떤 항목을 올릴지는 **사용자가 고른다** — 이 래퍼는 후보를 보여 주고 승인을 받아 CLI를 호출할 뿐, 스스로 승격 대상을
판단하지 않는다(자동 수정 루프 금지, `AGENTS.md` D6). 승격 로직은 CLI(`harness-team rules promote`)가 소유한다.

승격된 규칙 본문 첫 줄에는 유래 마커 `<!-- harness:rule origin=<user>/<task> since=<YYYY-MM-DD> -->`가 붙고,
artifact의 원 항목 끝에는 `(→ rules/<slug>.md, <날짜>)`가 남아 재승격을 막는다. artifact 항목은 지우지 않는다.

## 실행 절차

1. **후보 나열** — `$ARGUMENTS`에 이미 `<n> --name <slug>`가 있으면 3단계로 간다.
   ```bash
   node "${CLAUDE_PLUGIN_ROOT}/bin/harness-team.mjs" rules promote
   ```
   - 다른 래퍼와 같이 플러그인의 CLI를 직접 호출한다 — PATH의 전역 `harness-team`은 없거나 다른 버전일 수 있다.
   - `- rules promote: … Learnings 항목 없음`이면 `/harness-retro`로 먼저 기록하라고 안내하고 끝낸다.
   - `✗ rules promote: no-active-task`면 `harness-team task <name>`로 활성화하도록 안내한다.

2. **사용자 확인** — `AskUserQuestion` 한 번으로 (a) 항목 번호 (b) slug(`^[\w.-]+$`, 파일명이 된다) (c) `paths` glob(비우면 항상 로드되어
   eager 계층에 상시 실린다는 점을 알린다)를 확인한다. 질문 설명에 **선택 기준**을 붙인다 — 같은 교정이 3회 이상 반복됐는가 ·
   주관 없이 검사할 수 있는가 · 어기면 재작업이나 위험이 따르는가 · 고치는 법을 한 줄로 설명할 수 있는가. 하나도 해당하지 않으면
   승격하지 않고 artifact에 남겨 둔다. `[promoted → …]` 표시가 있는 항목은 후보에서 뺀다.

3. **실행**
   ```bash
   node "${CLAUDE_PLUGIN_ROOT}/bin/harness-team.mjs" rules promote <n> --name <slug> --paths "<a,b>"
   ```
   - 성공 시 `✓ rules promote:` · `✓ artifact:` · `✓ cursor mirror:` 세 줄이 나온다.
   - `✗ rules promote: <code>`는 그대로 전달한다. `already-promoted`·`rule-exists`·`invalid-name`은 2단계로 돌아가 다른 항목·이름을 묻는다.

4. **결과 표시** — 생성된 `.claude/rules/<slug>.md` 전문과 `git diff --stat`를 보여 준다. 커밋은 사용자 지시 후.

## 예시

```bash
/harness-promote                                   # 후보 나열 → 확인 → 승격
harness-team rules promote                         # 번호 목록만 (read-only)
harness-team rules promote 2 --name api-errors --paths "src/api/**/*.ts"
harness-team rules promote 2 --name api-errors --json
```
````

`skills/harness-promote/SKILL.md`:
```markdown
---
name: harness-promote
description: Codex wrapper for promoting a task artifact Learnings entry into .claude/rules with a provenance marker. Use when the user asks for /harness-promote, harness promote, rules promote, or to turn a repeated learning into a project rule.
---

# Harness Promote

Use this skill as the Codex equivalent of Claude Code `/harness-promote`.

## Source of Truth

- Read `../../commands/harness-promote.md` before acting.
- Prefer the shared CLI instead of reimplementing behavior:
  - In this plugin source repo, run: `node bin/harness-team.mjs rules promote ...`
  - In a consumer project with `harness-team` on PATH, run: `harness-team rules promote ...`
- The user picks the entry, slug, and paths. Never choose a learning to promote on your own: list candidates first, then ask.
- The CLI refuses to overwrite an existing rule or re-promote an annotated entry. Relay the `✗ rules promote: <code>` lines verbatim.
- Translate Claude-only references for Codex:
  - `${CLAUDE_PLUGIN_ROOT}` means this installed plugin root or this repository root.
  - `AskUserQuestion` means a plain question to the user in chat.
- Do not create commits unless the user explicitly asks.
```

`skills/harness-promote/agents/openai.yaml`:
```yaml
interface:
  display_name: "Harness Promote"
  short_description: "Promote a task learning into .claude/rules with provenance."
  default_prompt: "Use $harness-promote to list Learnings candidates and promote the one the user picks into .claude/rules."
```

`.claude-plugin/plugin.json` — `"./commands/harness-observe.md",` 다음 줄에 `"./commands/harness-promote.md",`.

`README.md` — `### \`/harness-task\` — task 관리` 절 다음(`### /harness-ship` 앞)에:
````markdown
### `/harness-promote` — Learnings → `.claude/rules` 승격

활성 task `artifact.md`의 `## Learnings` 항목 하나를 골라 `.claude/rules/<slug>.md`로 **기계적으로 복사**하고 cursor 미러를
재생성합니다. 규칙 본문 첫 줄에 유래 마커 `<!-- harness:rule origin=<user>/<task> since=<YYYY-MM-DD> -->`가 붙고, artifact의
원 항목 끝에는 `(→ rules/<slug>.md, <날짜>)`가 남아 재승격을 막습니다. 어떤 항목을 올릴지는 사용자가 고릅니다 — 같은 교정이
3회 이상 반복되고, 주관 없이 검사할 수 있으며, 어기면 재작업이 따르는 학습이 후보입니다. LLM이 스스로 승격하는 경로는 없습니다.

```bash
/harness-promote                                     # 후보 나열 → 항목·slug·paths 확인 → 승격
harness-team rules promote                           # Learnings 항목 번호 목록 (read-only)
harness-team rules promote 2 --name api-errors --paths "src/api/**/*.ts"
```

`harness-team doctor`는 마커 없는 규칙을 `rule provenance` 경고로 나열합니다. 템플릿 4종(navigation·state-management·styling·testing)에는
`origin=harness-aijient-team/templates` 마커가 들어 있으며, 그 이전에 설치된 사본에는 같은 형식의 마커 한 줄을 본문 첫 줄에 직접 추가하면 됩니다.

````

`CHANGELOG.md` — `## [Unreleased]` 아래:
```markdown
### Added
- **`harness-team rules promote` / `/harness-promote` — retro → rules 승격 경로** — `harness-team retro`는 활성 task `artifact.md`의
  `## Learnings`에 append만 했고 학습을 `.claude/rules`로 올리는 코드 경로가 없었습니다(외부 6층 플레이북 비교 분석의 권고 ②).
  새 하위명령이 Learnings 항목을 번호 목록으로 보여 주고(`rules promote`, read-only), 사용자가 고른 항목을
  `rules promote <n> --name <slug> [--paths a,b]`로 `.claude/rules/<slug>.md`에 복사한 뒤 cursor 미러를 재생성합니다. 규칙 본문 첫 줄에
  유래 마커 `<!-- harness:rule origin=<user>/<task> since=<YYYY-MM-DD> -->`가 붙고, artifact 원 항목 끝에는 `(→ rules/<slug>.md, <날짜>)`가
  남아 재승격을 거부합니다. 승격 대상 판단은 사용자 승인이며 LLM 자동 승격은 없습니다. 기존 규칙 파일은 덮어쓰지 않고 artifact 항목은 지우지 않습니다.
  `--json`은 `harness/observation/v1` envelope입니다.
- **doctor `rule provenance` 경고** — `.claude/rules/**/*.md` 중 유래 마커가 없는 파일을 나열합니다(warning, exit code 영향 없음).

### Changed
- **규칙 템플릿 4종에 유래 마커** — `templates/.claude/rules/{navigation,state-management,styling,testing}.md` 본문 첫 줄(frontmatter 뒤)에
  `<!-- harness:rule origin=harness-aijient-team/templates since=2026-09-05 -->`가 들어갑니다. 이전에 설치된 사본은 doctor가 경고하며, 같은 줄을 직접 추가하면 됩니다.
- **CLAUDE.md 템플릿 자기개선 루프 절** — 반복되는 학습을 `/harness-promote`로 승격하라는 한 줄을 추가했습니다(`init` 재실행으로 `workflow` 관리 구획에 전파).
```

`templates/CLAUDE.md.hbs` **와** 저장소 `CLAUDE.md`(둘 다 동일하게) — `### 3. 자기개선 루프`의 마지막 불릿(“학습의 저장 경계 …”) 다음에:
```markdown
- 같은 학습·교정이 반복되면(3회 이상, 주관 없이 검사 가능) `/harness-promote`로 `.claude/rules/<slug>.md`에 승격한다 —
  승격 대상은 사용자가 고르고, CLI가 유래 마커를 붙여 복사하며 cursor 미러를 갱신한다.
```

- [x] **Step 5.3: GREEN 확인** — `git add commands/harness-promote.md skills/harness-promote .claude-plugin/plugin.json README.md CHANGELOG.md templates/CLAUDE.md.hbs CLAUDE.md && npm run docs:generate && node --test tests/manifest-sync.test.mjs tests/agent-files.test.mjs tests/harness-overview-generation.test.mjs tests/documentation-inventory-pointers.test.mjs` pass → `npm test` 전체 pass, `npm run docs:check` 최신.
- [x] **Step 5.4: 커밋** — `git add -A commands skills .claude-plugin README.md CHANGELOG.md templates/CLAUDE.md.hbs CLAUDE.md docs/harness-overview.html && git commit -m "docs(promote): /harness-promote 명령·Codex 스킬·plugin.json·README·CHANGELOG·CLAUDE.md §3 + overview 재생성"` → handoff 2파일 `git checkout --`.

### Task 6: 검증 · 리뷰 · ship

- [x] **Step 6.1: 실제 실행 증거** — 임시 프로젝트(mkdtemp)에 `.harness/active.json`(`tester/demo`) + Learnings 3개짜리 artifact를 만들고
  `node bin/harness-team.mjs rules promote --target <tmp>`(목록) → `rules promote 1 --name api-input-validation --paths "src/api/**/*.ts" --target <tmp>`(성공 3줄, 생성된 규칙·`.mdc`·artifact 표기 `cat`) →
  `rules promote 1 --name again`(`already-promoted`, exit 2) → `rules promote 2 --name api-input-validation`(`rule-exists`, exit 2) → `rules promote 3 --name threshold-tests --json`(success envelope) → 승격 후 목록 →
  마커 없는 `legacy.md`를 넣고 `doctor --json --target <tmp>`의 `checks[]`에서 `rule provenance` 항목 발췌. 이 저장소에서는 `rules promote`의 retro 전(`no-data`)·후(목록) 출력과 `doctor 2>&1 | grep -c "rule provenance"` → `0`(`.claude/rules` 부재)을 인용.
  *(계획 시점에 적었던 번호·slug·grep 명령은 실행 때 바꿨는데 서술을 고치지 않았다 — shipcheck #1 S2 지적으로 실제 실행에 맞춰 정정, 2026-09-05.)*
- [x] **Step 6.2: 외부 read-only 리뷰** — codex P1 1·P2 4·P3 2 → 8건 RED 재현 후 전부 반영(`506e59a`), artifact `## Reviews` 마커 기록. — `/harness-review codex` 절차(`codex exec --sandbox read-only -m gpt-5.6-sol "<공용 프롬프트+focus>" < /dev/null` 백그라운드),
  focus: 승격 표기 파싱의 경계(이어지는 줄·CRLF·`###`), slug 경로 탈출, 쓰기 순서와 부분 실패, doctor 경고 오탐(템플릿 사본). 발견을 테스트로 재현·판별 후 반영/기각, artifact `## Reviews`에 판별·마커.
- [ ] **Step 6.3: ship** — shipcheck #1 NOT READY(S2·S5, 문서 정합) → 정정 후 shipcheck #2 재검증. `/harness-ship` 절차: spec·plan 최종 갱신(Ontology 변경 로그 포함), artifact `## 결과`(실행 증거)·검증 출력·리스크(미검증 가정: rules 파일의 HTML 주석 제거)·`## Learnings`(retro) → task 문서 커밋 → push·PR(사용자 지시 후) → CI pass 확인.
- [ ] **Step 6.4: PR 머지 → `harness-team done` → 기본 브랜치에서 `summary --write`** (사용자 지시 후; 머지 후 절차는 handoff §3 마지막 결정 그대로)

## Ontology 변경 로그
*개념이 새로 정의되거나 의미가 바뀌면 한 줄로 기록. spec.md의 Ontology 섹션을 갱신할 트리거가 된다.*

- 2026-09-05: **Learnings 항목·승격·유래 마커·승격 표기·rule provenance 경고** 신규 정의(spec Ontology).

## 참고
- 본보기: `docs/hslee/observability-consumer/observability-consumer-plan.md`(같은 경로로 만든 직전 task)
- 인계: `.claude/handoffs/2026-09-05-1750-retro-rules-promotion.md` §1·§3·§8

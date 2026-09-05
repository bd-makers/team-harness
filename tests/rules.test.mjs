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

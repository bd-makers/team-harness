import { test } from 'node:test';
import assert from 'node:assert/strict';
import { mergeMarkdown } from '../src/merge.mjs';
import { sectionHashes } from '../src/render-state.mjs';

const block = (body) => `<!-- harness:section="stack" begin -->\n${body}\n<!-- harness:section="stack" end -->`;
const doc = (body) => `# P\n\n${block(body)}\n`;

const RENDERED = doc('- pip');
const OURS = doc('- npm');          // 하네스가 지난번에 렌더한 것
const EDITED = doc('- uv (사용자)'); // 사용자가 고친 것

test('lastRender 없음 → 종전 동작(전부 교체)', () => {
  assert.equal(mergeMarkdown(EDITED, RENDERED), RENDERED);
});

test('현재 내용이 lastRender와 일치 → 교체', () => {
  const merged = mergeMarkdown(OURS, RENDERED, { lastRender: sectionHashes(OURS) });
  assert.equal(merged, RENDERED);
});

test('현재 내용이 lastRender와 불일치 → 그 절만 건너뛰고 onSkip 보고', () => {
  const skipped = [];
  const merged = mergeMarkdown(EDITED, RENDERED, {
    lastRender: sectionHashes(OURS),
    onSkip: (name) => skipped.push(name),
  });
  assert.equal(merged, EDITED, '사용자 편집이 그대로 남는다');
  assert.deepEqual(skipped, ['stack']);
});

test('lastRender에 그 절이 없음(부트스트랩) → stock 간주, 교체', () => {
  const skipped = [];
  const merged = mergeMarkdown(EDITED, RENDERED, { lastRender: {}, onSkip: (n) => skipped.push(n) });
  assert.equal(merged, RENDERED);
  assert.deepEqual(skipped, [], '부트스트랩은 건너뛰기가 아니다');
});

test('마커가 아예 없는 파일 → 종전대로 append (가드와 무관)', () => {
  const merged = mergeMarkdown('# P\n', RENDERED, { lastRender: {} });
  assert.ok(merged.includes('- pip'));
});

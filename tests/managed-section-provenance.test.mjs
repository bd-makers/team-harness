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

// --- planChanges 통합: 건너뛰기 보고와 렌더 상태 이월 ---
import { mkdtemp, mkdir, writeFile } from 'node:fs/promises';
import { join, resolve, dirname } from 'node:path';
import { tmpdir } from 'node:os';
import { fileURLToPath } from 'node:url';
import { planChanges } from '../src/harness.mjs';
import { saveRenderState } from '../src/render-state.mjs';

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const ctxFor = (dir) => ({ root: ROOT, targetDir: dir, flags: {} });

async function projectWithAgents(body) {
  const dir = await mkdtemp(join(tmpdir(), 'harness-prov-init-'));
  await mkdir(join(dir, '.claude'), { recursive: true });
  await writeFile(join(dir, 'AGENTS.md'), body);
  return dir;
}

const EDITED_AGENTS = '# P\n\n<!-- harness:section="stack" begin -->\n- 사용자가 고침\n<!-- harness:section="stack" end -->\n';

test('planChanges: 해시 있고 사용자가 고친 절 → skippedSections에 담기고 변경에서 빠진다', async () => {
  const dir = await projectWithAgents(EDITED_AGENTS);
  await saveRenderState(dir, { version: 1, sections: { 'AGENTS.md': { stack: 'deadbeef' } } });
  const { skippedSections } = await planChanges(ctxFor(dir), { stack: {} });
  const hit = skippedSections.find(s => s.file === 'AGENTS.md' && s.section === 'stack');
  assert.ok(hit, 'stack 절이 건너뛰기로 보고된다');
  assert.ok(hit.diff.length > 0, 'diff가 함께 온다');
});

test('planChanges: 건너뛴 절은 이전 렌더 해시를 그대로 이어받는다', async () => {
  const dir = await projectWithAgents(EDITED_AGENTS);
  await saveRenderState(dir, { version: 1, sections: { 'AGENTS.md': { stack: 'deadbeef' } } });
  const { renderState } = await planChanges(ctxFor(dir), { stack: {} });
  // 두 가지를 동시에 지켜야 한다:
  //  (1) 사용자 편집의 해시를 기록하지 않는다 — 기록하면 다음 실행이 "우리 렌더"로 보고 덮는다.
  //  (2) 이전 렌더 해시를 지우지도 않는다 — 지우면 다음 실행이 부트스트랩으로 판정해 역시 덮는다.
  // 즉 보호가 딱 한 번만 걸리는 버그를 (2)가 막는다.
  assert.equal(renderState.sections['AGENTS.md'].stack, 'deadbeef',
    '건너뛴 절의 이전 해시는 보존된다 (지우면 다음 실행이 부트스트랩으로 덮는다)');
});

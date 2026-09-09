import { test } from 'node:test';
import assert from 'node:assert/strict';
import { mkdtemp, mkdir, writeFile, readFile } from 'node:fs/promises';
import { join } from 'node:path';
import { tmpdir } from 'node:os';
import { createHash } from 'node:crypto';
import { sectionHashes, loadRenderState, saveRenderState, RENDER_STATE_REL } from '../src/render-state.mjs';

const BLOCK = '<!-- harness:section="stack" begin -->\n- npm\n<!-- harness:section="stack" end -->';
const DOC = `# T\n\n${BLOCK}\n\ntail\n`;

test('sectionHashes: 마커 포함 블록 전체의 sha256', () => {
  const h = sectionHashes(DOC);
  assert.deepEqual(Object.keys(h), ['stack']);
  assert.equal(h.stack, createHash('sha256').update(BLOCK).digest('hex'));
});

test('sectionHashes: 마커 없는 문서는 빈 객체', () => {
  assert.deepEqual(sectionHashes('# nothing here\n'), {});
});

test('loadRenderState: 파일 없음 → 빈 기본값', async () => {
  const dir = await mkdtemp(join(tmpdir(), 'harness-rs-'));
  assert.deepEqual(await loadRenderState(dir), { version: 1, sections: {} });
});

test('loadRenderState: 깨진 JSON → 빈 기본값 (throw 하지 않는다)', async () => {
  const dir = await mkdtemp(join(tmpdir(), 'harness-rs-'));
  await mkdir(join(dir, '.harness'), { recursive: true });
  await writeFile(join(dir, RENDER_STATE_REL), '{ not json');
  assert.deepEqual(await loadRenderState(dir), { version: 1, sections: {} });
});

test('saveRenderState → loadRenderState 왕복', async () => {
  const dir = await mkdtemp(join(tmpdir(), 'harness-rs-'));
  const state = { version: 1, sections: { 'AGENTS.md': { stack: 'abc' } } };
  await saveRenderState(dir, state);
  assert.deepEqual(await loadRenderState(dir), state);
  const raw = await readFile(join(dir, RENDER_STATE_REL), 'utf8');
  assert.ok(raw.endsWith('\n'), '파일은 개행으로 끝난다');
});

// codex 리뷰 P2: 저장이 원자적이지 않으면 중단 시 깨진 JSON이 남고, 그것은 빈 부트스트랩으로
// 읽혀 다음 init이 관리 절을 덮는다 — 실패 모드가 "보호 해제"다.
test('saveRenderState: 임시 파일을 남기지 않는다 (원자적 교체)', async () => {
  const { readdir } = await import('node:fs/promises');
  const dir = await mkdtemp(join(tmpdir(), 'harness-rs-atomic-'));
  await saveRenderState(dir, { version: 1, sections: { 'AGENTS.md': { stack: 'a' } } });
  await saveRenderState(dir, { version: 1, sections: { 'AGENTS.md': { stack: 'b' } } });
  const files = await readdir(join(dir, '.harness'));
  assert.deepEqual(files, ['render-state.json'], '.tmp 잔여물이 없다');
  assert.equal((await loadRenderState(dir)).sections['AGENTS.md'].stack, 'b');
});

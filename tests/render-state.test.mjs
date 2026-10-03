import { test } from 'node:test';
import assert from 'node:assert/strict';
import { mkdtemp, mkdir, writeFile, readFile } from 'node:fs/promises';
import { join } from 'node:path';
import { tmpdir } from 'node:os';
import { createHash } from 'node:crypto';
import { sectionHashes, loadRenderState, saveRenderState, readHarnessVersion, RENDER_STATE_REL } from '../src/render-state.mjs';

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

test('loadRenderState: stack 은 알려진 id 만 남긴다 (모르는 id 는 generic 으로 렌더되므로 버린다)', async () => {
  const dir = await mkdtemp(join(tmpdir(), 'harness-rs-stack-'));
  await saveRenderState(dir, { version: 1, stack: 'next', sections: {} });
  assert.equal((await loadRenderState(dir)).stack, 'next');
  await saveRenderState(dir, { version: 1, stack: 'reakt', sections: {} });
  assert.deepEqual(await loadRenderState(dir), { version: 1, sections: {} });
});

test('loadRenderState: harnessVersion 은 semver 형식만 남긴다 (없거나 틀리면 기록 이전 설치본)', async () => {
  const dir = await mkdtemp(join(tmpdir(), 'harness-rs-hv-'));
  await saveRenderState(dir, { version: 1, harnessVersion: '0.44.5', sections: {} });
  assert.equal((await loadRenderState(dir)).harnessVersion, '0.44.5');
  await saveRenderState(dir, { version: 1, harnessVersion: '0.44.5-rc.1+build.7', sections: {} });
  assert.equal((await loadRenderState(dir)).harnessVersion, '0.44.5-rc.1+build.7', 'prerelease+build 동시 사용도 유효한 semver');
  await saveRenderState(dir, { version: 1, harnessVersion: 'latest', sections: {} });
  assert.deepEqual(await loadRenderState(dir), { version: 1, sections: {} });
  await saveRenderState(dir, { version: 1, harnessVersion: 44, sections: {} });
  assert.deepEqual(await loadRenderState(dir), { version: 1, sections: {} });
});

test('readHarnessVersion: 플러그인 루트 package.json 의 version, 없으면 null', async () => {
  const root = join(import.meta.dirname, '..');
  const pkg = JSON.parse(await readFile(join(root, 'package.json'), 'utf8'));
  assert.equal(await readHarnessVersion(root), pkg.version);
  assert.equal(await readHarnessVersion(await mkdtemp(join(tmpdir(), 'harness-rs-nopkg-'))), null);
});

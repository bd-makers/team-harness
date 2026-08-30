// copyStaticAssets copied the 4 React-Native-specific `.claude/rules` files (Expo Router
// navigation, RN state management, RN styling, RN testing) into every scaffolded project —
// even `--stack python|node|generic` ones, where the guidance is actively wrong. This gates
// the copy on the explicit `--stack` flag: an explicit non-RN stack skips them; an explicit
// RN-family stack, or no `--stack` flag at all, keeps the pre-existing unconditional copy
// (backward compat — auto-detected stack never gates this on its own).
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { mkdtemp, readdir, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join, resolve, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

import { copyStaticAssets, mirrorCursorRules } from '../src/harness.mjs';

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const RN_ONLY_RULES = ['navigation.md', 'state-management.md', 'styling.md', 'testing.md'];

const ctxFor = (dir, flags = {}) => ({ root: ROOT, targetDir: dir, flags });

async function sandbox() {
  return mkdtemp(join(tmpdir(), 'harness-stack-rules-'));
}

async function rulesIn(dir) {
  try { return await readdir(join(dir, '.claude/rules')); } catch { return []; }
}

test('copyStaticAssets: 명시적 비-RN stack(python)은 RN 전용 rules 4종을 복사하지 않는다', async () => {
  const dir = await sandbox();
  try {
    await copyStaticAssets(ctxFor(dir, { stack: 'python' }));
    const names = await rulesIn(dir);
    for (const f of RN_ONLY_RULES) assert.ok(!names.includes(f), `${f}는 python stack에 복사되면 안 된다`);
  } finally {
    await rm(dir, { recursive: true, force: true });
  }
});

test('copyStaticAssets: 명시적 비-RN stack(node)도 RN 전용 rules 4종을 복사하지 않는다', async () => {
  const dir = await sandbox();
  try {
    await copyStaticAssets(ctxFor(dir, { stack: 'node' }));
    const names = await rulesIn(dir);
    for (const f of RN_ONLY_RULES) assert.ok(!names.includes(f), `${f}는 node stack에 복사되면 안 된다`);
  } finally {
    await rm(dir, { recursive: true, force: true });
  }
});

test('copyStaticAssets: 명시적 비-RN stack(generic)도 RN 전용 rules 4종을 복사하지 않는다', async () => {
  const dir = await sandbox();
  try {
    await copyStaticAssets(ctxFor(dir, { stack: 'generic' }));
    const names = await rulesIn(dir);
    for (const f of RN_ONLY_RULES) assert.ok(!names.includes(f), `${f}는 generic stack에 복사되면 안 된다`);
  } finally {
    await rm(dir, { recursive: true, force: true });
  }
});

test('copyStaticAssets: 명시적 RN stack(react-native)은 기존처럼 RN 전용 rules 4종을 복사한다', async () => {
  const dir = await sandbox();
  try {
    await copyStaticAssets(ctxFor(dir, { stack: 'react-native' }));
    const names = await rulesIn(dir);
    for (const f of RN_ONLY_RULES) assert.ok(names.includes(f), `${f}는 react-native stack에 복사돼야 한다`);
  } finally {
    await rm(dir, { recursive: true, force: true });
  }
});

test('copyStaticAssets: --stack 미지정(자동감지 경로)은 기존 무조건 복사 동작을 유지한다', async () => {
  const dir = await sandbox();
  try {
    // flags에 stack 키 자체가 없다 — CLI에서 --stack을 안 준 경우와 동일.
    await copyStaticAssets(ctxFor(dir, {}));
    const names = await rulesIn(dir);
    for (const f of RN_ONLY_RULES) assert.ok(names.includes(f), `${f}는 stack 미지정 시 기존 동작대로 복사돼야 한다(하위 호환)`);
  } finally {
    await rm(dir, { recursive: true, force: true });
  }
});

test('copyStaticAssets: rules 제외와 무관하게 hooks/skills/docs는 그대로 복사된다', async () => {
  const dir = await sandbox();
  try {
    const results = await copyStaticAssets(ctxFor(dir, { stack: 'python' }));
    assert.ok(results.some(r => r.path.includes('.claude/hooks') && r.action === 'write'), 'hooks는 stack과 무관하게 복사돼야 한다');
    assert.ok(results.some(r => r.path.includes('.claude/skills') && r.action === 'write'), 'skills는 stack과 무관하게 복사돼야 한다');
  } finally {
    await rm(dir, { recursive: true, force: true });
  }
});

test('sync(mirrorCursorRules): 비-RN stack이라 .claude/rules가 비어 있어도 실패하지 않는다', async () => {
  const dir = await sandbox();
  try {
    await copyStaticAssets(ctxFor(dir, { stack: 'python' }));
    // RN 전용 4종이 유일한 rule 파일이므로 python stack 이후 .claude/rules는 비어 있다.
    assert.deepEqual(await rulesIn(dir), []);

    const results = await mirrorCursorRules({ targetDir: dir });
    assert.deepEqual(results, [], '소스가 비어 있으면 미러링할 것도 없다 — 예외 없이 빈 배열');

    const cursorRulesNames = await readdir(join(dir, '.cursor/rules')).catch(() => null);
    assert.equal(cursorRulesNames, null, '.cursor/rules 디렉토리 자체가 생기지 않아야 한다');
  } finally {
    await rm(dir, { recursive: true, force: true });
  }
});

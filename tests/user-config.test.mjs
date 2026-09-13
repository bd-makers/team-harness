import { test } from 'node:test';
import assert from 'node:assert/strict';
import { mkdtemp, mkdir, readFile, writeFile, rm, access } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { resolveUsername, saveUsername, ensureUsername } from '../src/user-config.mjs';

// 2026-09-13 Codex 분석 P2: init의 최종 "Apply?"에 n을 답해도 `.harness/config.json`이 남았다 —
// ensureUsername이 이름을 확정하는 즉시 파일을 썼기 때문. 결정(resolve)과 저장(save)을 분리해
// init이 저장을 적용 단계로 미룰 수 있게 한다. `--yes`는 프롬프트 없이 git user.name → $USER 폴백.
const exists = p => access(p).then(() => true, () => false);

async function tmp() { return mkdtemp(join(tmpdir(), 'harness-userconfig-')); }

test('resolveUsername(--yes)는 이름을 돌려주되 .harness/config.json을 만들지 않는다', async () => {
  const dir = await tmp();
  try {
    const name = await resolveUsername(dir, { yes: true });
    assert.ok(name && typeof name === 'string', `이름을 확정해야 한다 — 실제: ${name}`);
    assert.equal(await exists(join(dir, '.harness')), false, 'resolve는 쓰기 단계가 아니다');
  } finally { await rm(dir, { recursive: true, force: true }); }
});

test('saveUsername이 .harness/config.json을 만들고 다른 키는 보존한다', async () => {
  const dir = await tmp();
  try {
    await mkdir(join(dir, '.harness'));
    await writeFile(join(dir, '.harness/config.json'), JSON.stringify({ other: 1 }));
    await saveUsername(dir, 'alice');
    const cfg = JSON.parse(await readFile(join(dir, '.harness/config.json'), 'utf8'));
    assert.deepEqual(cfg, { other: 1, user: 'alice' });
  } finally { await rm(dir, { recursive: true, force: true }); }
});

test('이미 user가 있으면 resolveUsername은 null (저장할 것 없음)', async () => {
  const dir = await tmp();
  try {
    await mkdir(join(dir, '.harness'));
    await writeFile(join(dir, '.harness/config.json'), JSON.stringify({ user: 'bob' }));
    assert.equal(await resolveUsername(dir, { yes: true }), null);
  } finally { await rm(dir, { recursive: true, force: true }); }
});

test('ensureUsername은 종전대로 resolve+save 한 번에 (sync 경로 불변)', async () => {
  const dir = await tmp();
  try {
    await ensureUsername(dir, { yes: true });
    const cfg = JSON.parse(await readFile(join(dir, '.harness/config.json'), 'utf8'));
    assert.ok(cfg.user, 'user가 저장돼야 한다');
  } finally { await rm(dir, { recursive: true, force: true }); }
});

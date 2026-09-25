import { test } from 'node:test';
import assert from 'node:assert/strict';
import { mkdtemp, mkdir, readFile, writeFile, rm, access } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { execFile } from 'node:child_process';
import { promisify } from 'node:util';
import { resolveUsername, saveUsername, ensureUsername, userNameError } from '../src/user-config.mjs';

// 2026-09-13 Codex 분석 P2: init의 최종 "Apply?"에 n을 답해도 `.harness/config.json`이 남았다 —
// ensureUsername이 이름을 확정하는 즉시 파일을 썼기 때문. 결정(resolve)과 저장(save)을 분리해
// init이 저장을 적용 단계로 미룰 수 있게 한다. `--yes`는 프롬프트 없이 git user.name → $USER 폴백.
const pexec = promisify(execFile);
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

// config user 는 raw 로 `docs/<user>/` 가 된다 — 경로 세그먼트 하나가 아니면 거부(PR #98 codex 3차 P1).
// 문자 집합은 막지 않는다: 한글·공백 이름은 실제 입력이다.
test('userNameError 는 경로를 벗어나게 하는 이름만 거부한다', () => {
  for (const bad of ['', '   ', '../../x', '..', '.', '.hidden', 'a/b', 'a\\b', 'a\u0000b', 'a\nb', 'a\u007fb', 42, null, {}]) {
    assert.equal(typeof userNameError(bad), 'string', `거부해야 함: ${JSON.stringify(bad)}`);
  }
  for (const ok of ['hslee', '이한상', 'Chad Lee', 'a..b', 'a.b', 'x-y_z']) {
    assert.equal(userNameError(ok), null, `통과해야 함: ${JSON.stringify(ok)}`);
  }
});

test('resolveUsername 은 규칙을 어기는 이름을 저장 전에 거부한다 (파일 없음)', async () => {
  const dir = await tmp();
  try {
    await pexec('git', ['-C', dir, 'init', '-q']);
    await pexec('git', ['-C', dir, 'config', 'user.name', '../../x']);
    await assert.rejects(resolveUsername(dir, { yes: true }), /user/);
    assert.equal(await exists(join(dir, '.harness')), false);
  } finally { await rm(dir, { recursive: true, force: true }); }
});

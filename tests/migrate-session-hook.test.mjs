import { test } from 'node:test';
import assert from 'node:assert/strict';
import { mkdtemp, mkdir, writeFile, readFile, rm } from 'node:fs/promises';
import { resolve, dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { tmpdir } from 'node:os';
import { migrateSessionStartHook } from '../src/commands/migrate.mjs';

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const ctxYes = (dir) => ({ targetDir: dir, root: ROOT, flags: { yes: true } });

async function fixture(settings) {
  const dir = await mkdtemp(join(tmpdir(), 'harness-mig-hook-'));
  if (settings !== undefined) {
    await mkdir(join(dir, '.claude'), { recursive: true });
    await writeFile(join(dir, '.claude/settings.json'), JSON.stringify(settings, null, 2));
  }
  return dir;
}
async function readSettings(dir) {
  return JSON.parse(await readFile(join(dir, '.claude/settings.json'), 'utf8'));
}

const PRE_GATE = {
  permissions: { allow: ['Read'] },
  hooks: {
    PreToolUse: [{ matcher: 'Bash', hooks: [{ type: 'command', command: './x.sh' }] }],
  },
};

test('SessionStart 없는 settings.json → task-gate hook 추가, 기존 hook 보존', async () => {
  const dir = await fixture(PRE_GATE);
  try {
    const ret = await migrateSessionStartHook(ctxYes(dir));
    assert.equal(ret, true, '마이그레이션 수행 → true');
    const s = await readSettings(dir);
    const ss = s.hooks.SessionStart;
    assert.ok(Array.isArray(ss), 'SessionStart 배열 생성');
    const cmds = ss.flatMap(g => (g.hooks || []).map(h => h.command));
    assert.ok(cmds.some(c => c.includes('session-context')), 'session-context 호출 주입');
    // 기존 PreToolUse 보존
    assert.equal(s.hooks.PreToolUse[0].hooks[0].command, './x.sh', 'PreToolUse 보존');
    assert.deepEqual(s.permissions.allow, ['Read'], 'permissions 보존');
  } finally { await rm(dir, { recursive: true, force: true }); }
});

test('이미 SessionStart task-gate 있음 → 변경 없음 (멱등, false)', async () => {
  const dir = await fixture({
    hooks: {
      SessionStart: [{ hooks: [{ type: 'command', command: 'harness-team session-context 2>/dev/null || true' }] }],
    },
  });
  try {
    const before = await readSettings(dir);
    const ret = await migrateSessionStartHook(ctxYes(dir));
    assert.equal(ret, false, 'up to date → false');
    const after = await readSettings(dir);
    assert.deepEqual(after, before, '변경 없음');
  } finally { await rm(dir, { recursive: true, force: true }); }
});

test('.claude/settings.json 없음 → skip (false)', async () => {
  const dir = await fixture(undefined);
  try {
    const ret = await migrateSessionStartHook(ctxYes(dir));
    assert.equal(ret, false, 'settings.json 없으면 skip');
  } finally { await rm(dir, { recursive: true, force: true }); }
});

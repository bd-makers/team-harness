import { test } from 'node:test';
import assert from 'node:assert/strict';
import { mkdtemp, mkdir, writeFile, readFile, rm, stat, lstat, chmod, symlink } from 'node:fs/promises';
import { resolve, dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { tmpdir } from 'node:os';
import { migrateSessionStartHook, migrateBoundaryCheckpointHook, runMigrate } from '../src/commands/migrate.mjs';

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const ctxYes = (dir) => ({ targetDir: dir, root: ROOT, flags: { yes: true } });

function captureLogs() {
  const lines = [];
  const original = console.log;
  console.log = (...args) => lines.push(args.join(' '));
  return { lines, restore: () => { console.log = original; } };
}

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
async function installBoundaryScript(dir, content = '#!/usr/bin/env bash\nexit 0\n') {
  const path = join(dir, '.claude/hooks/boundary-checkpoint.sh');
  await mkdir(join(dir, '.claude/hooks'), { recursive: true });
  await writeFile(path, content, { mode: 0o755 });
  return path;
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

const OLD_DEFAULT_PROTECT = {
  matcher: 'Edit|Write',
  hooks: [{ type: 'command', command: './.claude/hooks/protect-files.sh', timeout: 10 }],
};
const CUSTOM_EDIT_HOOK = {
  matcher: 'Edit|Write',
  hooks: [
    { type: 'command', command: './.claude/hooks/protect-files.sh', timeout: 10 },
    { type: 'command', command: './custom-hook.sh', timeout: 10 },
  ],
};

test('기본 protect 설정 → boundary hook 설정과 실행 script를 추가한다', async () => {
  const dir = await fixture({ hooks: { PreToolUse: [OLD_DEFAULT_PROTECT] } });
  try {
    const ret = await migrateBoundaryCheckpointHook(ctxYes(dir));
    assert.equal(ret, true);
    const settings = await readSettings(dir);
    assert.deepEqual(settings.hooks.PreToolUse[0].hooks.map(h => h.command), [
      './.claude/hooks/protect-files.sh',
      './.claude/hooks/boundary-checkpoint.sh',
    ]);
    const scriptPath = join(dir, '.claude/hooks/boundary-checkpoint.sh');
    assert.equal((await stat(scriptPath)).mode & 0o111, 0o111, 'script is executable');
  } finally { await rm(dir, { recursive: true, force: true }); }
});

test('커스터마이즈된 Edit hook은 보존하고 boundary 기본 group만 비파괴적으로 추가한다', async () => {
  const dir = await fixture({ hooks: { PreToolUse: [CUSTOM_EDIT_HOOK] } });
  try {
    const ret = await migrateBoundaryCheckpointHook(ctxYes(dir));
    assert.equal(ret, true);
    const settings = await readSettings(dir);
    assert.deepEqual(settings.hooks.PreToolUse[0], CUSTOM_EDIT_HOOK, 'custom group is untouched');
    assert.ok(settings.hooks.PreToolUse.slice(1).some(group =>
      group.hooks?.some(h => h.command === './.claude/hooks/boundary-checkpoint.sh')),
    'template boundary group added without replacing customization');
  } finally { await rm(dir, { recursive: true, force: true }); }
});

test('커스터마이즈된 boundary hook이 이미 있으면 설정과 script를 변경하지 않는다', async () => {
  const dir = await fixture({
    hooks: {
      PreToolUse: [{
        matcher: 'Edit',
        hooks: [
          { type: 'command', command: './custom-boundary-wrapper.sh', timeout: 30 },
          { type: 'command', command: './.claude/hooks/boundary-checkpoint.sh', timeout: 30 },
        ],
      }],
    },
  });
  try {
    const scriptPath = await installBoundaryScript(dir, '#!/usr/bin/env bash\n# CUSTOM\nexit 0\n');
    const before = await readSettings(dir);
    const beforeScript = await readFile(scriptPath, 'utf8');
    const ret = await migrateBoundaryCheckpointHook(ctxYes(dir));
    assert.equal(ret, false);
    assert.deepEqual(await readSettings(dir), before, 'settings unchanged');
    assert.equal(await readFile(scriptPath, 'utf8'), beforeScript, 'existing script unchanged');
  } finally { await rm(dir, { recursive: true, force: true }); }
});

test('읽을 수 없는 기존 boundary script도 덮어쓰지 않는다', async () => {
  const dir = await fixture({ hooks: { PreToolUse: [OLD_DEFAULT_PROTECT] } });
  try {
    const scriptPath = await installBoundaryScript(dir, '#!/usr/bin/env bash\n# CUSTOM\nexit 0\n');
    await chmod(scriptPath, 0o300);

    const ret = await migrateBoundaryCheckpointHook(ctxYes(dir));

    assert.equal(ret, true);
    await chmod(scriptPath, 0o755);
    assert.equal(await readFile(scriptPath, 'utf8'), '#!/usr/bin/env bash\n# CUSTOM\nexit 0\n');
  } finally { await rm(dir, { recursive: true, force: true }); }
});

for (const [name, create] of [
  ['디렉터리', path => mkdir(path)],
  ['실행 권한 없는 파일', path => writeFile(path, '#!/usr/bin/env bash\nexit 0\n', { mode: 0o600 })],
  ['깨진 심볼릭 링크', path => symlink('missing-target.sh', path)],
]) {
  test(`${name}인 기존 boundary 경로는 설정을 변경하지 않는다`, async () => {
    const dir = await fixture({ hooks: { PreToolUse: [OLD_DEFAULT_PROTECT] } });
    try {
      const scriptPath = join(dir, '.claude/hooks/boundary-checkpoint.sh');
      await mkdir(join(dir, '.claude/hooks'), { recursive: true });
      await create(scriptPath);
      const before = await readSettings(dir);

      const ret = await migrateBoundaryCheckpointHook(ctxYes(dir));

      assert.equal(ret, null);
      assert.deepEqual(await readSettings(dir), before);
      assert.ok(await lstat(scriptPath));
    } finally { await rm(dir, { recursive: true, force: true }); }
  });
}

test('실행 불가 boundary script는 migrate 완료로 보고하지 않는다', async () => {
  const dir = await fixture({
    hooks: {
      SessionStart: [{ hooks: [{ type: 'command', command: 'harness-team session-context 2>/dev/null || true' }] }],
      PreToolUse: [OLD_DEFAULT_PROTECT],
    },
  });
  try {
    await mkdir(join(dir, '.claude/hooks/boundary-checkpoint.sh'), { recursive: true });
    const cap = captureLogs();
    try {
      await runMigrate(ctxYes(dir));
    } finally { cap.restore(); }
    assert.ok(cap.lines.some(line => line.includes('Migration incomplete')));
    assert.ok(!cap.lines.some(line => line.includes('Nothing to migrate')));
  } finally { await rm(dir, { recursive: true, force: true }); }
});

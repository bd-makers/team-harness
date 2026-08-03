import { test } from 'node:test';
import assert from 'node:assert/strict';
import { resolve, dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { mkdtemp, mkdir, writeFile, rm, symlink } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { execFile } from 'node:child_process';
import { promisify } from 'node:util';
import { checkCommand, checkSelfCli, checkActiveSpecGate, detectLegacyStructure, checkSessionStartHook, checkBoundaryCheckpointHook, isPluginDevRepo } from '../src/commands/doctor.mjs';
import { cloudSyncPathWarning } from '../src/harness.mjs';
import { taskSpecTemplate } from '../src/commands/task.mjs';

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const pexec = promisify(execFile);

// Run the real doctor CLI against a target dir and return the parsed --json envelope.
async function doctorJson(targetDir) {
  const { stdout } = await pexec('node', [join(ROOT, 'bin/harness-team.mjs'), 'doctor', '--json', '--target', targetDir], { timeout: 20000 })
    .catch(e => ({ stdout: e.stdout || '' })); // doctor exits 1 on fail — keep the envelope
  return JSON.parse(stdout);
}
const checkOf = (env, label) => (env.checks || []).find(c => c.label === label);

async function makeActiveFixture(specContent) {
  const dir = await mkdtemp(join(tmpdir(), 'harness-doctor-gate-'));
  await mkdir(join(dir, '.harness'), { recursive: true });
  await writeFile(
    join(dir, '.harness/active.json'),
    JSON.stringify({ user: 'tester', task: 'demo', path: 'docs/tester/demo' }),
  );
  const taskDir = join(dir, 'docs', 'tester', 'demo');
  await mkdir(taskDir, { recursive: true });
  if (specContent !== undefined) await writeFile(join(taskDir, 'demo-spec.md'), specContent);
  return dir;
}

test('checkCommand: node --version → true (node는 항상 존재)', async () => {
  const result = await checkCommand('node', ['--version']);
  assert.equal(result, true);
});

test('checkCommand: 존재하지 않는 명령어 → false (ENOENT 처리)', async () => {
  const result = await checkCommand('definitely-not-a-real-command-xyz-123');
  assert.equal(result, false);
});

test('checkSelfCli: 실제 bin으로 실행 → true (harness-team 출력 포함)', async () => {
  const result = await checkSelfCli(ROOT);
  assert.equal(result, true);
});

test('checkActiveSpecGate: 활성 task 없으면 null (조용히 skip)', async () => {
  const dir = await mkdtemp(join(tmpdir(), 'harness-doctor-noactive-'));
  try {
    assert.equal(await checkActiveSpecGate(dir), null);
  } finally {
    await rm(dir, { recursive: true, force: true });
  }
});

test('checkActiveSpecGate: 정상 spec(자가진단 포함) → null', async () => {
  const dir = await makeActiveFixture(taskSpecTemplate('demo'));
  try {
    assert.equal(await checkActiveSpecGate(dir), null);
  } finally {
    await rm(dir, { recursive: true, force: true });
  }
});

test('checkActiveSpecGate: 포인터 껍데기 spec(자가진단 없음) → 경고 문자열', async () => {
  const dir = await makeActiveFixture('# demo\n\n→ docs/tester/big-spec.md\n');
  try {
    const w = await checkActiveSpecGate(dir);
    assert.ok(typeof w === 'string', 'returns a warning string');
    assert.match(w, /게이트 우회/);
  } finally {
    await rm(dir, { recursive: true, force: true });
  }
});

test('checkActiveSpecGate: spec.md 부재 → 경고 문자열', async () => {
  const dir = await makeActiveFixture(undefined); // no spec written
  try {
    const w = await checkActiveSpecGate(dir);
    assert.ok(typeof w === 'string', 'returns a warning string');
    assert.match(w, /spec\.md 없음/);
  } finally {
    await rm(dir, { recursive: true, force: true });
  }
});

test('detectLegacyStructure: AGENTS.md가 CLAUDE.md로의 symlink면 레거시 경고', async () => {
  const dir = await mkdtemp(join(tmpdir(), 'harness-legacy-'));
  try {
    await writeFile(join(dir, 'CLAUDE.md'), '# old master\n');
    await symlink('CLAUDE.md', join(dir, 'AGENTS.md'));
    const w = await detectLegacyStructure(dir);
    assert.ok(typeof w === 'string' && /migrate/.test(w), '레거시→migrate 안내');
  } finally { await rm(dir, { recursive: true, force: true }); }
});

test('detectLegacyStructure: .cursorrules 존재만으로도 레거시 경고', async () => {
  const dir = await mkdtemp(join(tmpdir(), 'harness-legacy2-'));
  try {
    await writeFile(join(dir, 'AGENTS.md'), '# core\n');
    await writeFile(join(dir, 'CLAUDE.md'), '@AGENTS.md\n');
    await writeFile(join(dir, '.cursorrules'), 'x\n');
    const w = await detectLegacyStructure(dir);
    assert.ok(typeof w === 'string' && /migrate/.test(w));
  } finally { await rm(dir, { recursive: true, force: true }); }
});

async function makeSettingsFixture(settings) {
  const dir = await mkdtemp(join(tmpdir(), 'harness-doctor-hook-'));
  if (settings !== undefined) {
    await mkdir(join(dir, '.claude'), { recursive: true });
    await writeFile(join(dir, '.claude/settings.json'), JSON.stringify(settings, null, 2));
  }
  return dir;
}

test('checkSessionStartHook: SessionStart task-gate 없음 → 경고(apply 유도)', async () => {
  const dir = await makeSettingsFixture({
    hooks: { PreToolUse: [{ matcher: 'Bash', hooks: [{ type: 'command', command: './x.sh' }] }] },
  });
  try {
    const w = await checkSessionStartHook(dir);
    assert.ok(typeof w === 'string', 'returns a warning string');
    assert.match(w, /apply/, 'apply로 유도');
  } finally { await rm(dir, { recursive: true, force: true }); }
});

test('checkSessionStartHook: task-gate 있음 → null', async () => {
  const dir = await makeSettingsFixture({
    hooks: { SessionStart: [{ hooks: [{ type: 'command', command: 'harness-team session-context 2>/dev/null || true' }] }] },
  });
  try {
    assert.equal(await checkSessionStartHook(dir), null);
  } finally { await rm(dir, { recursive: true, force: true }); }
});

test('checkSessionStartHook: settings.json 부재 → null (CHECKS가 담당, 중복 fail 금지)', async () => {
  const dir = await makeSettingsFixture(undefined);
  try {
    assert.equal(await checkSessionStartHook(dir), null);
  } finally { await rm(dir, { recursive: true, force: true }); }
});

test('checkBoundaryCheckpointHook: Edit PreToolUse 경계 훅 없음 → 경고(apply 유도)', async () => {
  const dir = await makeSettingsFixture({
    hooks: { PreToolUse: [{ matcher: 'Edit|Write', hooks: [{ type: 'command', command: './x.sh' }] }] },
  });
  try {
    const w = await checkBoundaryCheckpointHook(dir);
    assert.ok(typeof w === 'string', 'returns a warning string');
    assert.match(w, /apply/, 'apply로 유도');
  } finally { await rm(dir, { recursive: true, force: true }); }
});

test('checkBoundaryCheckpointHook: Edit PreToolUse 경계 훅 있음 → null', async () => {
  const dir = await makeSettingsFixture({
    hooks: { PreToolUse: [{ matcher: 'Edit', hooks: [{ type: 'command', command: './.claude/hooks/boundary-checkpoint.sh' }] }] },
  });
  try {
    assert.equal(await checkBoundaryCheckpointHook(dir), null);
  } finally { await rm(dir, { recursive: true, force: true }); }
});

test('detectLegacyStructure: AGENTS.md 실파일 + .cursorrules 없으면 null(신구조)', async () => {
  const dir = await mkdtemp(join(tmpdir(), 'harness-new-'));
  try {
    await writeFile(join(dir, 'AGENTS.md'), '# core\n');
    await writeFile(join(dir, 'CLAUDE.md'), '@AGENTS.md\n');
    assert.equal(await detectLegacyStructure(dir), null);
  } finally { await rm(dir, { recursive: true, force: true }); }
});

test('isPluginDevRepo: 3개 마커(.claude-plugin/plugin.json·templates·bin) 모두 있으면 true', async () => {
  const dir = await mkdtemp(join(tmpdir(), 'harness-plugindev-'));
  try {
    await mkdir(join(dir, '.claude-plugin'), { recursive: true });
    await writeFile(join(dir, '.claude-plugin/plugin.json'), '{}');
    await mkdir(join(dir, 'templates'), { recursive: true });
    await mkdir(join(dir, 'bin'), { recursive: true });
    await writeFile(join(dir, 'bin/harness-team.mjs'), '// cli\n');
    assert.equal(await isPluginDevRepo(dir), true);
  } finally { await rm(dir, { recursive: true, force: true }); }
});

test('isPluginDevRepo: 마커 하나라도 빠지면 false (소비자 프로젝트 오탐 방지)', async () => {
  const dir = await mkdtemp(join(tmpdir(), 'harness-consumer-'));
  try {
    // consumer has AGENTS.md/.claude but never .claude-plugin/plugin.json + templates + bin
    await writeFile(join(dir, 'AGENTS.md'), '# core\n');
    await mkdir(join(dir, 'templates'), { recursive: true });
    assert.equal(await isPluginDevRepo(dir), false);
  } finally { await rm(dir, { recursive: true, force: true }); }
});

test('cloudSyncPathWarning: iCloud/Dropbox/Google Drive/OneDrive 경로 → 경고', () => {
  assert.match(cloudSyncPathWarning('/Users/x/Library/Mobile Documents/iCloud~md~obsidian/p'), /iCloud/);
  assert.match(cloudSyncPathWarning('/Users/x/Dropbox/p'), /Dropbox/);
  assert.match(cloudSyncPathWarning('/Users/x/Google Drive/p'), /Google Drive/);
  assert.match(cloudSyncPathWarning('/Users/x/OneDrive-Corp/p'), /OneDrive/);
});

test('cloudSyncPathWarning: 로컬 경로/빈값 → null', () => {
  assert.equal(cloudSyncPathWarning('/Users/x/projects/p'), null);
  assert.equal(cloudSyncPathWarning(''), null);
  assert.equal(cloudSyncPathWarning(null), null);
});

// --- runDoctor integration (real CLI) — guards item 5/6 branching that the pure
//     helper tests don't reach. Mirrors the manual --json checks used in dev. ---

test('runDoctor: 플러그인 소스 레포 → plugin-dev 모드, backup 체크 skip, fail 0', async () => {
  const env = await doctorJson(ROOT);
  assert.equal(env.mode, 'plugin-dev', 'top-level mode must flag plugin-dev');
  const failCount = (env.checks || []).filter(c => c.status === 'fail').length;
  assert.equal(failCount, 0, `plugin-dev repo must have 0 fails, got ${failCount}`);
  const skipCount = (env.checks || []).filter(c => c.status === 'skip').length;
  assert.ok(skipCount >= 5, `expected ≥5 skipped backup checks, got ${skipCount}`);
  assert.equal(checkOf(env, '.harness/backup.json')?.status, 'skip', 'backup.json check must be skipped, not failed');
});

test('runDoctor: 깨진(dangling) symlink → "broken symlink"로 구분 fail', async () => {
  const dir = await mkdtemp(join(tmpdir(), 'harness-doctor-broken-'));
  try {
    await symlink(join(dir, 'nope-target.md'), join(dir, 'AGENTS.md')); // dangling
    const env = await doctorJson(dir);
    assert.equal(env.mode, 'project', 'a bare consumer dir is not plugin-dev');
    const c = checkOf(env, 'AGENTS.md');
    assert.equal(c?.status, 'fail');
    assert.match(c.detail, /broken symlink/);
  } finally { await rm(dir, { recursive: true, force: true }); }
});

test('runDoctor: backup dir이 설정됐지만 디스크에 없으면 fail (iCloud eviction)', async () => {
  const dir = await mkdtemp(join(tmpdir(), 'harness-doctor-nobackup-'));
  try {
    await mkdir(join(dir, '.harness'), { recursive: true });
    await writeFile(join(dir, '.harness/backup.json'), JSON.stringify({ dir: '/tmp/harness-definitely-absent-xyz' }));
    const env = await doctorJson(dir);
    const c = checkOf(env, 'backup clone dir');
    assert.equal(c?.status, 'fail');
    assert.match(c.detail, /missing on disk/);
  } finally { await rm(dir, { recursive: true, force: true }); }
});

test('runDoctor: boundary checkpoint가 settings에 없으면 apply 경고를 노출한다', async () => {
  const dir = await makeSettingsFixture({ hooks: {} });
  try {
    const env = await doctorJson(dir);
    const c = checkOf(env, 'PreToolUse boundary checkpoint');
    assert.equal(c?.status, 'warning');
    assert.match(c.detail, /harness-team apply/);
  } finally { await rm(dir, { recursive: true, force: true }); }
});

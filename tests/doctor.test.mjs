import { test } from 'node:test';
import assert from 'node:assert/strict';
import { resolve, dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { mkdtemp, mkdir, writeFile, readFile, rm, symlink, chmod } from 'node:fs/promises';
import { tmpdir, homedir } from 'node:os';
import { execFile } from 'node:child_process';
import { promisify } from 'node:util';
import { checkCommand, checkSelfCli, checkHookCli, hookCliInstallCommand, HOOK_CLI_MARKETPLACE_DIR, checkActiveSpecGate, detectLegacyStructure, checkSessionStartHook, checkBoundaryCheckpointHook, checkDecisionLog, checkEagerTierSize, EAGER_TIER_MAX_BYTES, isPluginDevRepo, jqFallbackGaps, jqInstallAction, JQ_FALLBACK_MARKER } from '../src/commands/doctor.mjs';
import { POST_COMMIT_HOOK } from '../src/git-hooks.mjs';
import { cloudSyncPathWarning } from '../src/harness.mjs';
import { taskSpecTemplate } from '../src/commands/task.mjs';

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const pexec = promisify(execFile);

// Run the real doctor CLI against a target dir and return the parsed --json envelope.
async function doctorJson(targetDir, env) {
  const opts = { timeout: 20000, ...(env ? { env } : {}) };
  const { stdout } = await pexec('node', [join(ROOT, 'bin/harness-team.mjs'), 'doctor', '--json', '--target', targetDir], opts)
    .catch(e => ({ stdout: e.stdout || '' })); // doctor exits 1 on fail — keep the envelope
  return JSON.parse(stdout);
}
const checkOf = (env, label) => (env.checks || []).find(c => c.label === label);

// Installing by package name 404s — this package is not on the public npm registry.
// Cover the variants a doc edit could reintroduce (install/-g spellings, quoting);
// the trailing lookahead keeps the legitimate ...-marketplace path from matching.
const FORBIDDEN_NPM_INSTALL = /npm\s+(?:i|install)\s+(?:-g|--global)\s+["']?harness-aijient-team(?![-\w])/;

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

test('checkHookCli: PATH의 CLI가 두 hook 명령을 광고할 때만 통과한다', async () => {
  const dir = await mkdtemp(join(tmpdir(), 'harness-doctor-cli-'));
  try {
    const shim = join(dir, 'harness-team');
    await writeFile(shim, '#!/bin/sh\nif [ "$1" != "--help" ]; then exit 1; fi\nprintf "%s\\n" "harness-team" "  handoff" "  session-context"\n');
    await chmod(shim, 0o755);
    assert.equal(await checkHookCli({ PATH: dir }), true);
    await writeFile(shim, '#!/bin/sh\nprintf "%s\\n" "harness-team" "  session-context"\n');
    assert.equal(await checkHookCli({ PATH: dir }), false);
    assert.equal(await checkHookCli({ PATH: join(dir, 'missing') }), false);
    assert.match(POST_COMMIT_HOOK, /harness-team handoff/);
  } finally { await rm(dir, { recursive: true, force: true }); }
});

// The real bin — not a shim. checkSelfCli asserts a loose substring while checkHookCli
// line-anchors two command names, so a --help reformat could pass one and fail the other.
// This pins the actual help output to the stricter contract.
test('checkHookCli: 실제 bin을 PATH에 링크해도 통과한다 (--help 포맷 계약)', async () => {
  const dir = await mkdtemp(join(tmpdir(), 'harness-doctor-realcli-'));
  try {
    // env-shebang needs node on the same PATH; link it here so nothing else leaks in.
    await symlink(process.execPath, join(dir, 'node'));
    await symlink(join(ROOT, 'bin/harness-team.mjs'), join(dir, 'harness-team'));
    assert.equal(await checkHookCli({ PATH: dir }), true,
      'real --help must keep advertising session-context and handoff at line start');
  } finally { await rm(dir, { recursive: true, force: true }); }
});

// #16 shipped `npm i -g harness-aijient-team`, which 404s — this package is not on the
// public registry. Pin the working form so the recovery command cannot regress.
test('hookCliInstallCommand: 마켓플레이스 클론 경로를 링크한다 (패키지명 직접 설치 금지)', () => {
  const scoped = hookCliInstallCommand({ CLAUDE_PLUGINS_ROOT: '/tmp/plugins-root' });
  assert.equal(scoped, `npm i -g "${join('/tmp/plugins-root', 'marketplaces', HOOK_CLI_MARKETPLACE_DIR)}"`);

  const fallback = hookCliInstallCommand({});
  assert.equal(fallback, `npm i -g "${join(homedir(), '.claude/plugins', 'marketplaces', HOOK_CLI_MARKETPLACE_DIR)}"`,
    'CLAUDE_PLUGINS_ROOT 미설정 시 ~/.claude/plugins로 폴백해야 한다');

  for (const cmd of [scoped, fallback]) {
    assert.doesNotMatch(cmd, FORBIDDEN_NPM_INSTALL,
      'npm 공개 배포가 없으므로 패키지명 직접 설치는 404 — 경로 링크여야 한다');
  }
});

test('README는 doctor와 같은 복구 경로를 안내한다', async () => {
  const readme = await readFile(join(ROOT, 'README.md'), 'utf8');
  assert.ok(readme.includes(`marketplaces/${HOOK_CLI_MARKETPLACE_DIR}`),
    'README가 doctor와 같은 마켓플레이스 클론 경로를 안내해야 한다');
  assert.doesNotMatch(readme, FORBIDDEN_NPM_INSTALL,
    'README에 404가 되는 패키지명 직접 설치 안내가 있으면 안 된다');
});

test('FORBIDDEN_NPM_INSTALL: 404 변형은 잡고 정상 경로는 통과시킨다', () => {
  for (const bad of [
    'npm i -g harness-aijient-team',
    'npm install -g harness-aijient-team',
    'npm i -g "harness-aijient-team"',
    'npm i --global harness-aijient-team',
  ]) assert.match(bad, FORBIDDEN_NPM_INSTALL, `404 변형을 놓쳤다: ${bad}`);

  for (const good of [
    'npm i -g "${CLAUDE_PLUGINS_ROOT:-$HOME/.claude/plugins}/marketplaces/harness-aijient-team-marketplace"',
    hookCliInstallCommand({ CLAUDE_PLUGINS_ROOT: '/tmp/plugins-root' }),
  ]) assert.doesNotMatch(good, FORBIDDEN_NPM_INSTALL, `정상 경로를 오탐했다: ${good}`);
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

async function makeDecisionLogFixture(body) {
  const dir = await mkdtemp(join(tmpdir(), 'harness-doctor-dlog-'));
  if (body !== undefined) {
    await mkdir(join(dir, 'docs'), { recursive: true });
    await writeFile(join(dir, 'docs/decisions.md'), body);
  }
  return dir;
}

// The shipped template is the strongest "존재" fixture: renaming a heading there
// without touching DECISION_HEADINGS would silently warn on every fresh scaffold.
test('checkDecisionLog: 템플릿 원본(D2/D4/D5 포함) → null (템플릿↔검사 계약)', async () => {
  const dir = await makeDecisionLogFixture(await readFile(join(ROOT, 'templates/docs/decisions.md'), 'utf8'));
  try {
    assert.equal(await checkDecisionLog(dir), null);
  } finally { await rm(dir, { recursive: true, force: true }); }
});

test('checkDecisionLog: docs/decisions.md 부재 → 경고 (apply 스캐폴드 유도)', async () => {
  const dir = await makeDecisionLogFixture(undefined);
  try {
    const w = await checkDecisionLog(dir);
    assert.ok(typeof w === 'string', 'returns a warning string');
    assert.match(w, /없음/);
    assert.match(w, /harness-team apply/, '부재는 apply 스캐폴드가 해결하므로 apply로 유도');
    assert.match(w, /templates\/docs\/decisions\.md/, '가져올 원본 위치를 안내');
  } finally { await rm(dir, { recursive: true, force: true }); }
});

test('checkDecisionLog: 일부 절 누락 → 누락 절만 나열 + 템플릿 병합 안내 (apply 아님)', async () => {
  // 본문 중간의 `## D4` 언급과 `## D20` 제목은 각각 라인 앵커·\b 덕에 제목으로 안 쳐야 한다.
  const dir = await makeDecisionLogFixture(
    '# Team Decision Log\n\n## D2 (2026-06-11) — drive/리뷰어 역할 분리\n\n본문에서 ## D4 를 언급만 한다.\n\n## D20 (2027-01-01) — 별개 결정\n',
  );
  try {
    const w = await checkDecisionLog(dir);
    assert.ok(typeof w === 'string', 'returns a warning string');
    assert.match(w, /## D4, ## D5 절 없음/, '누락된 절만 정확히 나열');
    assert.doesNotMatch(w, /## D2/, '존재하는 D2는 누락 목록에 없어야 한다');
    assert.doesNotMatch(w, /apply/, 'skipExisting이라 apply로는 해결 불가 — 수동 병합 안내만');
    assert.match(w, /templates\/docs\/decisions\.md/, '가져올 원본 위치를 안내');
  } finally { await rm(dir, { recursive: true, force: true }); }
});

// Codex 리뷰 P2 회귀 방지: warn 수준 검사가 doctor를 crash 시키면 envelope 자체가 안 나온다.
test('checkDecisionLog: docs/decisions.md가 디렉터리(읽기 불가) → 경고, throw 금지', async () => {
  const dir = await mkdtemp(join(tmpdir(), 'harness-doctor-dlog-'));
  try {
    await mkdir(join(dir, 'docs/decisions.md'), { recursive: true });
    const w = await checkDecisionLog(dir);
    assert.ok(typeof w === 'string', 'returns a warning string, not a throw');
    assert.match(w, /읽기 실패/);
  } finally { await rm(dir, { recursive: true, force: true }); }
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

async function makeEagerTierFixture({ agents, claude } = {}) {
  const dir = await mkdtemp(join(tmpdir(), 'harness-doctor-eager-'));
  if (agents !== undefined) await writeFile(join(dir, 'AGENTS.md'), agents);
  if (claude !== undefined) await writeFile(join(dir, 'CLAUDE.md'), claude);
  return dir;
}

test('checkEagerTierSize: 둘 다 없음 → null (조용히 skip)', async () => {
  const dir = await mkdtemp(join(tmpdir(), 'harness-doctor-eager-none-'));
  try {
    assert.equal(await checkEagerTierSize(dir), null);
  } finally { await rm(dir, { recursive: true, force: true }); }
});

test('checkEagerTierSize: 합계가 24 KiB 이내 → null', async () => {
  const dir = await makeEagerTierFixture({ agents: 'x'.repeat(1000), claude: 'y'.repeat(1000) });
  try {
    assert.equal(await checkEagerTierSize(dir), null);
  } finally { await rm(dir, { recursive: true, force: true }); }
});

test('checkEagerTierSize: 합계가 24 KiB 초과 → 측정치·예산을 담은 경고 문자열', async () => {
  const dir = await makeEagerTierFixture({ agents: 'x'.repeat(EAGER_TIER_MAX_BYTES), claude: 'y'.repeat(1) });
  try {
    const total = EAGER_TIER_MAX_BYTES + 1;
    const w = await checkEagerTierSize(dir);
    assert.ok(typeof w === 'string', 'returns a warning string');
    assert.match(w, /^eager 계층\(AGENTS\.md\+CLAUDE\.md\)/);
    assert.match(w, new RegExp(`${total.toLocaleString('en-US')} B > ${EAGER_TIER_MAX_BYTES.toLocaleString('en-US')} B\\(24 KiB\\)`));
    assert.match(w, /lazy 정본\(커맨드 문서·스킬\)/, '절차를 lazy 정본으로 옮기라는 안내가 있어야 한다');
  } finally { await rm(dir, { recursive: true, force: true }); }
});

test('checkEagerTierSize: 한쪽 파일만 존재해도 초과분은 합산한다 (누락 파일은 0바이트)', async () => {
  const dir = await makeEagerTierFixture({ agents: 'x'.repeat(EAGER_TIER_MAX_BYTES + 1) });
  try {
    assert.ok(typeof (await checkEagerTierSize(dir)) === 'string');
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
  // Consumer-only: plugin-dev runs `node bin/harness-team.mjs` and installs no consumer
  // hooks, so a PATH miss here would be a false alarm rather than a real breakage.
  assert.equal(checkOf(env, 'SessionStart/post-commit hook CLI')?.status, 'skip',
    'hook CLI PATH check must be skipped in plugin-dev, not evaluated');
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

// jq가 없으면 Claude 훅은 fail-open 대신 저정밀 모드로 내려간다(templates/.claude/hooks/*.sh).
// "optional"이라고 보고하면 사용자가 그 사실을 알 방법이 없다 — 나머지 외부 도구와 구분해 경고한다.
test('runDoctor: jq 부재는 optional이 아니라 warning으로 보고한다 (다른 외부 도구는 종전대로)', async () => {
  const dir = await mkdtemp(join(tmpdir(), 'harness-doctor-nojq-'));
  try {
    // node만 있는 PATH — jq/gh/codex 등은 모두 미탐지 상태가 된다.
    const env = { PATH: dirname(process.execPath), HOME: homedir() };
    const envelope = await doctorJson(dir, env);
    const jq = checkOf(envelope, 'jq (JSON processor)');
    assert.equal(jq?.status, 'warning', 'jq는 보안 통제 정밀도에 영향을 주므로 경고여야 한다');
    assert.match(jq.detail, /저정밀/);
    const gh = checkOf(envelope, 'gh (GitHub CLI)');
    assert.equal(gh?.status, 'missing', '나머지 외부 도구의 optional 표기는 그대로');
    assert.match(gh.detail, /optional/);
  } finally { await rm(dir, { recursive: true, force: true }); }
});

// --- jq 경고 정직성: 설치본 훅에 폴백 블록이 있는지에 따라 문구·처방이 갈린다 ---
// "차단은 유지"는 harness:jq-fallback 마커가 있는 훅에서만 참이다. 마커 없는
// pre-#29 설치본은 jq 부재 시 조용히 무력화(fail-open)되므로 migrate로 보낸다.

test('jqFallbackGaps: 마커 없는 설치 훅만 나열한다 (마커 있음·미설치는 제외)', async () => {
  const dir = await mkdtemp(join(tmpdir(), 'harness-doctor-gaps-'));
  try {
    await mkdir(join(dir, '.claude/hooks'), { recursive: true });
    await writeFile(join(dir, '.claude/hooks/block-dangerous-git.sh'), '#!/bin/bash\n# old, no fallback\n');
    await writeFile(join(dir, '.claude/hooks/auto-format.sh'), `#!/bin/bash\n# --- ${JQ_FALLBACK_MARKER} ---\n`);
    // protect-files.sh / pre-commit-check.sh 미설치 — gap이 아니다 (실행될 훅이 없음)
    assert.deepEqual(await jqFallbackGaps(dir), ['block-dangerous-git.sh']);
  } finally { await rm(dir, { recursive: true, force: true }); }
});

test('jqFallbackGaps: 훅 미설치 프로젝트 → 빈 배열', async () => {
  const dir = await mkdtemp(join(tmpdir(), 'harness-doctor-nogaps-'));
  try {
    assert.deepEqual(await jqFallbackGaps(dir), []);
  } finally { await rm(dir, { recursive: true, force: true }); }
});

test('jqInstallAction: 플랫폼별 실행 가능한 설치 명령을 준다', () => {
  assert.equal(jqInstallAction('darwin'), 'brew install jq');
  assert.match(jqInstallAction('linux'), /apt-get install/);
});

// fail이 하나라도 있으면 next_actions가 ['harness-team sync']로 대체되므로,
// 경고 경로를 보려면 fail 0인 소비자 fixture가 필요하다 (CHECKS의 required 항목 충족).
async function healthyConsumerFixture(hooks = {}) {
  const dir = await mkdtemp(join(tmpdir(), 'harness-doctor-jqhon-'));
  await writeFile(join(dir, 'AGENTS.md'), '# core\n<!-- harness:section="protocol" -->\n');
  await writeFile(join(dir, 'CLAUDE.md'), '@AGENTS.md\n');
  await mkdir(join(dir, '.claude/hooks'), { recursive: true });
  await writeFile(join(dir, '.claude/settings.json'), '{}\n');
  for (const name of ['clone.sh', 'symlink.sh', 'delete.sh']) {
    await writeFile(join(dir, name), '#!/bin/sh\n', { mode: 0o755 });
  }
  const backup = join(dir, 'backup-clone');
  await mkdir(backup, { recursive: true });
  await mkdir(join(dir, '.harness'), { recursive: true });
  await writeFile(join(dir, '.harness/backup.json'), JSON.stringify({ dir: backup }));
  for (const [name, body] of Object.entries(hooks)) {
    await writeFile(join(dir, '.claude/hooks', name), body, { mode: 0o755 });
  }
  return dir;
}

const noJqEnvFor = (dir) => ({
  PATH: dirname(process.execPath),
  HOME: homedir(),
  CLAUDE_PLUGINS_ROOT: join(dir, 'no-plugins-root'), // 머신의 실제 설치 기록과 격리
});

test('runDoctor: jq 부재 + 폴백 블록 없는 훅 → fail-open 경고와 migrate 처방 ("차단 유지" 주장 금지)', async () => {
  const oldHook = await readFile(join(ROOT, 'tests/fixtures/stock-hooks/pre-jq-fallback/block-dangerous-git.sh'), 'utf8');
  const dir = await healthyConsumerFixture({ 'block-dangerous-git.sh': oldHook });
  try {
    const envelope = await doctorJson(dir, noJqEnvFor(dir));
    const failCount = (envelope.checks || []).filter(c => c.status === 'fail').length;
    assert.equal(failCount, 0, 'fixture는 fail 0이어야 경고 next_actions가 노출된다');
    const jq = checkOf(envelope, 'jq (JSON processor)');
    assert.equal(jq?.status, 'warning', 'fail-open이어도 jq 경고는 warning (exit code 계약 유지)');
    assert.match(jq.detail, /fail-open|무력화/, '무방비 상태를 명시해야 한다');
    assert.match(jq.detail, /migrate/, '처방(migrate)을 함께 안내해야 한다');
    assert.doesNotMatch(jq.detail, /차단은 유지/, '폴백 블록 없는 설치본에 "차단 유지" 주장은 거짓이다');
    assert.ok(envelope.next_actions.includes('harness-team migrate'),
      `next_actions에 migrate가 있어야 한다: ${JSON.stringify(envelope.next_actions)}`);
    assert.ok(envelope.next_actions.includes(jqInstallAction()), 'jq 설치 명령도 함께 안내');
  } finally { await rm(dir, { recursive: true, force: true }); }
});

test('runDoctor: jq 부재 + 폴백 블록 있는 훅 → 저정밀 문구 유지, next_actions는 jq 설치만', async () => {
  const currentHook = await readFile(join(ROOT, 'templates/.claude/hooks/block-dangerous-git.sh'), 'utf8');
  const dir = await healthyConsumerFixture({ 'block-dangerous-git.sh': currentHook });
  try {
    const envelope = await doctorJson(dir, noJqEnvFor(dir));
    const jq = checkOf(envelope, 'jq (JSON processor)');
    assert.equal(jq?.status, 'warning');
    assert.match(jq.detail, /저정밀/, '폴백이 있으면 현행 저정밀 문구를 유지한다');
    assert.ok(!envelope.next_actions.includes('harness-team migrate'),
      '폴백이 있는 설치본에 migrate를 강요하지 않는다');
    assert.ok(envelope.next_actions.includes(jqInstallAction()),
      `jq 경고에는 항상 설치 remedy가 따른다: ${JSON.stringify(envelope.next_actions)}`);
  } finally { await rm(dir, { recursive: true, force: true }); }
});

test('runDoctor: docs/decisions.md 없는 프로젝트 → decision log 경고 배선', async () => {
  const dir = await makeDecisionLogFixture(undefined);
  try {
    const env = await doctorJson(dir);
    const c = checkOf(env, 'decision log');
    assert.equal(c?.status, 'warning');
    assert.match(c.detail, /decisions\.md/);
  } finally { await rm(dir, { recursive: true, force: true }); }
});

// --- eager tier size (AGENTS.md+CLAUDE.md) — runDoctor wiring ---

test('runDoctor: eager 계층(AGENTS.md+CLAUDE.md)이 24 KiB 초과 → 경고, doctor는 여전히 성공한다', async () => {
  const dir = await healthyConsumerFixture();
  try {
    // healthyConsumerFixture's AGENTS.md already carries the required CHECKS marker —
    // keep it and pad past the budget so this only exercises the size check.
    await writeFile(join(dir, 'AGENTS.md'), '# core\n<!-- harness:section="protocol" -->\n' + 'x'.repeat(EAGER_TIER_MAX_BYTES));
    const env = await doctorJson(dir);
    const c = checkOf(env, 'eager tier size');
    assert.equal(c?.status, 'warning');
    assert.match(c.detail, /eager 계층\(AGENTS\.md\+CLAUDE\.md\)/);
    const failCount = (env.checks || []).filter(x => x.status === 'fail').length;
    assert.equal(failCount, 0, '이 경고만으로 다른 필수 점검이 fail 처리되면 안 된다');
    assert.notEqual(env.status, 'error', '경고는 fail이 아니므로 doctor의 exit code(0)에 영향을 주면 안 된다');
  } finally { await rm(dir, { recursive: true, force: true }); }
});

test('runDoctor: eager 계층이 24 KiB 이내면 경고를 노출하지 않는다', async () => {
  const dir = await healthyConsumerFixture();
  try {
    const env = await doctorJson(dir);
    assert.equal(checkOf(env, 'eager tier size'), undefined);
  } finally { await rm(dir, { recursive: true, force: true }); }
});

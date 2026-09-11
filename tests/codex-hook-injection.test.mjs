// Codex 훅이 **무엇을 주입하는가**를 고정한다.
//
// 2026-09-12 실측(`docs/chad/codex-project-hooks-probe/`): Codex 는 훅의 **평문 stdout 을 주입하지 않는다**.
// 훅은 실행되고 부수효과도 남지만 출력은 모델에 닿지 않는다. 주입되는 것은
// `hookSpecificOutput.additionalContext` 하나뿐이다. 그래서 `--codex-hook` 봉투가 필요하다.
// 그리고 Codex 는 두 신뢰(프로젝트·훅 소스)가 모두 있어야 훅을 돌리므로, 설치만으로는 동작하지 않는다.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { mkdtemp, mkdir, writeFile, readFile, rm } from 'node:fs/promises';
import { join } from 'node:path';
import { tmpdir } from 'node:os';
import { renderCodexHookEnvelope, runSessionContext } from '../src/commands/session-context.mjs';
import { parseCodexTrust, checkCodexHookTrust } from '../src/commands/doctor.mjs';
import { runTask } from '../src/commands/task.mjs';

function captureLogs() {
  const logs = [];
  const orig = console.log;
  console.log = (...a) => logs.push(a.join(' '));
  return { logs, restore: () => { console.log = orig; } };
}

test('봉투는 Codex 가 읽는 한 가지 형태다 — hookSpecificOutput.additionalContext', () => {
  const env = JSON.parse(renderCodexHookEnvelope('[harness] 활성 task: u/t'));
  assert.deepEqual(Object.keys(env), ['hookSpecificOutput']);
  assert.equal(env.hookSpecificOutput.hookEventName, 'SessionStart');
  assert.equal(env.hookSpecificOutput.additionalContext, '[harness] 활성 task: u/t');
  // 한 줄이어야 한다 — 훅 출력은 줄 단위로 읽힌다.
  assert.equal(renderCodexHookEnvelope('a\nb').includes('\n'), false, '개행은 이스케이프된다');
});

test('--codex-hook 은 같은 내용을 봉투에 담고, 기본 출력은 종전대로 평문이다', async () => {
  const dir = await mkdtemp(join(tmpdir(), 'harness-codexhook-'));
  const { logs, restore } = captureLogs();
  try {
    await runTask({ targetDir: dir, flags: { member: 'tester' }, taskArgs: ['demo'] });
    logs.length = 0;

    await runSessionContext({ targetDir: dir, flags: {} });
    const plain = logs.join('\n');
    assert.match(plain, /^\[harness\]/, '기본은 평문 — Claude 훅이 읽는 형식');
    assert.doesNotMatch(plain, /hookSpecificOutput/);
    logs.length = 0;

    await runSessionContext({ targetDir: dir, flags: { 'codex-hook': true } });
    assert.equal(logs.length, 1, '봉투는 한 줄');
    const env = JSON.parse(logs[0]);
    assert.equal(env.hookSpecificOutput.additionalContext, plain, '담기는 내용은 평문과 같다');
  } finally { restore(); await rm(dir, { recursive: true, force: true }); }
});

test('주입할 것이 없으면 빈 봉투를 만들지 않는다', async () => {
  // task 도 없고 breadcrumb 도 없는 디렉터리 — 빈 additionalContext 를 주입하면 Codex 에 빈 블록이 들어간다.
  const dir = await mkdtemp(join(tmpdir(), 'harness-codexhook-empty-'));
  const { logs, restore } = captureLogs();
  try {
    await runSessionContext({ targetDir: dir, flags: { 'codex-hook': true } });
    const envelopes = logs.filter(l => l.includes('hookSpecificOutput'));
    if (envelopes.length) {
      const ctx = JSON.parse(envelopes[0]).hookSpecificOutput.additionalContext;
      assert.ok(ctx.trim().length, '봉투를 냈다면 내용이 있어야 한다');
    }
  } finally { restore(); await rm(dir, { recursive: true, force: true }); }
});

// --- doctor: 설치는 동작이 아니다 ---

const CONFIG = (projectPath, { project = true, hookSource = true } = {}) => [
  '[features]',
  'hooks = true',
  '',
  `[projects."${projectPath}"]`,
  project ? 'trust_level = "trusted"' : 'trust_level = "untrusted"',
  '',
  ...(hookSource ? [`[hooks.state."${projectPath}/.codex/hooks.json:session_start:0:0"]`, 'trusted_hash = "sha256:deadbeef"', ''] : []),
].join('\n');

test('parseCodexTrust: 두 신뢰를 각각 읽는다', () => {
  const p = '/private/tmp/proj';
  const keys = [`${p}/.codex/hooks.json:session_start:0:0`];
  const call = (toml) => parseCodexTrust(toml, { projectPath: p, trustKeys: keys });

  assert.deepEqual(call(CONFIG(p)), { project: true, hookSource: true });
  assert.deepEqual(call(CONFIG(p, { hookSource: false })), { project: true, hookSource: false });
  assert.deepEqual(call(CONFIG(p, { project: false })), { project: false, hookSource: true });
  // 다른 프로젝트의 신뢰를 이 프로젝트 것으로 읽지 않는다.
  assert.deepEqual(call(CONFIG('/private/tmp/other')), { project: false, hookSource: false });
});

async function fixture({ config = null, hooks = true } = {}) {
  const dir = await mkdtemp(join(tmpdir(), 'harness-codextrust-'));
  if (hooks) {
    await mkdir(join(dir, '.codex'), { recursive: true });
    await writeFile(join(dir, '.codex/hooks.json'), JSON.stringify({
      hooks: { SessionStart: [{ hooks: [{ type: 'command', command: 'harness-team session-context --codex-hook', timeout: 10 }] }] },
    }));
  }
  const home = await mkdtemp(join(tmpdir(), 'harness-codexhome-'));
  if (config !== null) await writeFile(join(home, 'config.toml'), config(dir));
  return { dir, home, env: { CODEX_HOME: home } };
}

test('두 신뢰가 모두 있으면 조용하다', async () => {
  const { dir, home, env } = await fixture({ config: d => CONFIG(d) });
  try { assert.equal(await checkCodexHookTrust(dir, env), null); }
  finally { await rm(dir, { recursive: true, force: true }); await rm(home, { recursive: true, force: true }); }
});

test('훅 소스 신뢰가 없으면 경고하고, 무엇이 없는지 말한다', async () => {
  const { dir, home, env } = await fixture({ config: d => CONFIG(d, { hookSource: false }) });
  try {
    const w = await checkCodexHookTrust(dir, env);
    assert.match(w, /훅 소스 신뢰 없음/);
    assert.doesNotMatch(w, /프로젝트 신뢰·/, '있는 신뢰를 없다고 하지 않는다');
    assert.match(w, /대화형 `codex`/, '사용자가 할 수 있는 행동을 말한다');
  } finally { await rm(dir, { recursive: true, force: true }); await rm(home, { recursive: true, force: true }); }
});

test('둘 다 없으면 둘 다 말한다', async () => {
  const { dir, home, env } = await fixture({ config: d => CONFIG(d, { project: false, hookSource: false }) });
  try { assert.match(await checkCodexHookTrust(dir, env), /프로젝트 신뢰·훅 소스 신뢰 없음/); }
  finally { await rm(dir, { recursive: true, force: true }); await rm(home, { recursive: true, force: true }); }
});

test('codex 설정이 없으면 침묵한다 — codex 를 안 쓰는 프로젝트를 흔들지 않는다', async () => {
  const { dir, home, env } = await fixture({ config: null });
  try { assert.equal(await checkCodexHookTrust(dir, env), null); }
  finally { await rm(dir, { recursive: true, force: true }); await rm(home, { recursive: true, force: true }); }
});

test('훅 파일이 없으면 이 검사의 대상이 아니다', async () => {
  const { dir, home, env } = await fixture({ hooks: false, config: d => CONFIG(d) });
  try { assert.equal(await checkCodexHookTrust(dir, env), null); }
  finally { await rm(dir, { recursive: true, force: true }); await rm(home, { recursive: true, force: true }); }
});

// --- 0.38.3 리뷰 반영: 옛 커맨드를 healthy 로 보고하던 것(P1)과 느슨한 신뢰 매칭(P2) ---

test('P1: --codex-hook 없는 옛 하네스 훅은 healthy 가 아니다', async () => {
  const { codexHooksHaveSessionContext, isLegacyCodexSessionCommand, isHarnessCodexSessionCommand } =
    await import('../src/harness.mjs');
  const legacy = { hooks: { SessionStart: [{ hooks: [{ type: 'command', command: 'harness-team session-context --target "$PWD"' }] }] } };
  const fixed = { hooks: { SessionStart: [{ hooks: [{ type: 'command', command: 'harness-team session-context --codex-hook --target "$PWD"' }] }] } };
  assert.equal(codexHooksHaveSessionContext(legacy), false, '옛 훅은 아무것도 주입하지 않는다 — healthy 로 보고하면 안 된다');
  assert.equal(codexHooksHaveSessionContext(fixed), true);
  assert.equal(isLegacyCodexSessionCommand(legacy.hooks.SessionStart[0].hooks[0].command), true);
  // 사용자가 직접 쓴 훅은 migrate 대상이 아니다 — 이름이 하네스 CLI 가 아니다.
  assert.equal(isLegacyCodexSessionCommand('my-tool session-context'), false);
  assert.equal(isHarnessCodexSessionCommand('my-tool session-context --codex-hook'), false);
});

test('P1: migrate 가 옛 커맨드를 제자리에서 올린다 (사용자 훅은 건드리지 않는다)', async () => {
  const { migrateCodexHookFlag } = await import('../src/commands/migrate.mjs');
  const dir = await mkdtemp(join(tmpdir(), 'harness-codexflag-'));
  const { restore } = captureLogs();
  try {
    await mkdir(join(dir, '.codex'), { recursive: true });
    const mine = { type: 'command', command: 'my-own-hook.sh' };
    await writeFile(join(dir, '.codex/hooks.json'), JSON.stringify({
      hooks: { SessionStart: [
        { hooks: [{ type: 'command', command: 'harness-team session-context --target "$root"', timeout: 10 }] },
        { hooks: [mine] },
      ] },
    }, null, 2));

    assert.equal(await migrateCodexHookFlag({ targetDir: dir, flags: { yes: true } }), true);
    const after = JSON.parse(await readFile(join(dir, '.codex/hooks.json'), 'utf8'));
    assert.equal(after.hooks.SessionStart[0].hooks[0].command,
      'harness-team session-context --codex-hook --target "$root"');
    assert.deepEqual(after.hooks.SessionStart[1].hooks[0], mine, '사용자 훅 불변');

    // 멱등: 두 번째 실행은 바꿀 것이 없다
    assert.equal(await migrateCodexHookFlag({ targetDir: dir, flags: { yes: true } }), false);
  } finally { restore(); await rm(dir, { recursive: true, force: true }); }
});

test('P2: 신뢰 매칭은 **우리 훅의 정확한 키**와 실제 trusted_hash 를 요구한다', () => {
  const p = '/private/tmp/proj';
  const hooksPath = `${p}/.codex/hooks.json`;
  const call = (toml) => parseCodexTrust(toml, { projectPath: p, trustKeys: [`${hooksPath}:session_start:0:0`] });

  // 같은 파일의 **다른 훅 항목**이 아니라 경로 접두가 맞아야 한다 — 접두가 맞으면 인정한다.
  assert.equal(call(`[hooks.state."${hooksPath}:session_start:0:0"]\ntrusted_hash = "sha256:a"`).hookSource, true);
  // 헤더는 있는데 해시가 주석 처리됐다 = 승인 기록이 아니다.
  assert.equal(call(`[hooks.state."${hooksPath}:session_start:0:0"]\n# trusted_hash = "sha256:a"`).hookSource, false);
  // 다른 프로젝트의 훅 파일을 우리 것으로 읽지 않는다.
  assert.equal(call(`[hooks.state."/other/proj/.codex/hooks.json:session_start:0:0"]\ntrusted_hash = "sha256:a"`).hookSource, false);
  // **같은 파일의 다른 훅**이 승인된 것만으로는 우리 훅이 승인된 것이 아니다 (codex 2차 P2).
  assert.equal(call(`[hooks.state."${hooksPath}:session_start:1:0"]\ntrusted_hash = "sha256:a"`).hookSource, false);
  // 주석 처리된 프로젝트 섹션은 신뢰가 아니다.
  assert.equal(call(`# [projects."${p}"]\ntrust_level = "trusted"`).project, false);
});

test('P2(2차): 커맨드 경계와 인자 위치를 지킨다 — 남의 훅과 경로를 건드리지 않는다', async () => {
  const { isLegacyCodexSessionCommand, isHarnessCodexSessionCommand, withCodexHookFlag, harnessCodexTrustKeys } =
    { ...(await import('../src/harness.mjs')), ...(await import('../src/commands/doctor.mjs')) };
  // 토큰 경계: `my-harness-team` 은 남의 훅이다
  assert.equal(isLegacyCodexSessionCommand('my-harness-team session-context --target x'), false);
  // 3차 반영으로 migrate 대상은 **출하 형태**로 좁혀졌다 — 임의 경로의 CLI 호출은 고치지 않고
  // doctor 경고로 남긴다(쓰기는 보수적으로, 판정은 넓게).
  assert.equal(isLegacyCodexSessionCommand('/opt/bin/harness-team session-context --target x'), false);
  // 인자 위치: 경로 조각의 `session-context` 를 치환하지 않는다
  const withPath = 'node "/opt/session-context/bin/harness-team.mjs" session-context --target x';
  assert.equal(withCodexHookFlag(withPath), 'node "/opt/session-context/bin/harness-team.mjs" session-context --codex-hook --target x');
  assert.equal(isHarnessCodexSessionCommand(withCodexHookFlag(withPath)), true, '치환 결과가 healthy 로 읽힌다');
  // 신뢰 키는 하네스 훅의 (group, hook) 위치로 만든다
  const hooks = { hooks: { SessionStart: [
    { hooks: [{ type: 'command', command: 'someone-else.sh' }] },
    { hooks: [{ type: 'command', command: 'harness-team session-context --codex-hook --target x' }] },
  ] } };
  assert.deepEqual(harnessCodexTrustKeys(hooks, '/p/.codex/hooks.json'), ['/p/.codex/hooks.json:session_start:1:0']);
});

test('P2(3차): 옛 훅과 새 훅이 공존하면 **새 훅의** 승인만 센다', async () => {
  const { harnessCodexTrustKeys } = await import('../src/commands/doctor.mjs');
  // init 의 배열 union 이 업그레이드 때 만드는 모양 — 옛 훅(주입 못 함) + 새 훅(주입함).
  const hooks = { hooks: { SessionStart: [
    { hooks: [{ type: 'command', command: 'harness-team session-context --target "$root"' }] },
    { hooks: [{ type: 'command', command: 'harness-team session-context --codex-hook --target "$root"' }] },
  ] } };
  assert.deepEqual(harnessCodexTrustKeys(hooks, '/p/.codex/hooks.json'), ['/p/.codex/hooks.json:session_start:1:0'],
    '옛 훅의 승인으로 새 훅의 미승인이 가려지면 안 된다');
});

test('P2(3차): migrate 는 출하한 적 있는 형태만 고친다 — echo/printf 안의 문자열은 손대지 않는다', async () => {
  const { isLegacyCodexSessionCommand, isHarnessCodexSessionCommand } = await import('../src/harness.mjs');
  assert.equal(isLegacyCodexSessionCommand('echo "harness-team session-context --target x"'), false);
  assert.equal(isLegacyCodexSessionCommand('printf " session-context "; harness-team session-context --target x'), false);
  assert.equal(isLegacyCodexSessionCommand('harness-team session-context --target "$PWD"'), true, '출하 형태는 고친다');
  // 플래그는 독립 토큰일 때만 — 경로 안의 문자열을 플래그로 세지 않는다.
  assert.equal(isHarnessCodexSessionCommand('harness-team session-context --target /work/--codex-hook-repro'), false);
  assert.equal(isLegacyCodexSessionCommand('harness-team session-context --target /work/--codex-hook-repro'), true);
});

// Codex reads project-local `.codex/hooks.json`, so `apply` installs a SessionStart
// hook there. It must behave like the other JSON surfaces (`.claude/settings.json`,
// `.opencode/opencode.json`): deep-merged, not skip-existing. A project that already
// authored its own Codex hooks would otherwise silently receive no harness hook while
// `doctor` still reported the file healthy.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFile, mkdtemp, rm, mkdir, writeFile } from 'node:fs/promises';
import { resolve, dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { tmpdir } from 'node:os';
import { planChanges, applyChanges, codexHooksHaveSessionContext } from '../src/harness.mjs';
import { checkCodexSessionHook } from '../src/commands/doctor.mjs';

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const VARS = {
  projectName: 'demo', stackLabel: 'Node', packageManager: 'npm',
  language: 'ts', cmdInstall: 'npm i', cmdDev: 'npm run dev', cmdTest: 'npm test',
  cmdLint: 'npm run lint', cmdTypecheck: 'npm run tc',
};

const HARNESS_COMMAND_RE = /^harness-team session-context --target /;
const codexChange = (changes) => changes.find(c => c.path.endsWith('.codex/hooks.json'));
const groupCommands = (group) => (group.hooks ?? []).map(h => h.command);

async function sandbox(fn) {
  const dir = await mkdtemp(join(tmpdir(), 'harness-codex-'));
  try { return await fn(dir, { root: ROOT, targetDir: dir, backupDir: null, flags: {} }); }
  finally { await rm(dir, { recursive: true, force: true }); }
}

test('planChanges: 신규 프로젝트에 harness SessionStart 훅을 담은 .codex/hooks.json 생성', async () => {
  await sandbox(async (_dir, ctx) => {
    const { changes } = await planChanges(ctx, { stack: VARS });
    const change = codexChange(changes);
    assert.ok(change, '.codex/hooks.json change 없음');
    assert.equal(change.kind, 'json');
    assert.equal(change.before, null, '신규 프로젝트이므로 before는 null');

    const groups = JSON.parse(change.after).hooks.SessionStart;
    assert.equal(groups.length, 1);
    assert.ok(groups[0].hooks.some(h => HARNESS_COMMAND_RE.test(h.command)),
      `harness 훅 커맨드 없음: ${JSON.stringify(groups[0])}`);
  });
});

// 훅은 Codex 세션의 cwd에서 실행되고 session-context는 --target 없이는 cwd를 프로젝트
// 루트로 간주한다. 하위 디렉터리에서 codex를 띄우면 활성 task를 못 찾으므로, 훅이
// 스스로 저장소 루트로 해석해야 한다.
test('.codex/hooks.json 훅은 cwd가 아니라 저장소 루트를 --target으로 넘긴다', async () => {
  const tpl = JSON.parse(await readFile(join(ROOT, 'templates/.codex/hooks.json'), 'utf8'));
  const [command] = groupCommands(tpl.hooks.SessionStart[0]);
  assert.match(command, /--target "\$\(git rev-parse --show-toplevel 2>\/dev\/null \|\| pwd\)"/,
    'git 루트 해석 없이 cwd에 의존');
  assert.match(command, /\|\| true$/, 'CLI 부재 시 훅이 세션을 막지 않아야 한다');
});

test('planChanges: 사용자가 이미 작성한 .codex/hooks.json에 harness 훅을 병합한다 (건너뛰지 않는다)', async () => {
  await sandbox(async (dir, ctx) => {
    const mine = { type: 'command', command: 'echo MY_OWN_HOOK', timeout: 5 };
    await mkdir(join(dir, '.codex'), { recursive: true });
    await writeFile(join(dir, '.codex/hooks.json'),
      JSON.stringify({ hooks: { SessionStart: [{ hooks: [mine] }] } }, null, 2) + '\n');

    const { changes } = await planChanges(ctx, { stack: VARS });
    const change = codexChange(changes);
    assert.ok(change, '기존 파일이 있으면 건너뛰어 change가 사라지는 회귀');

    const groups = JSON.parse(change.after).hooks.SessionStart;
    assert.ok(groups.some(g => groupCommands(g).includes(mine.command)), '사용자 훅 유실');
    assert.ok(groups.some(g => groupCommands(g).some(c => HARNESS_COMMAND_RE.test(c))), 'harness 훅 미추가');
  });
});

test('planChanges: 이미 적용된 프로젝트를 재적용하면 .codex/hooks.json change가 없다 (멱등)', async () => {
  await sandbox(async (_dir, ctx) => {
    const first = await planChanges(ctx, { stack: VARS });
    await applyChanges(first.changes);
    const second = await planChanges(ctx, { stack: VARS });
    assert.equal(codexChange(second.changes), undefined, '재적용이 매번 change를 만든다');
  });
});

// JSON 유효성만 보면 harness 훅이 빠진 파일도 healthy로 보고된다. 이 상태가 바로
// "Codex 세션이 조용히 task context를 못 받는" 드리프트이므로 내용까지 확인해야 한다.
test('doctor: .codex/hooks.json이 유효한 JSON이어도 harness 훅이 없으면 경고한다', async () => {
  await sandbox(async (dir) => {
    await mkdir(join(dir, '.codex'), { recursive: true });
    await writeFile(join(dir, '.codex/hooks.json'),
      JSON.stringify({ hooks: { SessionStart: [{ hooks: [{ type: 'command', command: 'echo hi' }] }] } }, null, 2));

    const warning = await checkCodexSessionHook(dir);
    assert.match(warning ?? '', /harness SessionStart 훅 없음/);
    assert.match(warning ?? '', /harness-team apply/, '복구 명령을 안내해야 한다');
  });
});

test('doctor: .codex/hooks.json이 없으면 경고하지 않는다 (optional)', async () => {
  await sandbox(async (dir) => {
    assert.equal(await checkCodexSessionHook(dir), null);
  });
});

test('doctor: apply가 설치한 .codex/hooks.json은 경고하지 않는다', async () => {
  await sandbox(async (dir, ctx) => {
    const { changes } = await planChanges(ctx, { stack: VARS });
    await applyChanges(changes);
    assert.equal(await checkCodexSessionHook(dir), null);
  });
});

test('codexHooksHaveSessionContext: 잘못된 모양을 던지지 않고 false로 처리', () => {
  for (const bad of [null, undefined, {}, { hooks: {} }, { hooks: { SessionStart: 'x' } },
    { hooks: { SessionStart: [{}] } }, { hooks: { SessionStart: [{ hooks: [{ type: 'command' }] }] } }]) {
    assert.equal(codexHooksHaveSessionContext(bad), false, JSON.stringify(bad));
  }
});

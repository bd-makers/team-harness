import { test } from 'node:test';
import assert from 'node:assert/strict';
import { mkdtemp, mkdir, readFile, writeFile, rm, access } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { runConfig } from '../src/commands/config.mjs';
import { readConfigStrict, getConfigValue, setConfigValue } from '../src/user-config.mjs';

// `commands/harness-spec.md` 4단계가 산문으로 들고 있던 규칙 — "read-modify-write, 기존 키(`user`) 보존,
// malformed JSON이면 덮어쓰지 말고 중단" — 을 코드가 보장하는지 고정한다. 종전에는 이 규칙이 에이전트의
// 손 실행에 달려 있었고 `tests/agentloop-spec-signals.test.mjs`가 시뮬레이션으로 보존 실패를 채점했다.

const exists = p => access(p).then(() => true, () => false);

async function fixture(configText) {
  const dir = await mkdtemp(join(tmpdir(), 'harness-config-cmd-'));
  if (configText !== undefined) {
    await mkdir(join(dir, '.harness'), { recursive: true });
    await writeFile(join(dir, '.harness/config.json'), configText);
  }
  return dir;
}

async function capture(fn) {
  const logs = [];
  const errs = [];
  const origLog = console.log;
  const origErr = console.error;
  const prevExit = process.exitCode;
  process.exitCode = undefined;
  console.log = (...a) => logs.push(a.join(' '));
  console.error = (...a) => errs.push(a.join(' '));
  try {
    await fn();
    return { logs, errs, exitCode: process.exitCode };
  } finally {
    console.log = origLog;
    console.error = origErr;
    process.exitCode = prevExit;
  }
}

const run = (dir, args, flags = {}) => runConfig({ targetDir: dir, flags, taskArgs: args });

// ---- 순수 경로 함수 ----

test('setConfigValue: 중간 객체를 만들며 경로 하나만 바꾸고 나머지 키는 그대로 둔다', () => {
  const config = { user: 'alice', specSources: { figma: { fileUrl: 'https://f/x' } } };
  setConfigValue(config, 'specSources.confluence.baseUrl', 'https://x/wiki');
  assert.deepEqual(config, {
    user: 'alice',
    specSources: { figma: { fileUrl: 'https://f/x' }, confluence: { baseUrl: 'https://x/wiki' } },
  });
  assert.equal(getConfigValue(config, 'specSources.confluence.baseUrl'), 'https://x/wiki');
  assert.equal(getConfigValue(config, 'specSources.nope.x'), undefined);
});

test('setConfigValue: 중간 세그먼트가 객체가 아니면 덮어쓰지 않고 throw', () => {
  const config = { user: 'alice' };
  assert.throws(() => setConfigValue(config, 'user.x', 'y'), /객체가 아님/);
  assert.deepEqual(config, { user: 'alice' });
});

test('setConfigValue: leaf 가 이미 객체면 덮어쓰지 않고 throw — 하위 키를 조용히 지우지 않는다 (codex P2 3회차)', () => {
  const config = { specSources: { confluence: { baseUrl: 'https://x/wiki', spaceKey: 'P' } } };
  assert.throws(() => setConfigValue(config, 'specSources.confluence', 'replacement'), /객체\(하위 키: baseUrl, spaceKey\)/);
  assert.deepEqual(config, { specSources: { confluence: { baseUrl: 'https://x/wiki', spaceKey: 'P' } } });
});

test('setConfigValue: 프로토타입 오염 세그먼트와 빈 세그먼트를 거부한다', () => {
  for (const key of ['__proto__.polluted', 'constructor.prototype.x', 'a..b', '', 'a.', 'spec sources']) {
    assert.throws(() => setConfigValue({}, key, 'v'), /키 경로/, key);
  }
  assert.equal(({}).polluted, undefined);
});

test('readConfigStrict: 없음은 {} · malformed는 throw (종전 readConfig 두 벌은 둘 다 {}였다)', async () => {
  const missing = await fixture();
  const broken = await fixture('{ "user": "alice", ');
  try {
    assert.deepEqual(await readConfigStrict(missing), {});
    await assert.rejects(readConfigStrict(broken), /malformed/);
  } finally {
    await rm(missing, { recursive: true, force: true });
    await rm(broken, { recursive: true, force: true });
  }
});

// ---- set ----

test('config set: user 를 보존하고 specSources 경로만 갱신하며 2-space JSON + 개행으로 쓴다', async () => {
  const dir = await fixture(JSON.stringify({ user: 'alice' }));
  try {
    const { exitCode } = await capture(() => run(dir, ['set', 'specSources.confluence.baseUrl', 'https://x/wiki']));
    assert.equal(exitCode, undefined);
    const raw = await readFile(join(dir, '.harness/config.json'), 'utf8');
    assert.deepEqual(JSON.parse(raw), { user: 'alice', specSources: { confluence: { baseUrl: 'https://x/wiki' } } });
    assert.equal(raw, JSON.stringify(JSON.parse(raw), null, 2) + '\n');
  } finally { await rm(dir, { recursive: true, force: true }); }
});

test('config set: 파일이 없으면 .harness/ 를 만들고 새로 쓴다 (활성 task 불필요)', async () => {
  const dir = await fixture();
  try {
    await capture(() => run(dir, ['set', 'specSources.figma.fileUrl', 'https://www.figma.com/design/K/n']));
    const cfg = JSON.parse(await readFile(join(dir, '.harness/config.json'), 'utf8'));
    assert.deepEqual(cfg, { specSources: { figma: { fileUrl: 'https://www.figma.com/design/K/n' } } });
  } finally { await rm(dir, { recursive: true, force: true }); }
});

test('config set: 값은 항상 문자열이다 — 숫자처럼 보여도 숫자로 바꾸지 않는다', async () => {
  const dir = await fixture();
  try {
    await capture(() => run(dir, ['set', 'specSources.confluence.spaceKey', '123']));
    const cfg = JSON.parse(await readFile(join(dir, '.harness/config.json'), 'utf8'));
    assert.strictEqual(cfg.specSources.confluence.spaceKey, '123');
  } finally { await rm(dir, { recursive: true, force: true }); }
});

test('config set: malformed JSON 이면 exit 1 + 에러 패킷, 파일 바이트는 그대로다', async () => {
  const broken = '{ "user": "alice", "specSources": { ';
  const dir = await fixture(broken);
  try {
    const { exitCode, logs } = await capture(() => run(dir, ['set', 'specSources.confluence.baseUrl', 'https://x']));
    assert.equal(exitCode, 1);
    assert.equal(await readFile(join(dir, '.harness/config.json'), 'utf8'), broken);
    assert.match(logs.join('\n'), /malformed/);
    assert.match(logs.join('\n'), /^default: /m);
  } finally { await rm(dir, { recursive: true, force: true }); }
});

test('config set: leaf 가 객체면 exit 1 이고 파일은 바뀌지 않는다', async () => {
  const before = JSON.stringify({ specSources: { confluence: { baseUrl: 'https://x' } } }, null, 2) + '\n';
  const dir = await fixture(before);
  try {
    const { exitCode } = await capture(() => run(dir, ['set', 'specSources.confluence', 'x']));
    assert.equal(exitCode, 1);
    assert.equal(await readFile(join(dir, '.harness/config.json'), 'utf8'), before);
  } finally { await rm(dir, { recursive: true, force: true }); }
});

test('config set: 중간 세그먼트가 문자열이면 exit 1 이고 파일은 바뀌지 않는다', async () => {
  const before = JSON.stringify({ user: 'alice' }, null, 2) + '\n';
  const dir = await fixture(before);
  try {
    const { exitCode } = await capture(() => run(dir, ['set', 'user.nested', 'x']));
    assert.equal(exitCode, 1);
    assert.equal(await readFile(join(dir, '.harness/config.json'), 'utf8'), before);
  } finally { await rm(dir, { recursive: true, force: true }); }
});

test('config set: 인자가 모자라거나 키가 부정하면 exit 2 이고 쓰지 않는다', async () => {
  const dir = await fixture();
  try {
    for (const args of [['set'], ['set', 'onlykey'], ['set', '__proto__.x', 'v'], ['set', 'bad key', 'v']]) {
      const { exitCode } = await capture(() => run(dir, args));
      assert.equal(exitCode, 2, args.join(' '));
    }
    assert.equal(await exists(join(dir, '.harness/config.json')), false);
  } finally { await rm(dir, { recursive: true, force: true }); }
});

// ---- get ----

test('config get <key>: 있으면 값, 없으면 (unset) — 둘 다 exit 0 이고 --json 은 present 를 구분한다', async () => {
  const dir = await fixture(JSON.stringify({ user: 'alice', specSources: { confluence: { baseUrl: 'https://x/wiki' } } }));
  try {
    const hit = await capture(() => run(dir, ['get', 'specSources.confluence.baseUrl']));
    assert.equal(hit.exitCode, undefined);
    assert.match(hit.logs.join('\n'), /https:\/\/x\/wiki/);

    const miss = await capture(() => run(dir, ['get', 'specSources.figma.fileUrl']));
    assert.equal(miss.exitCode, undefined);
    assert.match(miss.logs.join('\n'), /\(unset\)/);

    const hitJson = await capture(() => run(dir, ['get', 'specSources.confluence.baseUrl'], { json: true }));
    const hitEnv = JSON.parse(hitJson.logs.join('\n'));
    assert.equal(hitEnv.command, 'config');
    assert.equal(hitEnv.status, 'success');
    assert.equal(hitEnv.present, true);
    assert.equal(hitEnv.value, 'https://x/wiki');

    const missJson = await capture(() => run(dir, ['get', 'specSources.figma.fileUrl'], { json: true }));
    const missEnv = JSON.parse(missJson.logs.join('\n'));
    assert.equal(missEnv.present, false);
    assert.equal(missEnv.value, null);
  } finally { await rm(dir, { recursive: true, force: true }); }
});

test('config get (키 없음): 전체 config 를 낸다 · 파일이 없으면 {}', async () => {
  const dir = await fixture(JSON.stringify({ user: 'alice' }));
  const empty = await fixture();
  try {
    const all = await capture(() => run(dir, ['get'], { json: true }));
    assert.deepEqual(JSON.parse(all.logs.join('\n')).value, { user: 'alice' });
    const none = await capture(() => run(empty, ['get'], { json: true }));
    assert.deepEqual(JSON.parse(none.logs.join('\n')).value, {});
  } finally {
    await rm(dir, { recursive: true, force: true });
    await rm(empty, { recursive: true, force: true });
  }
});

test('config get: malformed 는 get 에서도 exit 1 로 알린다 — 조용히 {} 로 읽지 않는다', async () => {
  const dir = await fixture('{ nope');
  try {
    const { exitCode, logs } = await capture(() => run(dir, ['get', 'user'], { json: true }));
    assert.equal(exitCode, 1);
    const env = JSON.parse(logs.join('\n'));
    assert.equal(env.status, 'error');
    assert.ok(env.error && env.error.root_cause, 'error 패킷이 있어야 한다');
  } finally { await rm(dir, { recursive: true, force: true }); }
});

test('config: 사용법 오류도 --json 이면 envelope 로 답한다 (exit 2, codex P2)', async () => {
  const dir = await fixture();
  try {
    for (const args of [['frobnicate'], ['set', 'onlykey'], ['get', '__proto__.x']]) {
      const { exitCode, logs, errs } = await capture(() => run(dir, args, { json: true }));
      assert.equal(exitCode, 2, args.join(' '));
      assert.equal(errs.length, 0, 'stderr 가 아니라 stdout envelope');
      const env = JSON.parse(logs.join('\n'));
      assert.equal(env.command, 'config');
      assert.equal(env.status, 'error');
      assert.ok(env.error.root_cause);
    }
    assert.equal(await exists(join(dir, '.harness/config.json')), false);
  } finally { await rm(dir, { recursive: true, force: true }); }
});

test('config: 여분 인자는 exit 2 — 인용 안 한 공백 값이 잘린 채 저장되지 않는다 (codex P2 2회차)', async () => {
  const dir = await fixture();
  try {
    const set = await capture(() => run(dir, ['set', 'specSources.confluence.spaceKey', 'MY', 'SPACE']));
    assert.equal(set.exitCode, 2);
    assert.match(set.errs.join('\n'), /여분 인자/);
    assert.equal(await exists(join(dir, '.harness/config.json')), false);
    const get = await capture(() => run(dir, ['get', 'user', 'extra']));
    assert.equal(get.exitCode, 2);
  } finally { await rm(dir, { recursive: true, force: true }); }
});

test('config <action>: 모르는 액션은 exit 2', async () => {
  const dir = await fixture();
  try {
    const { exitCode } = await capture(() => run(dir, ['frobnicate']));
    assert.equal(exitCode, 2);
    const none = await capture(() => run(dir, []));
    assert.equal(none.exitCode, 2);
  } finally { await rm(dir, { recursive: true, force: true }); }
});

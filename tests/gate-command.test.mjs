import { test } from 'node:test';
import assert from 'node:assert/strict';
import { mkdtemp, writeFile, readFile, mkdir, rm, access } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { runGate } from '../src/commands/gate.mjs';

async function fixture(config) {
  const dir = await mkdtemp(join(tmpdir(), 'harness-gate-'));
  await mkdir(join(dir, '.harness'));
  if (config !== undefined) {
    await writeFile(join(dir, '.harness/config.json'), typeof config === 'string' ? config : JSON.stringify(config));
  }
  return dir;
}

async function capture(fn) {
  const logs = [], errs = [];
  const origLog = console.log, origErr = console.error;
  const prevExit = process.exitCode;
  process.exitCode = undefined;
  console.log = (...a) => logs.push(a.join(' '));
  console.error = (...a) => errs.push(a.join(' '));
  try { await fn(); }
  finally { console.log = origLog; console.error = origErr; }
  const exitCode = process.exitCode;
  process.exitCode = prevExit;
  return { logs, errs: errs.join('\n'), exitCode };
}

const gate = (dir, args, flags = {}) => runGate({ targetDir: dir, flags, taskArgs: args });
const exists = p => access(p).then(() => true, () => false);

test('gate commit: 모든 명령이 통과하면 exit 0과 통과 문구', async () => {
  const dir = await fixture({ gates: { commit: ['node -e ""'] } });
  try {
    const r = await capture(() => gate(dir, ['commit']));
    assert.equal(r.exitCode, undefined, r.errs);
    assert.match(r.errs, /커밋 전 검증 실행 중/);
    assert.match(r.errs, /검증 통과/);
  } finally { await rm(dir, { recursive: true, force: true }); }
});

test('gate commit: 첫 실패에서 차단하고 다음 명령은 실행하지 않는다', async () => {
  const dir = await fixture({ gates: { commit: ['node -e "process.exit(3)"', 'node -e "require(\'fs\').writeFileSync(\'ran\', \'\')"'] } });
  try {
    const r = await capture(() => gate(dir, ['commit']));
    assert.equal(r.exitCode, 2);
    assert.match(r.errs, /커밋 게이트 실패: node -e "process.exit\(3\)" \(exit 3\)/);
    assert.equal(await exists(join(dir, 'ran')), false, '두 번째 명령이 돌면 안 된다');
  } finally { await rm(dir, { recursive: true, force: true }); }
});

test('gate commit: 명령을 찾을 수 없으면(127) 설정 오류로 차단한다', async () => {
  const dir = await fixture({ gates: { commit: ['definitely-not-a-cmd-xyz'] } });
  try {
    const r = await capture(() => gate(dir, ['commit']));
    assert.equal(r.exitCode, 2);
    assert.match(r.errs, /설정 오류: 명령을 찾을 수 없습니다 — definitely-not-a-cmd-xyz/);
    assert.match(r.errs, /gate suggest/);
  } finally { await rm(dir, { recursive: true, force: true }); }
});

test('gate commit: gates가 없으면 통과시키고 미설정을 알린다', async () => {
  for (const config of [undefined, { user: 'x' }]) {
    const dir = await fixture(config);
    try {
      const r = await capture(() => gate(dir, ['commit']));
      assert.equal(r.exitCode, undefined, r.errs);
      assert.match(r.errs, /커밋 게이트 미설정/);
    } finally { await rm(dir, { recursive: true, force: true }); }
  }
});

test('gate commit: gates.commit 타입이 틀리거나 config가 깨지면 설정 오류로 차단한다', async () => {
  for (const config of [{ gates: { commit: 'npm test' } }, { gates: { commit: [''] } }, { gates: { commit: [1] } }, '{oops']) {
    const dir = await fixture(config);
    try {
      const r = await capture(() => gate(dir, ['commit']));
      assert.equal(r.exitCode, 2, JSON.stringify(config));
      assert.match(r.errs, /설정 오류/);
      assert.doesNotMatch(r.errs, /\n\s+at /, '스택 트레이스를 노출하지 않는다');
    } finally { await rm(dir, { recursive: true, force: true }); }
  }
});

// 로그 명령: 받은 인수 하나를 한 줄로 append — 인수가 쪼개지면 줄이 늘어난다.
const LOGGER = 'node -e "require(\'fs\').appendFileSync(\'fmt.log\', JSON.stringify(process.argv.slice(1)) + \'\\n\')"';

test('gate format: glob이 맞는 파일에만 명령 끝에 경로를 인수 하나로 붙인다 (공백 경로 포함)', async () => {
  const dir = await fixture({ format: { '*.txt': [LOGGER] } });
  try {
    const spaced = join(dir, 'my "odd" file.txt');
    await writeFile(spaced, 'x');
    await writeFile(join(dir, 'a.md'), 'x');
    const r = await capture(async () => { await gate(dir, ['format', spaced]); await gate(dir, ['format', join(dir, 'a.md')]); });
    assert.equal(r.exitCode, undefined);
    const lines = (await readFile(join(dir, 'fmt.log'), 'utf8')).trim().split('\n');
    assert.deepEqual(lines.map(l => JSON.parse(l)), [[spaced]]);
  } finally { await rm(dir, { recursive: true, force: true }); }
});

test('gate format: 슬래시가 있는 glob은 프로젝트 상대 경로로 맞춘다', async () => {
  const dir = await fixture({ format: { 'src/**/*.txt': [LOGGER] } });
  try {
    await mkdir(join(dir, 'src/a'), { recursive: true });
    await writeFile(join(dir, 'src/a/x.txt'), 'x');
    await writeFile(join(dir, 'top.txt'), 'x');
    await capture(async () => { await gate(dir, ['format', join(dir, 'src/a/x.txt')]); await gate(dir, ['format', join(dir, 'top.txt')]); });
    const lines = (await readFile(join(dir, 'fmt.log'), 'utf8')).trim().split('\n');
    assert.deepEqual(lines.map(l => JSON.parse(l)), [[join(dir, 'src/a/x.txt')]]);
  } finally { await rm(dir, { recursive: true, force: true }); }
});

test('gate format: 프로젝트 밖 파일·없는 파일·깨진 config는 조용히 끝난다', async () => {
  const dir = await fixture({ format: { '*.txt': [LOGGER] } });
  const outside = await mkdtemp(join(tmpdir(), 'harness-gate-out-'));
  try {
    await writeFile(join(outside, 'b.txt'), 'x');
    const r = await capture(async () => {
      await gate(dir, ['format', join(outside, 'b.txt')]);
      await gate(dir, ['format', join(dir, 'missing.txt')]);
    });
    assert.equal(r.exitCode, undefined);
    assert.equal(await exists(join(dir, 'fmt.log')), false);

    await writeFile(join(dir, '.harness/config.json'), '{oops');
    await writeFile(join(dir, 'c.txt'), 'x');
    const broken = await capture(() => gate(dir, ['format', join(dir, 'c.txt')]));
    assert.equal(broken.exitCode, undefined);
    assert.equal(broken.errs, '');
  } finally {
    await rm(dir, { recursive: true, force: true });
    await rm(outside, { recursive: true, force: true });
  }
});

test('gate: 알 수 없는 동사·인수 개수는 usage와 exit 2', async () => {
  const dir = await fixture();
  try {
    for (const args of [[], ['nope'], ['commit', 'x'], ['format']]) {
      const r = await capture(() => gate(dir, args));
      assert.equal(r.exitCode, 2, JSON.stringify(args));
      assert.match(r.errs, /usage: harness-team gate/);
    }
  } finally { await rm(dir, { recursive: true, force: true }); }
});

test('gate suggest --yes: 현재 감지로 gates·format·fingerprint를 기록하고 다른 키는 보존한다', async () => {
  const dir = await fixture({ user: 'hslee' });
  try {
    await writeFile(join(dir, 'package.json'), JSON.stringify({ name: 'x', scripts: { test: 'node --test' } }));
    const r = await capture(() => gate(dir, ['suggest'], { yes: true }));
    assert.equal(r.exitCode, undefined, r.errs);
    assert.match(r.logs.join('\n'), /commit: npm run test/);
    const cfg = JSON.parse(await readFile(join(dir, '.harness/config.json'), 'utf8'));
    assert.equal(cfg.user, 'hslee');
    assert.deepEqual(cfg.gates, { commit: ['npm run test'] });
    assert.deepEqual(cfg.format, {});
    assert.equal(cfg.fingerprint.preset, 'node');
  } finally { await rm(dir, { recursive: true, force: true }); }
});

test('gate suggest --yes: 기존 gates가 있으면 알리고 덮어쓴다', async () => {
  const dir = await fixture({ gates: { commit: ['custom'] } });
  try {
    await writeFile(join(dir, 'package.json'), JSON.stringify({ name: 'x', scripts: { lint: 'eslint .' } }));
    const r = await capture(() => gate(dir, ['suggest'], { yes: true }));
    assert.match(r.logs.join('\n'), /현재 gates\.commit: \["custom"\]/);
    const cfg = JSON.parse(await readFile(join(dir, '.harness/config.json'), 'utf8'));
    assert.deepEqual(cfg.gates, { commit: ['npm run lint'] });
  } finally { await rm(dir, { recursive: true, force: true }); }
});

test('gate suggest: malformed config면 exit 1이고 파일을 건드리지 않는다', async () => {
  const dir = await fixture('{oops');
  try {
    const r = await capture(() => gate(dir, ['suggest'], { yes: true }));
    assert.equal(r.exitCode, 1);
    assert.match(r.errs, /malformed/);
    assert.equal(await readFile(join(dir, '.harness/config.json'), 'utf8'), '{oops');
  } finally { await rm(dir, { recursive: true, force: true }); }
});

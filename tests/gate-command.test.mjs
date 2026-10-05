import { test } from 'node:test';
import assert from 'node:assert/strict';
import { mkdtemp, writeFile, readFile, mkdir, rm, access } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { runGate } from '../src/commands/gate.mjs';

// gates는 팀이 커밋하는 .harness/gates.json 에 산다(config.json은 사용자별 gitignore).
async function fixture(gates) {
  const dir = await mkdtemp(join(tmpdir(), 'harness-gate-'));
  await mkdir(join(dir, '.harness'));
  if (gates !== undefined) {
    await writeFile(join(dir, '.harness/gates.json'), typeof gates === 'string' ? gates : JSON.stringify(gates));
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
  const dir = await fixture({ commit: ['node -e ""'] });
  try {
    const r = await capture(() => gate(dir, ['commit']));
    assert.equal(r.exitCode, undefined, r.errs);
    assert.match(r.errs, /커밋 전 검증 실행 중/);
    assert.match(r.errs, /검증 통과/);
  } finally { await rm(dir, { recursive: true, force: true }); }
});

test('gate commit: 첫 실패에서 차단하고 다음 명령은 실행하지 않는다', async () => {
  const dir = await fixture({ commit: ['node -e "process.exit(3)"', 'node -e "require(\'fs\').writeFileSync(\'ran\', \'\')"'] });
  try {
    const r = await capture(() => gate(dir, ['commit']));
    assert.equal(r.exitCode, 2);
    assert.match(r.errs, /커밋 게이트 실패: node -e "process.exit\(3\)" \(exit 3\)/);
    assert.equal(await exists(join(dir, 'ran')), false, '두 번째 명령이 돌면 안 된다');
  } finally { await rm(dir, { recursive: true, force: true }); }
});

test('gate commit: 명령을 찾을 수 없으면(127) 설정 오류로 차단한다', async () => {
  const dir = await fixture({ commit: ['definitely-not-a-cmd-xyz'] });
  try {
    const r = await capture(() => gate(dir, ['commit']));
    assert.equal(r.exitCode, 2);
    assert.match(r.errs, /설정 오류: 명령을 찾을 수 없습니다 — definitely-not-a-cmd-xyz/);
    assert.match(r.errs, /gate suggest/);
  } finally { await rm(dir, { recursive: true, force: true }); }
});

test('gate commit: gates.json이 없으면 통과시키고 화면에 보이는 systemMessage로 미설정을 알린다', async () => {
  const dir = await fixture();
  try {
    const r = await capture(() => gate(dir, ['commit']));
    assert.equal(r.exitCode, undefined, r.errs);
    // 훅이 exit 0일 때 stderr는 사용자에게 보이지 않는다 — stdout JSON systemMessage가 보이는 채널이다.
    const msg = JSON.parse(r.logs.join('\n'));
    assert.match(msg.systemMessage, /커밋 게이트 미설정/);
    assert.match(msg.systemMessage, /gate suggest/);
  } finally { await rm(dir, { recursive: true, force: true }); }
});

test('gate commit: gates.json 형태가 틀리거나 깨지면 미설정이 아니라 설정 오류로 차단한다', async () => {
  for (const gates of [{ commit: 'npm test' }, { commit: [''] }, { commit: [1] }, {}, { format: {} }, '["npm test"]', 'null', '{oops']) {
    const dir = await fixture(gates);
    try {
      const r = await capture(() => gate(dir, ['commit']));
      assert.equal(r.exitCode, 2, JSON.stringify(gates));
      assert.match(r.errs, /설정 오류/);
      assert.doesNotMatch(r.errs, /\n\s+at /, '스택 트레이스를 노출하지 않는다');
    } finally { await rm(dir, { recursive: true, force: true }); }
  }
});

// 로그 명령: 받은 인수 하나를 한 줄로 append — 인수가 쪼개지면 줄이 늘어난다.
const LOGGER = 'node -e "require(\'fs\').appendFileSync(\'fmt.log\', JSON.stringify(process.argv.slice(1)) + \'\\n\')"';

test('gate format: glob이 맞는 파일에만 명령 끝에 경로를 인수 하나로 붙인다 (공백·따옴표 경로 포함)', async () => {
  const dir = await fixture({ commit: [], format: { '*.txt': [LOGGER] } });
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
  const dir = await fixture({ commit: [], format: { 'src/**/*.txt': [LOGGER] } });
  try {
    await mkdir(join(dir, 'src/a'), { recursive: true });
    await writeFile(join(dir, 'src/a/x.txt'), 'x');
    await writeFile(join(dir, 'top.txt'), 'x');
    await capture(async () => { await gate(dir, ['format', join(dir, 'src/a/x.txt')]); await gate(dir, ['format', join(dir, 'top.txt')]); });
    const lines = (await readFile(join(dir, 'fmt.log'), 'utf8')).trim().split('\n');
    assert.deepEqual(lines.map(l => JSON.parse(l)), [[join(dir, 'src/a/x.txt')]]);
  } finally { await rm(dir, { recursive: true, force: true }); }
});

test('gate format: 프로젝트 밖 파일·없는 파일·깨진 gates.json은 조용히 끝난다', async () => {
  const dir = await fixture({ commit: [], format: { '*.txt': [LOGGER] } });
  const outside = await mkdtemp(join(tmpdir(), 'harness-gate-out-'));
  try {
    await writeFile(join(outside, 'b.txt'), 'x');
    const r = await capture(async () => {
      await gate(dir, ['format', join(outside, 'b.txt')]);
      await gate(dir, ['format', join(dir, 'missing.txt')]);
    });
    assert.equal(r.exitCode, undefined);
    assert.equal(await exists(join(dir, 'fmt.log')), false);

    await writeFile(join(dir, '.harness/gates.json'), '{oops');
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

test('gate suggest --yes: 현재 감지 전체(confirm 항목 포함)를 gates.json에 기록한다', async () => {
  const dir = await fixture();
  try {
    await writeFile(join(dir, 'package.json'), JSON.stringify({ name: 'x', scripts: { lint: 'eslint .', test: 'node --test' } }));
    const r = await capture(() => gate(dir, ['suggest'], { yes: true }));
    assert.equal(r.exitCode, undefined, r.errs);
    assert.match(r.logs.join('\n'), /commit: npm run lint/);
    const gates = JSON.parse(await readFile(join(dir, '.harness/gates.json'), 'utf8'));
    assert.deepEqual(gates.commit, ['npm run lint', 'npm run test']);
    assert.deepEqual(gates.format, {});
    assert.equal(gates.fingerprint.preset, 'node');
    assert.equal(await exists(join(dir, '.harness/config.json')), false, '개인 config는 건드리지 않는다');
  } finally { await rm(dir, { recursive: true, force: true }); }
});

test('gate suggest --yes: 기존 gates.json이 있으면 현재값을 알리고 덮어쓴다', async () => {
  const dir = await fixture({ commit: ['custom'], format: { '*.md': ['x'] } });
  try {
    await writeFile(join(dir, 'package.json'), JSON.stringify({ name: 'x', scripts: { test: 'node --test' } }));
    const r = await capture(() => gate(dir, ['suggest'], { yes: true }));
    assert.match(r.logs.join('\n'), /현재 commit: \["custom"\]/);
    const gates = JSON.parse(await readFile(join(dir, '.harness/gates.json'), 'utf8'));
    assert.deepEqual(gates.commit, ['npm run test']);
    assert.deepEqual(gates.format, {});
  } finally { await rm(dir, { recursive: true, force: true }); }
});

test('gate suggest: gates.json이 깨졌으면 exit 1이고 파일을 건드리지 않는다', async () => {
  const dir = await fixture('{oops');
  try {
    const r = await capture(() => gate(dir, ['suggest'], { yes: true }));
    assert.equal(r.exitCode, 1);
    assert.match(r.errs, /malformed/);
    assert.equal(await readFile(join(dir, '.harness/gates.json'), 'utf8'), '{oops');
  } finally { await rm(dir, { recursive: true, force: true }); }
});

// --- commit 객체 형식(workspace별 목록) — preset-repo-shape ---
import { execFileSync } from 'node:child_process';
import { dirname } from 'node:path';

const git = (dir, ...args) => execFileSync('git', ['-c', 'user.email=t@t', '-c', 'user.name=t', '-c', 'core.hooksPath=/dev/null', ...args], { cwd: dir, stdio: 'pipe' });
const mark = name => `node -e "require('fs').appendFileSync('ran.log', '${name}\\n')"`;

// files are committed as HEAD (unless commitFirst is false), then `after` is applied to the work tree.
async function gitFixture(gates, after = {}, { commitFirst = true } = {}) {
  const dir = await fixture(gates);
  const base = { 'apps/web/src/a.ts': 'a', 'packages/ui/src/b.ts': 'b', 'README.md': '#' };
  for (const [name, body] of Object.entries(base)) {
    await mkdir(dirname(join(dir, name)), { recursive: true });
    await writeFile(join(dir, name), body);
  }
  await writeFile(join(dir, '.gitignore'), 'ran.log\n');
  git(dir, 'init', '-q');
  if (commitFirst) { git(dir, 'add', '-A'); git(dir, 'commit', '-qm', 'base'); }
  for (const [name, body] of Object.entries(after)) {
    await mkdir(dirname(join(dir, name)), { recursive: true });
    await writeFile(join(dir, name), body);
  }
  return dir;
}

const ran = async dir => (await readFile(join(dir, 'ran.log'), 'utf8').catch(() => '')).split('\n').filter(Boolean);
const WS_GATES = { commit: { 'apps/web': [mark('web')], 'packages/*': [mark('pkg')], '.': [mark('root')] } };

test('gate commit 객체: 바뀐 파일이 속한 키의 목록만 실행한다 (작업 트리 수정·untracked 포함)', async () => {
  const dir = await gitFixture(WS_GATES, { 'apps/web/src/a.ts': 'changed', 'packages/ui/src/new.ts': 'untracked' });
  try {
    const r = await capture(() => gate(dir, ['commit']));
    assert.equal(r.exitCode, undefined, r.errs);
    assert.deepEqual(await ran(dir), ['web', 'pkg'], '"."는 다른 키에 다 걸렸으므로 돌지 않는다');
  } finally { await rm(dir, { recursive: true, force: true }); }
});

test('gate commit 객체: 어느 키에도 안 걸린 변경이 있을 때만 "."을 실행한다', async () => {
  const dir = await gitFixture(WS_GATES, { 'README.md': 'root change' });
  try {
    const r = await capture(() => gate(dir, ['commit']));
    assert.equal(r.exitCode, undefined, r.errs);
    assert.deepEqual(await ran(dir), ['root']);
  } finally { await rm(dir, { recursive: true, force: true }); }
});

test('gate commit 객체: 실행할 키가 없으면 아무것도 돌리지 않고 통과한다', async () => {
  const dir = await gitFixture({ commit: { 'apps/web': [mark('web')] } }, { 'README.md': 'x' });
  try {
    const r = await capture(() => gate(dir, ['commit']));
    assert.equal(r.exitCode, undefined, r.errs);
    assert.deepEqual(await ran(dir), []);
    assert.match(r.errs, /바뀐 workspace 없음/);
  } finally { await rm(dir, { recursive: true, force: true }); }
});

test('gate commit 객체: HEAD가 없으면(첫 커밋) 모든 키를 실행한다', async () => {
  const dir = await gitFixture(WS_GATES, {}, { commitFirst: false });
  try {
    const r = await capture(() => gate(dir, ['commit']));
    assert.equal(r.exitCode, undefined, r.errs);
    assert.deepEqual(await ran(dir), ['web', 'pkg', 'root']);
  } finally { await rm(dir, { recursive: true, force: true }); }
});

test('gate commit 객체: 같은 명령은 키가 여럿 걸려도 한 번만, 실패하면 차단한다', async () => {
  const dir = await gitFixture({ commit: { 'apps/web': [mark('same'), 'node -e "process.exit(4)"'], 'packages/*': [mark('same')] } },
    { 'apps/web/src/a.ts': 'x', 'packages/ui/src/b.ts': 'y' });
  try {
    const r = await capture(() => gate(dir, ['commit']));
    assert.equal(r.exitCode, 2);
    assert.match(r.errs, /커밋 게이트 실패: node -e "process.exit\(4\)" \(exit 4\)/);
    assert.deepEqual(await ran(dir), ['same']);
  } finally { await rm(dir, { recursive: true, force: true }); }
});

test('gate commit 객체: 값이 비어 있지 않은 문자열 배열이 아니면 설정 오류로 차단한다', async () => {
  for (const commit of [{ 'apps/web': 'npm test' }, { 'apps/web': [''] }, { '': ['npm test'] }, { 'apps/web': [1] }]) {
    const dir = await fixture({ commit });
    try {
      const r = await capture(() => gate(dir, ['commit']));
      assert.equal(r.exitCode, 2, JSON.stringify(commit));
      assert.match(r.errs, /설정 오류/);
    } finally { await rm(dir, { recursive: true, force: true }); }
  }
});

test('gate suggest --yes: workspace 저장소는 확정 모양으로 workspace별 객체를 기록한다', async () => {
  const dir = await fixture();
  try {
    for (const [name, body] of Object.entries({
      'package.json': { name: 'root', workspaces: ['apps/*'] },
      'apps/a/package.json': { name: 'a', scripts: { start: 'node .', test: 'node --test' } },
      'apps/b/package.json': { name: 'b', scripts: { dev: 'vite', lint: 'eslint .' } },
    })) {
      await mkdir(dirname(join(dir, name)), { recursive: true });
      await writeFile(join(dir, name), JSON.stringify(body));
    }
    const r = await capture(() => gate(dir, ['suggest'], { yes: true }));
    assert.equal(r.exitCode, undefined, r.errs);
    assert.match(r.logs.join('\n'), /저장소 모양: monorepo/);
    const gates = JSON.parse(await readFile(join(dir, '.harness/gates.json'), 'utf8'));
    assert.deepEqual(gates.commit, { 'apps/a': ['cd apps/a && npm run test'], 'apps/b': ['cd apps/b && npm run lint'] });
    assert.equal(gates.fingerprint.shape, 'monorepo');
  } finally { await rm(dir, { recursive: true, force: true }); }
});

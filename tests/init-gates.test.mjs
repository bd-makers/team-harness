import { test } from 'node:test';
import assert from 'node:assert/strict';
import { spawn } from 'node:child_process';
import { mkdtemp, writeFile, readFile, mkdir, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..');
const BIN = join(ROOT, 'bin', 'harness-team.mjs');

async function project(files) {
  const dir = await mkdtemp(join(tmpdir(), 'harness-init-gates-'));
  for (const [name, body] of Object.entries(files)) {
    await mkdir(dirname(join(dir, name)), { recursive: true });
    await writeFile(join(dir, name), typeof body === 'string' ? body : JSON.stringify(body));
  }
  return dir;
}

function initYes(dir) {
  return new Promise((res, rej) => {
    const child = spawn(process.execPath, [BIN, 'init', '--yes'], { cwd: dir, stdio: ['pipe', 'pipe', 'pipe'] });
    let out = '';
    child.stdout.on('data', d => { out += d; });
    child.stderr.on('data', d => { out += d; });
    child.on('error', rej);
    child.on('close', code => res({ code, out }));
    child.stdin.end();
  });
}

const gatesOf = async dir => JSON.parse(await readFile(join(dir, '.harness/gates.json'), 'utf8'));
const config = async dir => JSON.parse(await readFile(join(dir, '.harness/config.json'), 'utf8'));

test('init --yes: 확인 필요 항목(lint)은 추가 제안으로 돌리고 나머지를 팀 파일 gates.json에 기록한다', async () => {
  const dir = await project({
    'package.json': { name: 'x', scripts: { lint: 'eslint .', test: 'node --test' } },
    'tsconfig.json': '{}',
  });
  try {
    const r = await initYes(dir);
    assert.equal(r.code, 0, r.out);
    assert.match(r.out, /커밋 게이트 제안 \(프리셋: node/);
    assert.match(r.out, /추가 제안[\s\S]*npm run lint/);
    const gates = await gatesOf(dir);
    assert.deepEqual(gates.commit, ['npx tsc --noEmit', 'npm run test']);
    assert.deepEqual(gates.format, {});
    assert.equal(gates.fingerprint.preset, 'node');
    const cfg = await config(dir);
    assert.ok(cfg.user, 'username은 개인 config에');
    assert.equal(cfg.gates, undefined, 'gates는 개인 config에 쓰지 않는다');
  } finally { await rm(dir, { recursive: true, force: true }); }
});

test('init --yes: 이미 gates.json이 있으면 제안하지 않고 그대로 둔다', async () => {
  const dir = await project({
    'package.json': { name: 'x', scripts: { test: 'node --test' } },
    '.harness/config.json': { user: 'hslee' },
    '.harness/gates.json': { commit: ['custom'] },
  });
  try {
    const r = await initYes(dir);
    assert.equal(r.code, 0, r.out);
    assert.doesNotMatch(r.out, /커밋 게이트 제안/);
    assert.deepEqual(await gatesOf(dir), { commit: ['custom'] });
  } finally { await rm(dir, { recursive: true, force: true }); }
});

test('init --yes: 감지할 스택이 없으면 빈 목록으로 기록한다', async () => {
  const dir = await project({ 'README.md': '# x' });
  try {
    const r = await initYes(dir);
    assert.equal(r.code, 0, r.out);
    assert.deepEqual((await gatesOf(dir)).commit, []);
  } finally { await rm(dir, { recursive: true, force: true }); }
});

test('init --yes: workspace 저장소는 모양·목록을 보여 주고 workspace별 객체와 확정 모양을 기록한다', async () => {
  const dir = await project({
    'package.json': { name: 'root', private: true, workspaces: ['apps/*', 'packages/*'] },
    'apps/web/package.json': { name: 'web', scripts: { dev: 'vite', test: 'vitest' }, dependencies: { 'react-dom': '19' } },
    'packages/ui/package.json': { name: 'ui', scripts: { test: 'node --test' } },
  });
  try {
    const r = await initYes(dir);
    assert.equal(r.code, 0, r.out);
    assert.match(r.out, /저장소 모양: app-packages \(workspace 2개, 앱 1개\)/);
    const gates = await gatesOf(dir);
    assert.deepEqual(gates.commit, { 'apps/web': ['cd apps/web && npm run test'], 'packages/ui': ['cd packages/ui && npm run test'] });
    assert.equal(gates.fingerprint.shape, 'app-packages');
    assert.deepEqual(gates.fingerprint.workspaces, ['apps/web', 'packages/ui']);
  } finally { await rm(dir, { recursive: true, force: true }); }
});

test('init --yes: workspace 없는 단일 앱은 모양을 출력하지 않고 지문에 shape가 없다', async () => {
  const dir = await project({ 'package.json': { name: 'x', scripts: { test: 'node --test' } } });
  try {
    const r = await initYes(dir);
    assert.equal(r.code, 0, r.out);
    assert.doesNotMatch(r.out, /저장소 모양/);
    assert.equal((await gatesOf(dir)).fingerprint.shape, undefined);
  } finally { await rm(dir, { recursive: true, force: true }); }
});

test('init --yes: RN 앱이 있는 workspace 저장소는 확인 화면에 rules 대상을 보이고 앱 경로로 스코프해 설치한다', async () => {
  const dir = await project({
    'package.json': { name: 'root', private: true, workspaces: ['apps/*'] },
    'apps/mobile/package.json': { name: 'mobile', dependencies: { expo: '52' } },
    'apps/web/package.json': { name: 'web', scripts: { dev: 'vite' } },
  });
  try {
    const r = await initYes(dir);
    assert.equal(r.code, 0, r.out);
    assert.match(r.out, /rules 프리셋:\n  apps\/mobile → react-native rules 4종 \(paths: apps\/mobile\/…\)/);
    const nav = await readFile(join(dir, '.claude/rules/apps-mobile-navigation.md'), 'utf8');
    assert.match(nav, /"apps\/mobile\/app\/\*\*\/\*\.tsx"/);
    await assert.rejects(readFile(join(dir, '.claude/rules/navigation.md'), 'utf8'), '루트에는 접두 없는 사본이 없다');
  } finally { await rm(dir, { recursive: true, force: true }); }
});

function initArgs(dir, args) {
  return new Promise((res, rej) => {
    const child = spawn(process.execPath, [BIN, 'init', ...args], { cwd: dir, stdio: ['pipe', 'pipe', 'pipe'] });
    let out = '';
    child.stdout.on('data', d => { out += d; });
    child.stderr.on('data', d => { out += d; });
    child.on('error', rej);
    child.on('close', code => res({ code, out }));
    child.stdin.end();
  });
}

test('init --yes --shape single: 감지된 workspace 모양을 거절해 단일 배열과 확정 single을 기록한다', async () => {
  const dir = await project({
    'package.json': { name: 'root', private: true, workspaces: ['apps/*'], scripts: { test: 'node --test' } },
    'apps/web/package.json': { name: 'web', scripts: { dev: 'vite', test: 'vitest' } },
  });
  try {
    const r = await initArgs(dir, ['--yes', '--shape', 'single']);
    assert.equal(r.code, 0, r.out);
    assert.match(r.out, /--shape single: 단일 앱으로 처리/);
    const gates = await gatesOf(dir);
    assert.deepEqual(gates.commit, ['npm run test']);
    assert.equal(gates.fingerprint.shape, 'single');
  } finally { await rm(dir, { recursive: true, force: true }); }
});

test('init --shape 에 single 외의 값은 exit 2로 거부하고 아무것도 쓰지 않는다', async () => {
  const dir = await project({ 'package.json': { name: 'x' } });
  try {
    const r = await initArgs(dir, ['--yes', '--shape', 'monorepo']);
    assert.equal(r.code, 2, r.out);
    assert.match(r.out, /--shape 는 single 만/);
    await assert.rejects(readFile(join(dir, '.harness/gates.json'), 'utf8'));
  } finally { await rm(dir, { recursive: true, force: true }); }
});

test('stack --json: repoShape로 init 전에 감지된 모양을 미리 보여 준다(읽기 전용)', async () => {
  const dir = await project({
    'package.json': { name: 'root', private: true, workspaces: ['apps/*'] },
    'apps/web/package.json': { name: 'web', scripts: { dev: 'vite' } },
  });
  try {
    const out = await new Promise((res, rej) => {
      const child = spawn(process.execPath, [BIN, 'stack', '--json'], { cwd: dir, stdio: ['ignore', 'pipe', 'pipe'] });
      let o = '';
      child.stdout.on('data', d => { o += d; });
      child.on('error', rej);
      child.on('close', () => res(o));
    });
    const env = JSON.parse(out);
    assert.equal(env.repoShape.shape, 'app-packages');
    assert.deepEqual(env.repoShape.workspaces.map(w => w.dir), ['apps/web']);
    await assert.rejects(readFile(join(dir, '.harness/gates.json'), 'utf8'), '쓰지 않는다');
  } finally { await rm(dir, { recursive: true, force: true }); }
});

test('리뷰 P3: shape 없는 기존 gates.json이 있는 저장소에 init을 다시 돌리면 모양을 묻지 않고 단일로 둔다', async () => {
  const dir = await project({
    'package.json': { name: 'root', private: true, workspaces: ['apps/*'] },
    'apps/web/package.json': { name: 'web', dependencies: { 'react-dom': '19' } },
    '.harness/gates.json': { commit: ['custom'], fingerprint: { preset: 'node', pm: 'npm', signals: [] } },
  });
  try {
    const r = await initYes(dir);
    assert.equal(r.code, 0, r.out);
    assert.doesNotMatch(r.out, /저장소 모양/);
    assert.deepEqual((await gatesOf(dir)).commit, ['custom']);
  } finally { await rm(dir, { recursive: true, force: true }); }
});

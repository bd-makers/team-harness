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

const config = async dir => JSON.parse(await readFile(join(dir, '.harness/config.json'), 'utf8'));

test('init --yes: 스택 프리셋 제안을 보여 주고 gates·format·fingerprint를 기록한다', async () => {
  const dir = await project({
    'package.json': { name: 'x', scripts: { lint: 'eslint .', test: 'node --test' } },
    'tsconfig.json': '{}',
  });
  try {
    const r = await initYes(dir);
    assert.equal(r.code, 0, r.out);
    assert.match(r.out, /커밋 게이트 제안 \(프리셋: node/);
    const cfg = await config(dir);
    assert.deepEqual(cfg.gates, { commit: ['npx tsc --noEmit', 'npm run lint', 'npm run test'] });
    assert.deepEqual(cfg.format, {});
    assert.equal(cfg.fingerprint.preset, 'node');
    assert.ok(cfg.user, 'username 저장과 함께 기록된다');
  } finally { await rm(dir, { recursive: true, force: true }); }
});

test('init --yes: 이미 gates가 있으면 제안하지 않고 그대로 둔다', async () => {
  const dir = await project({
    'package.json': { name: 'x', scripts: { test: 'node --test' } },
    '.harness/config.json': { user: 'hslee', gates: { commit: ['custom'] } },
  });
  try {
    const r = await initYes(dir);
    assert.equal(r.code, 0, r.out);
    assert.doesNotMatch(r.out, /커밋 게이트 제안/);
    assert.deepEqual((await config(dir)).gates, { commit: ['custom'] });
  } finally { await rm(dir, { recursive: true, force: true }); }
});

test('init --yes: 감지할 스택이 없으면 빈 목록으로 기록한다', async () => {
  const dir = await project({ 'README.md': '# x' });
  try {
    const r = await initYes(dir);
    assert.equal(r.code, 0, r.out);
    assert.deepEqual((await config(dir)).gates, { commit: [] });
  } finally { await rm(dir, { recursive: true, force: true }); }
});

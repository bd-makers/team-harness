// detect-stack reported `language: 'TypeScript'` for any project with a package.json —
// this plugin's own AGENTS.md said TypeScript with zero .ts files — and `--stack <id>`
// discarded everything detection found (every command became "(configure)"). The id
// also went unvalidated, so a typo rendered an AGENTS.md naming a stack nobody knows.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { spawn } from 'node:child_process';
import { mkdtemp, rm, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { detectStack, resolveStack, KNOWN_STACK_IDS } from '../src/detect-stack.mjs';

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const BIN = join(ROOT, 'bin', 'harness-team.mjs');

async function project(files) {
  const dir = await mkdtemp(join(tmpdir(), 'harness-detect-'));
  for (const [name, body] of Object.entries(files)) {
    await writeFile(join(dir, name), typeof body === 'string' ? body : JSON.stringify(body));
  }
  return dir;
}

test('package.json만 있으면 JavaScript, tsconfig.json 또는 typescript 의존성이 있으면 TypeScript', async () => {
  const js = await project({ 'package.json': { name: 'a', scripts: { test: 'node --test' } } });
  const tsconfig = await project({ 'package.json': { name: 'b' }, 'tsconfig.json': '{}' });
  const tsdep = await project({ 'package.json': { name: 'c', devDependencies: { typescript: '5.0.0' } } });
  try {
    assert.equal((await detectStack(js)).language, 'JavaScript');
    assert.equal((await detectStack(tsconfig)).language, 'TypeScript');
    assert.equal((await detectStack(tsdep)).language, 'TypeScript');
  } finally { for (const d of [js, tsconfig, tsdep]) await rm(d, { recursive: true, force: true }); }
});

test('bun.lock(텍스트 lockfile)도 bun으로 감지한다', async () => {
  const dir = await project({ 'package.json': { name: 'a', scripts: { test: 'bun test' } }, 'bun.lock': '{}' });
  try {
    const s = await detectStack(dir);
    assert.equal(s.packageManager, 'bun');
    assert.equal(s.cmdTest, 'bun test');
  } finally { await rm(dir, { recursive: true, force: true }); }
});

test('resolveStack: JS 계열 --stack은 감지된 패키지 매니저·스크립트를 유지한다', async () => {
  const dir = await project({ 'package.json': { name: 'a', scripts: { test: 'vitest', lint: 'eslint .' } } });
  try {
    const s = await resolveStack(dir, 'react');
    assert.equal(s.id, 'react');
    assert.equal(s.stackLabel, 'React');
    assert.equal(s.packageManager, 'npm');
    assert.equal(s.cmdTest, 'npm run test', '명령이 (configure)로 지워지면 안 된다');
    assert.equal(s.cmdLint, 'npm run lint');
    assert.equal(s.language, 'JavaScript');
  } finally { await rm(dir, { recursive: true, force: true }); }
});

test('resolveStack: 감지 결과와 같은 id는 감지 프로필 그대로, python/generic은 정본 프로필', async () => {
  const dir = await project({ 'package.json': { name: 'a', dependencies: { next: '14' }, scripts: { dev: 'next dev' } } });
  try {
    assert.deepEqual(await resolveStack(dir, 'next'), await detectStack(dir));
    const py = await resolveStack(dir, 'python');
    assert.equal(py.id, 'python');
    assert.equal(py.cmdInstall, 'pip install');
    const generic = await resolveStack(dir, 'generic');
    assert.equal(generic.packageManager, '(none)');
  } finally { await rm(dir, { recursive: true, force: true }); }
});

test('init --stack <unknown>은 아무것도 쓰지 않고 exit 2로 거부한다', async () => {
  const dir = await project({ 'package.json': { name: 'a' } });
  try {
    const r = await new Promise((res) => {
      const child = spawn(process.execPath, [BIN, 'init', '--yes', '--no-backup', '--stack', 'reakt'], { cwd: dir, stdio: ['pipe', 'pipe', 'pipe'] });
      let stdout = '', stderr = '';
      child.stdout.on('data', d => { stdout += d; });
      child.stderr.on('data', d => { stderr += d; });
      child.on('close', code => res({ code, stdout, stderr }));
      child.stdin.end();
    });
    assert.equal(r.code, 2, r.stdout + r.stderr);
    assert.match(r.stderr, /unknown --stack "reakt"/);
    assert.match(r.stderr, new RegExp(KNOWN_STACK_IDS.join('\\|')), '허용 목록을 안내한다');
    await assert.rejects(() => import('node:fs/promises').then(fs => fs.access(join(dir, 'AGENTS.md'))), 'AGENTS.md를 쓰기 전에 멈춰야 한다');
  } finally { await rm(dir, { recursive: true, force: true }); }
});

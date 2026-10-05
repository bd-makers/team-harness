import { test } from 'node:test';
import assert from 'node:assert/strict';
import { mkdtemp, writeFile, readFile, mkdir, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { resolveStack } from '../src/detect-stack.mjs';
import { buildProposal, applyProposal, fingerprintDrift } from '../src/presets.mjs';

async function project(files) {
  const dir = await mkdtemp(join(tmpdir(), 'harness-presets-'));
  for (const [name, body] of Object.entries(files)) {
    await writeFile(join(dir, name), typeof body === 'string' ? body : JSON.stringify(body));
  }
  return dir;
}

async function proposalFor(files) {
  const dir = await project(files);
  try { return await buildProposal(dir, await resolveStack(dir)); }
  finally { await rm(dir, { recursive: true, force: true }); }
}

test('node + npm: tsconfig·lint·test 순서로 제안하고 prettier가 없으면 format은 비운다', async () => {
  const p = await proposalFor({
    'package.json': { name: 'x', scripts: { lint: 'eslint .', test: 'node --test', build: 'tsc' } },
    'tsconfig.json': '{}',
  });
  assert.deepEqual(p.gates.commit, ['npx tsc --noEmit', 'npm run lint', 'npm run test']);
  assert.deepEqual(p.format, {});
  assert.equal(p.fingerprint.preset, 'node');
  assert.equal(p.fingerprint.pm, 'npm');
});

test('pnpm lockfile과 prettier 의존성이 있으면 PM 실행 형태가 프리셋 pm 표를 따른다', async () => {
  const p = await proposalFor({
    'package.json': { name: 'x', scripts: { test: 'vitest' }, devDependencies: { prettier: '^3' } },
    'pnpm-lock.yaml': '',
    'tsconfig.json': '{}',
  });
  assert.deepEqual(p.gates.commit, ['pnpm exec tsc --noEmit', 'pnpm run test']);
  assert.deepEqual(p.format, { '*.{ts,tsx,js,jsx,json}': ['pnpm exec prettier --write'] });
});

test('python + pyproject [tool.ruff] → ruff check 와 ruff format', async () => {
  const p = await proposalFor({ 'pyproject.toml': '[project]\nname = "x"\n\n[tool.ruff]\nline-length = 100\n' });
  assert.deepEqual(p.gates.commit, ['ruff check .']);
  assert.deepEqual(p.format, { '*.py': ['ruff format'] });
  assert.equal(p.fingerprint.preset, 'python');
});

test('generic·go 스택은 빈 제안이다', async () => {
  for (const files of [{ 'README.md': '# x' }, { 'go.mod': 'module x\n' }]) {
    const p = await proposalFor(files);
    assert.deepEqual(p.gates.commit, []);
    assert.deepEqual(p.format, {});
    assert.equal(p.fingerprint.preset, 'generic');
  }
});

test('지문: 제안과 무관한 변화는 무시하고 제안을 바꾸는 변화만 잡는다', async () => {
  const before = (await proposalFor({ 'package.json': { scripts: { test: 'x' } } })).fingerprint;
  const buildOnly = (await proposalFor({ 'package.json': { scripts: { test: 'x', build: 'y' } } })).fingerprint;
  assert.equal(fingerprintDrift(before, buildOnly), null);
  const withLint = (await proposalFor({ 'package.json': { scripts: { test: 'x', lint: 'y' } } })).fingerprint;
  assert.match(fingerprintDrift(before, withLint), /\+\{"script":"lint"\}/);
  const pnpm = (await proposalFor({ 'package.json': { scripts: { test: 'x' } }, 'pnpm-lock.yaml': '' })).fingerprint;
  assert.match(fingerprintDrift(before, pnpm), /패키지 매니저 npm → pnpm/);
});

test('applyProposal은 다른 키를 보존하고 malformed config는 거부한다', async () => {
  const dir = await project({});
  try {
    await mkdir(join(dir, '.harness'));
    await writeFile(join(dir, '.harness/config.json'), JSON.stringify({ user: 'hslee' }));
    const proposal = { gates: { commit: ['npm test'] }, format: {}, fingerprint: { preset: 'node', pm: 'npm', signals: [] } };
    await applyProposal(dir, proposal);
    const cfg = JSON.parse(await readFile(join(dir, '.harness/config.json'), 'utf8'));
    assert.deepEqual(cfg, { user: 'hslee', ...proposal });

    await writeFile(join(dir, '.harness/config.json'), '{oops');
    await assert.rejects(() => applyProposal(dir, proposal), /malformed/);
    assert.equal(await readFile(join(dir, '.harness/config.json'), 'utf8'), '{oops');
  } finally { await rm(dir, { recursive: true, force: true }); }
});

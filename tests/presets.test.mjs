import { test } from 'node:test';
import assert from 'node:assert/strict';
import { mkdtemp, writeFile, readFile, mkdir, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { resolveStack } from '../src/detect-stack.mjs';
import { buildProposal, applyProposal, fingerprintDrift, readGates, describeProposal } from '../src/presets.mjs';

async function project(files) {
  const dir = await mkdtemp(join(tmpdir(), 'harness-presets-'));
  for (const [name, body] of Object.entries(files)) {
    await writeFile(join(dir, name), typeof body === 'string' ? body : JSON.stringify(body));
  }
  return dir;
}

async function proposalFor(files, opts) {
  const dir = await project(files);
  try { return await buildProposal(dir, await resolveStack(dir), opts); }
  finally { await rm(dir, { recursive: true, force: true }); }
}

test('node + npm: tsconfig·lint·test 순서로 제안하고 prettier가 없으면 format은 비운다', async () => {
  const p = await proposalFor({
    'package.json': { name: 'x', scripts: { lint: 'eslint .', test: 'node --test', build: 'tsc' } },
    'tsconfig.json': '{}',
  });
  assert.deepEqual(p.commit, ['npx tsc --noEmit', 'npm run lint', 'npm run test']);
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
  assert.deepEqual(p.commit, ['pnpm exec tsc --noEmit', 'pnpm run test']);
  assert.deepEqual(p.format, { '*.{ts,tsx,js,jsx,json}': ['pnpm exec prettier --write'] });
});

test('python + pyproject [tool.ruff] → ruff check 와 ruff format', async () => {
  const p = await proposalFor({ 'pyproject.toml': '[project]\nname = "x"\n\n[tool.ruff]\nline-length = 100\n' });
  assert.deepEqual(p.commit, ['ruff check .']);
  assert.deepEqual(p.format, { '*.py': ['ruff format'] });
  assert.equal(p.fingerprint.preset, 'python');
});

test('generic·go 스택은 빈 제안이다', async () => {
  for (const files of [{ 'README.md': '# x' }, { 'go.mod': 'module x\n' }]) {
    const p = await proposalFor(files);
    assert.deepEqual(p.commit, []);
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

test('unattended(--yes): confirm 표시 항목은 빼고 추가 제안으로 돌리며 지문에서도 뺀다', async () => {
  const files = { 'package.json': { name: 'x', scripts: { lint: 'eslint .', test: 'node --test' } }, 'tsconfig.json': '{}' };
  const p = await proposalFor(files, { unattended: true });
  assert.deepEqual(p.commit, ['npx tsc --noEmit', 'npm run test']);
  assert.deepEqual(p.deferred, ['npm run lint']);
  assert.match(describeProposal(p), /추가 제안.*gate suggest.*\n.*npm run lint/s);
  const full = await proposalFor(files);
  assert.deepEqual(full.deferred, []);
  assert.match(fingerprintDrift(p.fingerprint, full.fingerprint), /\+\{"script":"lint"\}/,
    '빠진 항목은 doctor 지문 비교에서 다시 드러나야 한다');
});

test('applyProposal은 팀 파일 .harness/gates.json에 commit·format·fingerprint만 쓴다', async () => {
  const dir = await project({});
  try {
    const proposal = { commit: ['npm test'], format: {}, fingerprint: { preset: 'node', pm: 'npm', signals: [] }, deferred: ['npm run lint'] };
    await applyProposal(dir, proposal);
    const gates = JSON.parse(await readFile(join(dir, '.harness/gates.json'), 'utf8'));
    assert.deepEqual(gates, { commit: ['npm test'], format: {}, fingerprint: proposal.fingerprint });
    assert.deepEqual(await readGates(dir), gates);
  } finally { await rm(dir, { recursive: true, force: true }); }
});

test('readGates: 없으면 null, 깨졌거나 최상위가 객체가 아니면 throw', async () => {
  const dir = await project({});
  try {
    assert.equal(await readGates(dir), null);
    await mkdir(join(dir, '.harness'));
    for (const body of ['{oops', '[]', '"x"', 'null']) {
      await writeFile(join(dir, '.harness/gates.json'), body);
      await assert.rejects(() => readGates(dir), /gates\.json 이 malformed/, body);
    }
  } finally { await rm(dir, { recursive: true, force: true }); }
});

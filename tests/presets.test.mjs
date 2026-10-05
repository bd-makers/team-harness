import { test } from 'node:test';
import assert from 'node:assert/strict';
import { mkdtemp, writeFile, readFile, mkdir, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join, dirname } from 'node:path';
import { resolveStack } from '../src/detect-stack.mjs';
import { buildProposal, applyProposal, fingerprintDrift, readGates, describeProposal } from '../src/presets.mjs';
import { detectRepoShape } from '../src/repo-shape.mjs';

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

// --- 저장소 모양(workspace) 제안 — preset-repo-shape ---
async function repoWith(files) {
  const dir = await mkdtemp(join(tmpdir(), 'harness-presets-ws-'));
  for (const [name, body] of Object.entries(files)) {
    await mkdir(dirname(join(dir, name)), { recursive: true });
    await writeFile(join(dir, name), typeof body === 'string' ? body : JSON.stringify(body));
  }
  return dir;
}

async function wsProposal(files, opts = {}) {
  const dir = await repoWith(files);
  try {
    const shape = await detectRepoShape(dir);
    return await buildProposal(dir, await resolveStack(dir), { shape, ...opts });
  } finally { await rm(dir, { recursive: true, force: true }); }
}

const WS_FILES = {
  'package.json': { name: 'root', private: true, workspaces: ['apps/*', 'packages/*'], scripts: { start: 'node server.js', test: 'node --test' } },
  'apps/web/package.json': { name: 'web', scripts: { dev: 'vite', test: 'vitest' } },
  'apps/web/tsconfig.json': '{}',
  'packages/ui/package.json': { name: 'ui', scripts: { lint: 'eslint .' } },
  'packages/empty/package.json': { name: 'empty' },
};

test('workspace + 도구 없음: workspace별 cd 목록 객체, 루트 앱은 ".", 명령 없는 workspace는 키가 없다', async () => {
  const p = await wsProposal(WS_FILES);
  assert.deepEqual(p.commit, {
    '.': ['npm run test'],
    'apps/web': ['cd apps/web && npx tsc --noEmit', 'cd apps/web && npm run test'],
    'packages/ui': ['cd packages/ui && npm run lint'],
  });
  assert.equal(p.fingerprint.shape, 'monorepo');
  assert.deepEqual(p.fingerprint.workspaces, ['.', 'apps/web', 'packages/empty', 'packages/ui']);
  assert.ok(p.fingerprint.signals.includes('apps/web:{"file":"tsconfig.json"}'), p.fingerprint.signals.join(' | '));
  assert.match(describeProposal(p), /모양: monorepo[\s\S]*commit \[apps\/web\]: cd apps\/web && npx tsc --noEmit/);
});

test('workspace + unattended: confirm 항목은 workspace 접두로 추가 제안에 남는다', async () => {
  const p = await wsProposal(WS_FILES, { unattended: true });
  assert.equal(p.commit['packages/ui'], undefined);
  assert.deepEqual(p.deferred, ['packages/ui: cd packages/ui && npm run lint']);
});

test('turbo.json이 있으면 정의된 task만 위임 명령 하나로 제안하고, unattended면 추가 제안으로 돌린다', async () => {
  const files = { ...WS_FILES, 'turbo.json': JSON.stringify({ tasks: { lint: {}, test: { dependsOn: ['^build'] }, build: {} } }) };
  const p = await wsProposal(files);
  assert.deepEqual(p.commit, ['npx turbo run lint test --filter=...[HEAD]']);
  const yes = await wsProposal(files, { unattended: true });
  assert.deepEqual(yes.commit, []);
  assert.deepEqual(yes.deferred, ['npx turbo run lint test --filter=...[HEAD]']);
});

test('nx.json이 있으면 nx affected --base=HEAD로 위임한다(target 없는 프로젝트는 nx가 건너뛴다)', async () => {
  const p = await wsProposal({ ...WS_FILES, 'nx.json': '{}', 'pnpm-lock.yaml': '' });
  assert.deepEqual(p.commit, ['pnpm exec nx affected -t lint typecheck test --base=HEAD']);
});

test('거절해 single로 확정하면 명령은 단일과 같고 지문에만 shape: single이 남는다', async () => {
  const dir = await repoWith(WS_FILES);
  try {
    const stack = await resolveStack(dir);
    const plain = await buildProposal(dir, stack);
    const rejected = await buildProposal(dir, stack, { shape: { shape: 'single', workspaces: [] } });
    assert.deepEqual(rejected.commit, plain.commit);
    assert.equal(plain.fingerprint.shape, undefined, 'workspace가 감지되지 않은 단일 지문은 형태가 그대로다');
    assert.equal(rejected.fingerprint.shape, 'single');
  } finally { await rm(dir, { recursive: true, force: true }); }
});

test('지문 drift: workspace 집합 변화는 잡고, 앱 수만 바뀐 모양 이름 변화는 무시한다', async () => {
  const base = { preset: 'node', pm: 'npm', shape: 'app-packages', workspaces: ['apps/web', 'packages/ui'], signals: [] };
  assert.equal(fingerprintDrift(base, { ...base, shape: 'monorepo' }), null);
  assert.match(fingerprintDrift(base, { ...base, workspaces: ['apps/web', 'apps/admin', 'packages/ui'] }), /\+workspace apps\/admin/);
  assert.match(fingerprintDrift(base, { preset: 'node', pm: 'npm', signals: [] }), /모양 app-packages → single/);
});

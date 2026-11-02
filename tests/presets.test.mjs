import { test } from 'node:test';
import assert from 'node:assert/strict';
import { mkdtemp, writeFile, readFile, mkdir, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { resolveStack } from '../src/detect-stack.mjs';
import { buildProposal, applyProposal, fingerprintDrift, readGates, describeProposal, detectInstallTrace, detectDeclarations, declarationHints, holds, loadPresets } from '../src/presets.mjs';
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
  'package.json': { name: 'root', private: true, workspaces: ['apps/*', 'packages/*'], scripts: { start: 'node server.js', test: 'node --test' }, dependencies: { 'react-dom': '19' } },
  'apps/web/package.json': { name: 'web', scripts: { dev: 'vite', test: 'vitest' }, dependencies: { 'react-dom': '19' } },
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
  // --yes(사람이 보지 않음): 위임 명령은 추가 제안으로만, 게이트는 예전 훅이 돌리던 루트 목록을 유지한다(리뷰 P2-2).
  const yes = await wsProposal({ ...files, 'tsconfig.json': '{}' }, { unattended: true });
  assert.deepEqual(yes.commit, ['npx tsc --noEmit', 'npm run test']);
  assert.deepEqual(yes.deferred, ['npx turbo run lint test --filter=...[HEAD]']);
  assert.equal(yes.fingerprint.shape, 'monorepo');
  assert.match(fingerprintDrift(yes.fingerprint, (await wsProposal({ ...files, 'tsconfig.json': '{}' })).fingerprint), /\+\{"file":"turbo\.json"\}/,
    '확정 전 위임은 doctor 지문 비교에서 다시 드러난다');
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

// Q5(D12 정정)의 설치 축: lockfile이 선언한 설치의 흔적이 디스크에 있는가. 의존성 0개 표는 2026-11-03 실측이다 —
// npm만 0개면 node_modules를 만들지 않아 `"node_modules/` 키로 가드하고, poetry는 venv가 저장소 밖이라 판정하지 않는다.
test('detectInstallTrace: pm의 lockfile이 선언한 설치 흔적을 present·absent로, 판정 규칙이 없으면 null로 돌려준다', async () => {
  const pkg = { 'package.json': { name: 'a' } };
  const npmLock = { lockfileVersion: 3, packages: { '': { name: 'a' }, 'node_modules/left-pad': { version: '1.3.0' } } };
  const absent = (lockfile, trace = ['node_modules']) => ({ state: 'absent', lockfile, trace });
  const present = (lockfile, trace = ['node_modules']) => ({ state: 'present', lockfile, trace });
  const berry = ['.yarn/install-state.gz', '.pnp.cjs', 'node_modules'];
  const cases = [
    ['npm 미설치', { ...pkg, 'package-lock.json': npmLock }, absent('package-lock.json')],
    ['npm 설치', { ...pkg, 'package-lock.json': npmLock, 'node_modules/.package-lock.json': '{}' }, present('package-lock.json')],
    ['npm 의존성 0개', { ...pkg, 'package-lock.json': { lockfileVersion: 3, packages: { '': { name: 'a' } } } }, null],
    ['pnpm 미설치', { ...pkg, 'pnpm-lock.yaml': "lockfileVersion: '9.0'\n" }, absent('pnpm-lock.yaml')],
    ['yarn classic 미설치', { ...pkg, 'yarn.lock': '# yarn lockfile v1\n' }, absent('yarn.lock')],
    ['yarn berry 미설치', { ...pkg, 'yarn.lock': '__metadata:\n  version: 8\n' }, absent('yarn.lock', berry)],
    ['yarn berry PnP', { ...pkg, 'yarn.lock': '__metadata:\n  version: 8\n', '.pnp.cjs': '' }, present('yarn.lock', berry)],
    ['bun 미설치', { ...pkg, 'bun.lock': '{}' }, absent('bun.lock')],
    ['bun.lockb만', { ...pkg, 'bun.lockb': '' }, null],
    ['lockfile 없음', pkg, null],
    ['uv 미설치', { 'pyproject.toml': '[project]\nname = "a"\n', 'uv.lock': 'version = 1\n' }, absent('uv.lock', ['.venv'])],
    ['uv 설치', { 'pyproject.toml': '[project]\nname = "a"\n', 'uv.lock': 'version = 1\n', '.venv/pyvenv.cfg': '' }, present('uv.lock', ['.venv'])],
    ['poetry', { 'pyproject.toml': '[project]\nname = "a"\n', 'poetry.lock': '' }, null],
    ['pip', { 'pyproject.toml': '[project]\nname = "a"\n' }, null],
  ];
  for (const [label, files, expected] of cases) {
    const dir = await repoWith(files);
    try {
      assert.deepEqual(await detectInstallTrace(dir, await resolveStack(dir)), expected, label);
    } finally { await rm(dir, { recursive: true, force: true }); }
  }
});

// D12 정정 역할 ①(빈칸 보고)의 적용 조건 "의존성을 선언했는가". fileContains로는 셋을 다 가를 수 없다 —
// 압축 JSON(pnpm이 유지), 빈 {}(e2e bare-node), 키 없음(npm 11.9.0이 마지막 의존성을 지울 때·이 저장소).
test('holds nonEmptyKey: JSON 최상위 키가 비어 있지 않을 때만 성립한다 (압축·빈 값·키 없음·깨진 파일)', async () => {
  const cond = { nonEmptyKey: ['package.json', 'dependencies'] };
  const cases = [
    ['압축 JSON, 의존성 1개', '{"name":"a","dependencies":{"x":"1"}}', true],
    ['빈 객체', '{"name":"a","dependencies":{}}', false],
    ['키 없음', '{"name":"a"}', false],
    ['빈 배열', '{"dependencies":[]}', false],
    ['배열 1개', '{"dependencies":["x"]}', true],
    ['빈 문자열', '{"dependencies":""}', false],
    ['깨진 JSON', '{"dependencies":', false],
    ['최상위 null', 'null', false],
  ];
  for (const [label, body, expected] of cases) {
    const dir = await project({ 'package.json': body });
    try { assert.equal(await holds(dir, null, cond), expected, label); }
    finally { await rm(dir, { recursive: true, force: true }); }
  }
  const empty = await project({});
  try { assert.equal(await holds(empty, null, cond), false, '파일 없음'); }
  finally { await rm(empty, { recursive: true, force: true }); }
});

// Q1 런타임 버전·Q2 lockfile·Q4 bootstrap은 묻는 질문이면 빈칸을 보고하고, Q3는 답이 있을 때만 경로를 가리킨다.
// 의존성을 선언하지 않은 저장소에는 Q2·Q4를 묻지 않는다(null). 경로만 싣고 내용은 옮기지 않는다.
test('detectDeclarations: 질문마다 답한 선언의 경로·빈칸·해당 없음(null)을 돌려준다', async () => {
  const q = (question, ...paths) => ({ question, state: paths.length ? 'declared' : 'blank', paths });
  const fmt = body => JSON.stringify(body, null, 2);
  const npmLock = { lockfileVersion: 3, packages: { '': { name: 'a' } } };
  const uvDeps = '[project]\nname = "a"\nrequires-python = ">=3.12"\ndependencies = [\n    "httpx",\n]\n';
  const cases = [
    ['node 의존성 있음·선언 없음', { 'package.json': { name: 'a', devDependencies: { vitest: '3' } } },
      { runtimeVersion: q('Q1'), lockfile: q('Q2'), serviceFiles: null, bootstrap: q('Q4') }],
    ['node 빈 dependencies {}', { 'package.json': fmt({ name: 'a', dependencies: {} }) },
      { runtimeVersion: q('Q1'), lockfile: null, serviceFiles: null, bootstrap: null }],
    ['node 전부 답함', {
      'package.json': { name: 'a', engines: { node: '>=22' }, dependencies: { x: '1' } }, '.nvmrc': '22\n',
      'package-lock.json': npmLock, 'compose.yaml': 'services: {}\n', '.env.example': 'API_KEY=\n',
    }, {
      runtimeVersion: q('Q1', '.nvmrc', 'package.json'), lockfile: q('Q2', 'package-lock.json'),
      serviceFiles: q('Q3', 'compose.yaml', '.env.example'), bootstrap: q('Q4', 'package-lock.json'),
    }],
    ['node bun.lockb만 — lockfile은 있고 frozen bootstrap 규칙은 없다', {
      'package.json': { name: 'a', dependencies: { x: '1' } }, 'bun.lockb': '',
    }, { runtimeVersion: q('Q1'), lockfile: q('Q2', 'bun.lockb'), serviceFiles: null, bootstrap: q('Q4') }],
    ['node setup 스크립트·.tool-versions', {
      'package.json': { name: 'a', dependencies: { x: '1' }, scripts: { setup: './setup.sh' } }, '.tool-versions': 'nodejs 22.1.0\n',
    }, { runtimeVersion: q('Q1', '.tool-versions'), lockfile: q('Q2'), serviceFiles: null, bootstrap: q('Q4', 'package.json') }],
    ['python uv', { 'pyproject.toml': uvDeps, 'uv.lock': 'version = 1\n', '.devcontainer/devcontainer.json': '{}' },
      { runtimeVersion: q('Q1', 'pyproject.toml'), lockfile: q('Q2', 'uv.lock'),
        serviceFiles: q('Q3', '.devcontainer/devcontainer.json'), bootstrap: q('Q4', 'uv.lock') }],
    ['python uv init 직후(dependencies = [])', { 'pyproject.toml': '[project]\nname = "a"\ndependencies = []\n', '.python-version': '3.12\n' },
      { runtimeVersion: q('Q1', '.python-version'), lockfile: null, serviceFiles: null, bootstrap: null }],
    ['python pip 고정 requirements', { 'pyproject.toml': '[project]\nname = "a"\n', 'requirements.txt': 'httpx==0.28.1\n' },
      { runtimeVersion: q('Q1'), lockfile: q('Q2', 'requirements.txt'), serviceFiles: null, bootstrap: q('Q4') }],
    ['go — declare 없는 프리셋', { 'go.mod': 'module x\n\ngo 1.23\n' }, null],
    ['manifest 없음(generic)', { 'README.md': '# x\n' }, null],
  ];
  for (const [label, files, expected] of cases) {
    const dir = await repoWith(files);
    try { assert.deepEqual(await detectDeclarations(dir, await resolveStack(dir)), expected, label); }
    finally { await rm(dir, { recursive: true, force: true }); }
  }
});

// 의존성 0개·lockfile 없는 이 저장소는 Q2·Q4를 묻지 않고, Q1은 package.json의 engines가 답한다(오탐 0).
test('detectDeclarations: 이 저장소는 Q1만 묻고 package.json(engines)이 답한다', async () => {
  const root = dirname(dirname(fileURLToPath(import.meta.url)));
  assert.deepEqual(await detectDeclarations(root, await resolveStack(root)), {
    runtimeVersion: { question: 'Q1', state: 'declared', paths: ['package.json'] },
    lockfile: null, serviceFiles: null, bootstrap: null,
  });
});

test('declarationHints: 빈칸을 채울 수 있는 선언 후보를 키까지 가리키고, Q4는 pm의 bootstrap 규칙 lockfile을 앞에 둔다', async () => {
  const dir = await repoWith({ 'package.json': { name: 'a' } });
  try {
    const hints = await declarationHints(await resolveStack(dir));
    assert.deepEqual(hints.runtimeVersion,
      ['.nvmrc', '.node-version', '.tool-versions', 'mise.toml', '.mise.toml', 'package.json#engines', 'package.json#devEngines', 'package.json#volta']);
    assert.equal(hints.bootstrap[0], 'package-lock.json');
    assert.ok(hints.bootstrap.includes('package.json#scripts.setup'));
  } finally { await rm(dir, { recursive: true, force: true }); }
});

// D12: `.env.*`는 읽지 않는다 — 경로 존재(`file`)만 본다. 어떤 프리셋 조건도 `.env`로 시작하는 파일의 내용을 읽지 않는다.
test('프리셋 가드: .env* 파일 내용을 읽는 조건(fileContains·nonEmptyKey)이 없다', async () => {
  const readers = [];
  const walk = (node) => {
    if (Array.isArray(node)) { node.forEach(walk); return; }
    if (!node || typeof node !== 'object') return;
    for (const kind of ['fileContains', 'nonEmptyKey']) {
      if (Array.isArray(node[kind]) && /^\.env/.test(node[kind][0])) readers.push(`${kind}:${node[kind][0]}`);
    }
    Object.values(node).forEach(walk);
  };
  const presets = await loadPresets();
  presets.forEach(walk);
  assert.deepEqual(readers, []);
  const envFiles = presets.flatMap(p => p.env?.declare?.serviceFiles ?? []).filter(c => /^\.env/.test(c.file ?? ''));
  assert.ok(envFiles.length > 0, '환경 변수 계약 파일은 존재로만 선언된다');
});

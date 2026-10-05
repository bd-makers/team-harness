import { test } from 'node:test';
import assert from 'node:assert/strict';
import { mkdtemp, writeFile, mkdir, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join, dirname } from 'node:path';
import { detectRepoShape } from '../src/repo-shape.mjs';

// files: { 'apps/web/package.json': {...} } — nested paths are created as needed.
async function repo(files) {
  const dir = await mkdtemp(join(tmpdir(), 'harness-shape-'));
  for (const [name, body] of Object.entries(files)) {
    await mkdir(dirname(join(dir, name)), { recursive: true });
    await writeFile(join(dir, name), typeof body === 'string' ? body : JSON.stringify(body));
  }
  return dir;
}

async function shapeOf(files) {
  const dir = await repo(files);
  try { return await detectRepoShape(dir); }
  finally { await rm(dir, { recursive: true, force: true }); }
}

const brief = s => ({ shape: s.shape, workspaces: s.workspaces.map(w => `${w.dir}:${w.kind}:${w.stackId}`) });

test('workspace 원천이 없으면 single — 루트가 앱이어도 workspace로 세지 않는다', async () => {
  const s = await shapeOf({ 'package.json': { name: 'x', scripts: { dev: 'vite' } } });
  assert.deepEqual(brief(s), { shape: 'single', workspaces: [] });
});

test('npm workspaces 배열: 앱 하나 + 패키지 → app-packages, kind는 앱 조건(dev 스크립트)으로 정한다', async () => {
  const s = await shapeOf({
    'package.json': { name: 'root', private: true, workspaces: ['apps/*', 'packages/*'] },
    'apps/web/package.json': { name: 'web', scripts: { dev: 'next dev' }, dependencies: { next: '15' } },
    'packages/ui/package.json': { name: 'ui', main: 'index.js' },
    'packages/notes/README.md': '# package.json 없는 디렉터리는 workspace가 아니다',
  });
  assert.deepEqual(brief(s), { shape: 'app-packages', workspaces: ['apps/web:app:next', 'packages/ui:package:node'] });
});

test('pnpm-workspace.yaml 앱 둘 → monorepo, 따옴표·주석·부정 패턴을 해석한다', async () => {
  const s = await shapeOf({
    'package.json': { name: 'root', private: true },
    'pnpm-workspace.yaml': "packages:\n  - 'apps/*'   # apps\n  - \"packages/*\"\n  - '!packages/legacy'\ncatalog:\n  react: ^19\n",
    'apps/mobile/package.json': { name: 'mobile', dependencies: { expo: '52', 'react-native': '0.76' } },
    'apps/web/package.json': { name: 'web', scripts: { start: 'node server.js' } },
    'packages/ui/package.json': { name: 'ui', exports: './index.js', devDependencies: { 'react-native': '0.76' } },
    'packages/legacy/package.json': { name: 'legacy' },
  });
  assert.deepEqual(brief(s), {
    shape: 'monorepo',
    workspaces: ['apps/mobile:app:react-native', 'apps/web:app:node', 'packages/ui:package:react-native'],
  });
});

test('workspaces 객체 형식({packages}) + 루트 앱 → 루트는 "." 앱 workspace로 세고 앱 수에 들어간다', async () => {
  const s = await shapeOf({
    'package.json': { name: 'app', workspaces: { packages: ['./packages/*'] }, dependencies: { expo: '52' } },
    'packages/ui/package.json': { name: 'ui' },
  });
  assert.deepEqual(brief(s), { shape: 'app-packages', workspaces: ['.:app:react-native', 'packages/ui:package:node'] });
});

test('루트 앱 + apps/web 앱 → monorepo', async () => {
  const s = await shapeOf({
    'package.json': { name: 'app', workspaces: ['apps/*'], scripts: { start: 'expo start' } },
    'apps/web/package.json': { name: 'web', scripts: { dev: 'vite' } },
  });
  assert.equal(s.shape, 'monorepo');
});

test('node_modules·점 디렉터리는 훑지 않는다, ** 패턴은 깊은 workspace도 찾는다', async () => {
  const s = await shapeOf({
    'package.json': { name: 'root', workspaces: ['**'] },
    'node_modules/dep/package.json': { name: 'dep' },
    '.cache/x/package.json': { name: 'x' },
    'libs/core/util/package.json': { name: 'util' },
  });
  assert.deepEqual(brief(s), { shape: 'app-packages', workspaces: ['libs/core/util:package:node'] });
});

test('패턴이 있어도 package.json 가진 디렉터리가 없으면 single', async () => {
  const s = await shapeOf({ 'package.json': { name: 'root', workspaces: ['apps/*'] }, 'apps/README.md': '#' });
  assert.deepEqual(brief(s), { shape: 'single', workspaces: [] });
});

// --- 확인 흐름(resolveShape) ---
import { resolveShape, describeShape } from '../src/repo-shape.mjs';

const MONO = {
  'package.json': { name: 'root', workspaces: ['apps/*'] },
  'apps/web/package.json': { name: 'web', scripts: { dev: 'vite' } },
  'apps/mobile/package.json': { name: 'mobile', dependencies: { expo: '52' } },
};

async function resolved(files, opts) {
  const dir = await repo(files);
  const asked = [];
  try {
    const shape = await resolveShape(dir, { ...opts, confirmFn: async q => { asked.push(q); return opts.answer; } });
    return { shape, asked };
  } finally { await rm(dir, { recursive: true, force: true }); }
}

test('resolveShape: workspace가 없으면 묻지 않고 null(단일 — 종전 경로)', async () => {
  const r = await resolved({ 'package.json': { name: 'x' } }, { answer: true });
  assert.equal(r.shape, null);
  assert.deepEqual(r.asked, []);
});

test('resolveShape: 수락하면 감지 결과, 거절하면 확정 single, --yes면 묻지 않고 감지 결과', async () => {
  const yes = await resolved(MONO, { answer: true });
  assert.equal(yes.shape.shape, 'monorepo');
  assert.equal(yes.asked.length, 1);
  const no = await resolved(MONO, { answer: false });
  assert.deepEqual(no.shape, { shape: 'single', workspaces: [] });
  const auto = await resolved(MONO, { yes: true, answer: false });
  assert.equal(auto.shape.shape, 'monorepo');
  assert.deepEqual(auto.asked, []);
});

test('resolveShape: 이미 확정된 모양(stored)이 있으면 다시 묻지 않는다 — single 확정은 single로 남는다', async () => {
  const kept = await resolved(MONO, { stored: { shape: 'single' }, answer: true });
  assert.deepEqual(kept.shape, { shape: 'single', workspaces: [] });
  assert.deepEqual(kept.asked, []);
  const ws = await resolved(MONO, { stored: { shape: 'app-packages' }, answer: false });
  assert.equal(ws.shape.shape, 'monorepo', '확정된 workspace 모양이면 현재 목록으로 다시 판별한다');
  assert.deepEqual(ws.asked, []);
});

test('describeShape: 모양과 workspace별 앱/패키지·스택을 한 줄씩 보여 준다', () => {
  const text = describeShape({ shape: 'monorepo', workspaces: [{ dir: '.', kind: 'app', stackId: 'node' }, { dir: 'apps/web', kind: 'app', stackId: 'react' }, { dir: 'packages/ui', kind: 'package', stackId: 'node' }] });
  assert.match(text, /저장소 모양: monorepo \(workspace 3개, 앱 2개\)/);
  assert.match(text, /\(루트\)\s+앱\s+node/);
  assert.match(text, /packages\/ui\s+패키지\s+node/);
});

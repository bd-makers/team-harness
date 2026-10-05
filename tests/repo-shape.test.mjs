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

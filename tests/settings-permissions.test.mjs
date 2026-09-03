// init이 쓰는 .claude/settings.json의 permissions가 pnpm·Expo로 고정돼 있었다 — npm·yarn·bun
// 프로젝트는 쓸모없는 항목을 받고 실제 명령은 허용되지 않았으며, 순수 Node·Python 프로젝트에도
// Expo 항목이 들어갔다(RN 전용 rules를 스택으로 게이트한 선례와 불일치). 이 테스트는 스택
// 프로필(detect-stack의 buildProfile 출력)에서 pm·RN 의존 항목을 생성하는 순수 함수의 계약이다.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { stackPermissions } from '../src/settings-permissions.mjs';

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), '..');

// detect-stack buildProfile과 같은 모양. 명령은 실제 프로필이 주는 형태 그대로(npm은 `run` 포함).
function profile(overrides) {
  return {
    id: 'node', stackLabel: 'Node.js', language: 'JavaScript', packageManager: 'npm',
    cmdInstall: 'npm install', cmdDev: '(configure)', cmdTest: 'npm run test',
    cmdLint: 'npm run lint', cmdTypecheck: '(configure)', ...overrides,
  };
}

test('npm 비RN 프로젝트: 프로필의 명령 그대로 allow하고 Expo·네이티브 deny는 넣지 않는다', () => {
  const out = stackPermissions(profile());
  assert.deepEqual(out.allow, [
    'Bash(npm install)', 'Bash(npm install *)',
    'Bash(npm run test)', 'Bash(npm run test -- *)',
    'Bash(npm run lint)',
  ]);
  assert.deepEqual(out.deny, []);
});

test('pnpm Expo 프로젝트: pm 항목 + Expo allow 3종 + ios/android deny 2종', () => {
  const out = stackPermissions(profile({
    id: 'expo', language: 'TypeScript', packageManager: 'pnpm', cmdInstall: 'pnpm install',
    cmdTest: 'pnpm test', cmdLint: 'pnpm lint', cmdTypecheck: 'pnpm typecheck',
  }));
  assert.deepEqual(out.allow, [
    'Bash(pnpm install)', 'Bash(pnpm add *)',
    'Bash(pnpm test)', 'Bash(pnpm test -- *)',
    'Bash(pnpm lint)', 'Bash(pnpm typecheck)',
    'Bash(pnpm expo start)', 'Bash(pnpm expo prebuild *)', 'Bash(npx expo install *)',
  ]);
  assert.deepEqual(out.deny, ['Edit(./ios/**)', 'Edit(./android/**)']);
});

test('yarn react-native 프로젝트: add는 `yarn add *`, Expo 실행은 `yarn expo …`', () => {
  const out = stackPermissions(profile({
    id: 'react-native', packageManager: 'yarn', cmdInstall: 'yarn install',
    cmdTest: 'yarn test', cmdLint: '(configure)',
  }));
  assert.ok(out.allow.includes('Bash(yarn add *)'));
  assert.ok(out.allow.includes('Bash(yarn expo start)'));
  assert.ok(out.allow.includes('Bash(yarn expo prebuild *)'));
  assert.ok(!out.allow.some(e => e.includes('pnpm')));
});

test('TypeScript인데 typecheck 스크립트가 없으면 exec 접두(npx·bunx·yarn·pnpm)로 `tsc --noEmit`를 허용한다', () => {
  const npmTs = stackPermissions(profile({ language: 'TypeScript' }));
  assert.ok(npmTs.allow.includes('Bash(npx tsc --noEmit)'));
  const bunTs = stackPermissions(profile({ language: 'TypeScript', packageManager: 'bun', cmdInstall: 'bun install', cmdTest: 'bun test', cmdLint: '(configure)' }));
  assert.ok(bunTs.allow.includes('Bash(bunx tsc --noEmit)'));
  assert.ok(bunTs.allow.includes('Bash(bun add *)'));
  const yarnTs = stackPermissions(profile({ language: 'TypeScript', packageManager: 'yarn', cmdInstall: 'yarn install', cmdTest: 'yarn test', cmdLint: '(configure)' }));
  assert.ok(yarnTs.allow.includes('Bash(yarn tsc --noEmit)'));
  const pnpmTs = stackPermissions(profile({ language: 'TypeScript', packageManager: 'pnpm', cmdInstall: 'pnpm install', cmdTest: 'pnpm test', cmdLint: '(configure)' }));
  assert.ok(pnpmTs.allow.includes('Bash(pnpm tsc --noEmit)'));
  const jsNoScript = stackPermissions(profile({ language: 'JavaScript' }));
  assert.ok(!jsNoScript.allow.some(e => e.includes('tsc')));
});

test('(configure)인 명령은 허용 항목으로 만들지 않는다 — install·add만 남는다', () => {
  const out = stackPermissions(profile({ cmdTest: '(configure)', cmdLint: '(configure)', cmdTypecheck: '(configure)' }));
  assert.deepEqual(out.allow, ['Bash(npm install)', 'Bash(npm install *)']);
});

test('패키지 매니저가 없는 스택(python·go·generic)은 아무 항목도 만들지 않는다', () => {
  const py = stackPermissions({ id: 'python', language: 'Python', packageManager: 'pip', cmdInstall: 'pip install', cmdTest: '(configure)', cmdLint: '(configure)', cmdTypecheck: '(configure)' });
  const generic = stackPermissions(profile({ id: 'generic', packageManager: '(none)', cmdInstall: '(configure)', cmdTest: '(configure)', cmdLint: '(configure)' }));
  assert.deepEqual(py, { allow: [], deny: [] });
  assert.deepEqual(generic, { allow: [], deny: [] });
});

test('RN 판정은 유효 stack id를 따른다 — 명시 --stack이 프로필 id보다 우선한다(excludesRnRules와 같은 입력)', () => {
  const forcedRn = stackPermissions(profile(), { stackId: 'expo' });
  assert.ok(forcedRn.allow.includes('Bash(npx expo start)'));
  assert.deepEqual(forcedRn.deny, ['Edit(./ios/**)', 'Edit(./android/**)']);
  const forcedNode = stackPermissions(profile({ id: 'expo' }), { stackId: 'node' });
  assert.ok(!forcedNode.allow.some(e => e.includes('expo')));
  assert.deepEqual(forcedNode.deny, []);
});

// codex 리뷰 P2 (2026-09-04) — pm 게이트가 RN 게이트보다 앞에 있어 package.json 없는 디렉터리에 --stack expo를
// 강제하면 ios/android deny까지 사라졌다. RN rules 게이트(excludesRnRules)는 같은 입력에 RN rules를 포함한다.
test('pm이 없어도 유효 stack이 RN이면 ios/android deny와 Expo allow(exec 접두 기본 npx)를 낸다', () => {
  const out = stackPermissions({ id: 'expo', language: 'unknown', packageManager: '(none)', cmdInstall: '(configure)', cmdTest: '(configure)', cmdLint: '(configure)', cmdTypecheck: '(configure)' }, { stackId: 'expo' });
  assert.deepEqual(out.allow, ['Bash(npx expo start)', 'Bash(npx expo prebuild *)', 'Bash(npx expo install *)']);
  assert.deepEqual(out.deny, ['Edit(./ios/**)', 'Edit(./android/**)']);
});

test('프로필이 없으면(직접 호출·테스트) 빈 목록 — 템플릿 JSON만 남는다', () => {
  assert.deepEqual(stackPermissions(null), { allow: [], deny: [] });
  assert.deepEqual(stackPermissions(undefined), { allow: [], deny: [] });
});

test('템플릿 settings.json에는 pm·RN 의존 항목이 없고 pm 무관 항목은 남아 있다', async () => {
  const tpl = JSON.parse(await readFile(join(ROOT, 'templates/.claude/settings.json'), 'utf8'));
  const all = [...tpl.permissions.allow, ...tpl.permissions.deny];
  assert.ok(!all.some(e => /\b(pnpm|npm|yarn|bun|npx)\b/.test(e)), `pm 의존 항목이 남아 있음: ${all.filter(e => /\b(pnpm|npm|yarn|bun|npx)\b/.test(e)).join(', ')}`);
  assert.ok(!all.some(e => /expo|\.\/ios\/|\.\/android\//.test(e)), 'RN 전용 항목이 남아 있음');
  for (const keep of ['Read', 'Edit', 'Write', 'Glob', 'Grep', 'Bash(codex:*)']) assert.ok(tpl.permissions.allow.includes(keep), `allow에 ${keep} 없음`);
  for (const keep of ['Read(./.env)', 'Bash(rm -rf *)', 'Bash(git push --force*)']) assert.ok(tpl.permissions.deny.includes(keep), `deny에 ${keep} 없음`);
});

// ---- planChanges 통합: 실제 fixture 디렉터리에서 감지 → 합성 → deep-merge까지 한 경로로 확인한다.
import { mkdtemp, mkdir, rm, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { planChanges } from '../src/harness.mjs';
import { resolveStack } from '../src/detect-stack.mjs';

async function fixture(files) {
  const dir = await mkdtemp(join(tmpdir(), 'harness-perm-'));
  for (const [name, body] of Object.entries(files)) {
    await mkdir(dirname(join(dir, name)), { recursive: true });
    await writeFile(join(dir, name), typeof body === 'string' ? body : JSON.stringify(body, null, 2));
  }
  return dir;
}

// init.mjs와 같은 순서: resolveStack → ctx.stackId = stack.id → planChanges(ctx, { stack })
async function planSettings(dir, forced) {
  const stack = await resolveStack(dir, forced);
  const ctx = { root: ROOT, targetDir: dir, backupDir: null, flags: forced ? { stack: forced } : {}, stackId: stack.id };
  const { changes } = await planChanges(ctx, { stack });
  const change = changes.find(c => c.path.endsWith('.claude/settings.json'));
  return { stack, change, settings: change ? JSON.parse(change.after) : null };
}

test('planChanges: npm Node 프로젝트는 `npm run test` 등 실제 명령을 허용하고 pnpm·Expo 항목이 없다', async () => {
  const dir = await fixture({ 'package.json': { name: 'svc', scripts: { test: 'node --test', lint: 'eslint .' } } });
  try {
    const { stack, settings } = await planSettings(dir);
    assert.equal(stack.packageManager, 'npm');
    const { allow, deny } = settings.permissions;
    for (const e of ['Bash(npm install)', 'Bash(npm install *)', 'Bash(npm run test)', 'Bash(npm run test -- *)', 'Bash(npm run lint)', 'Bash(codex:*)']) {
      assert.ok(allow.includes(e), `allow에 ${e} 없음: ${allow.join(', ')}`);
    }
    assert.ok(!allow.some(e => /pnpm|expo/.test(e)), `pnpm·Expo 항목 잔존: ${allow.join(', ')}`);
    assert.ok(!deny.some(e => /ios|android/.test(e)), `네이티브 deny 잔존: ${deny.join(', ')}`);
    assert.ok(deny.includes('Read(./.env)'), 'pm 무관 deny는 유지');
  } finally { await rm(dir, { recursive: true, force: true }); }
});

test('planChanges: pnpm Expo 프로젝트는 Expo allow 3종과 ios/android deny 2종을 받는다', async () => {
  const dir = await fixture({
    'package.json': { name: 'app', dependencies: { expo: '52.0.0', 'react-native': '0.76.0' }, scripts: { test: 'jest' } },
    'pnpm-lock.yaml': 'lockfileVersion: 9\n',
  });
  try {
    const { stack, settings } = await planSettings(dir);
    assert.equal(stack.id, 'react-native', 'detectStack은 expo 의존성도 react-native id로 보고한다(expo는 --stack 별칭)');
    assert.equal(stack.packageManager, 'pnpm');
    const { allow, deny } = settings.permissions;
    for (const e of ['Bash(pnpm test)', 'Bash(pnpm add *)', 'Bash(pnpm expo start)', 'Bash(pnpm expo prebuild *)', 'Bash(npx expo install *)']) {
      assert.ok(allow.includes(e), `allow에 ${e} 없음: ${allow.join(', ')}`);
    }
    assert.ok(deny.includes('Edit(./ios/**)') && deny.includes('Edit(./android/**)'), `네이티브 deny 없음: ${deny.join(', ')}`);
  } finally { await rm(dir, { recursive: true, force: true }); }
});

test('planChanges: Expo 프로젝트라도 --stack node를 주면 Expo·네이티브 항목을 빼고 pm 항목은 유지한다 (excludesRnRules와 같은 판정)', async () => {
  const dir = await fixture({
    'package.json': { name: 'app', dependencies: { expo: '52.0.0' }, scripts: { test: 'jest' } },
    'pnpm-lock.yaml': 'lockfileVersion: 9\n',
  });
  try {
    const { settings } = await planSettings(dir, 'node');
    const { allow, deny } = settings.permissions;
    assert.ok(allow.includes('Bash(pnpm test)'), 'pm 항목은 남는다');
    assert.ok(!allow.some(e => /expo/.test(e)), `Expo 항목 잔존: ${allow.join(', ')}`);
    assert.ok(!deny.some(e => /ios|android/.test(e)), `네이티브 deny 잔존: ${deny.join(', ')}`);
  } finally { await rm(dir, { recursive: true, force: true }); }
});

test('planChanges: 생성 결과를 그대로 둔 채 재실행하면 settings.json change가 없다 (멱등)', async () => {
  const dir = await fixture({ 'package.json': { name: 'svc', scripts: { test: 'node --test' } } });
  try {
    const first = await planSettings(dir);
    await mkdir(join(dir, '.claude'), { recursive: true });
    await writeFile(join(dir, '.claude/settings.json'), first.change.after);
    const second = await planSettings(dir);
    assert.equal(second.change, undefined, '재실행에 settings.json change가 생김');
  } finally { await rm(dir, { recursive: true, force: true }); }
});

test('planChanges: 옛 스캐폴드의 pnpm 항목이 있는 프로젝트를 npm으로 재실행하면 옛 항목은 남고 npm 항목이 더해진다 (합집합 병합 — 알려진 한계)', async () => {
  const dir = await fixture({
    'package.json': { name: 'svc', scripts: { test: 'node --test' } },
    '.claude/settings.json': { permissions: { allow: ['Read', 'Bash(pnpm test)'], deny: [] } },
  });
  try {
    const { settings } = await planSettings(dir);
    const { allow } = settings.permissions;
    assert.ok(allow.includes('Bash(pnpm test)'), '옛 항목은 제거하지 않는다');
    assert.ok(allow.includes('Bash(npm run test)'), '새 pm 항목이 더해진다');
    assert.equal(allow.filter(e => e === 'Read').length, 1, '동일 항목은 중복되지 않는다');
  } finally { await rm(dir, { recursive: true, force: true }); }
});

test('planChanges: stack 없이 직접 부르면 permissions는 템플릿 JSON 그대로다 — 제거한 pm·RN 항목이 되살아나지 않는다', async () => {
  const dir = await fixture({ 'package.json': { name: 'svc' } });
  try {
    const tpl = JSON.parse(await readFile(join(ROOT, 'templates/.claude/settings.json'), 'utf8'));
    const ctx = { root: ROOT, targetDir: dir, backupDir: null, flags: {} };
    const { changes } = await planChanges(ctx, { stack: undefined });
    const change = changes.find(c => c.path.endsWith('.claude/settings.json'));
    const { allow, deny } = JSON.parse(change.after).permissions;
    assert.deepEqual(allow, tpl.permissions.allow);
    assert.deepEqual(deny, tpl.permissions.deny);
  } finally { await rm(dir, { recursive: true, force: true }); }
});

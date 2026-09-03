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

// copyStaticAssets copied the 4 React-Native-specific `.claude/rules` files (Expo Router
// navigation, RN state management, RN styling, RN testing) into every scaffolded project —
// even `--stack python|node|generic` ones, where the guidance is actively wrong. They are now a
// *rules preset* (templates/presets/rules/react-native.json, preset-repo-shape R9): a single app
// gets them when its *effective* stack id (explicit `--stack`, else the id init detected and
// passed as `ctx.stackId`) is React Native — byte-identical to before. In a workspace repo each
// RN *app* gets its own copies with `paths:` prefixed by the app directory. A call with no stack
// information at all no longer copies them (R11 — not a user path).
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { mkdtemp, readdir, rm, readFile, writeFile, mkdir } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join, resolve, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

import { copyStaticAssets, mirrorCursorRules } from '../src/harness.mjs';
import { planRuleInstalls } from '../src/presets.mjs';
import { detectRepoShape } from '../src/repo-shape.mjs';

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const RN_ONLY_RULES = ['navigation.md', 'state-management.md', 'styling.md', 'testing.md'];

const ctxFor = (dir, flags = {}) => ({ root: ROOT, targetDir: dir, flags });

async function sandbox() {
  return mkdtemp(join(tmpdir(), 'harness-stack-rules-'));
}

async function rulesIn(dir) {
  try { return await readdir(join(dir, '.claude/rules')); } catch { return []; }
}

test('copyStaticAssets: 명시적 비-RN stack(python)은 RN 전용 rules 4종을 복사하지 않는다', async () => {
  const dir = await sandbox();
  try {
    await copyStaticAssets(ctxFor(dir, { stack: 'python' }));
    const names = await rulesIn(dir);
    for (const f of RN_ONLY_RULES) assert.ok(!names.includes(f), `${f}는 python stack에 복사되면 안 된다`);
  } finally {
    await rm(dir, { recursive: true, force: true });
  }
});

test('copyStaticAssets: 명시적 비-RN stack(node)도 RN 전용 rules 4종을 복사하지 않는다', async () => {
  const dir = await sandbox();
  try {
    await copyStaticAssets(ctxFor(dir, { stack: 'node' }));
    const names = await rulesIn(dir);
    for (const f of RN_ONLY_RULES) assert.ok(!names.includes(f), `${f}는 node stack에 복사되면 안 된다`);
  } finally {
    await rm(dir, { recursive: true, force: true });
  }
});

test('copyStaticAssets: 명시적 비-RN stack(generic)도 RN 전용 rules 4종을 복사하지 않는다', async () => {
  const dir = await sandbox();
  try {
    await copyStaticAssets(ctxFor(dir, { stack: 'generic' }));
    const names = await rulesIn(dir);
    for (const f of RN_ONLY_RULES) assert.ok(!names.includes(f), `${f}는 generic stack에 복사되면 안 된다`);
  } finally {
    await rm(dir, { recursive: true, force: true });
  }
});

test('copyStaticAssets: 명시적 RN stack(react-native)은 기존처럼 RN 전용 rules 4종을 복사한다', async () => {
  const dir = await sandbox();
  try {
    await copyStaticAssets(ctxFor(dir, { stack: 'react-native' }));
    const names = await rulesIn(dir);
    for (const f of RN_ONLY_RULES) assert.ok(names.includes(f), `${f}는 react-native stack에 복사돼야 한다`);
  } finally {
    await rm(dir, { recursive: true, force: true });
  }
});

test('copyStaticAssets: stack 정보가 전혀 없는 호출은 RN rules를 복사하지 않는다(R11)', async () => {
  const dir = await sandbox();
  try {
    // flags에 stack 키도 없고 ctx.stackId도 없다 — 직접 호출·테스트 경로.
    await copyStaticAssets(ctxFor(dir, {}));
    const names = await rulesIn(dir);
    for (const f of RN_ONLY_RULES) assert.ok(!names.includes(f), `${f}: 판정 입력이 없으면 설치하지 않는다`);
  } finally {
    await rm(dir, { recursive: true, force: true });
  }
});

test('copyStaticAssets: 자동감지된 비-RN stack(ctx.stackId=node)은 --stack 없이도 RN rules를 제외한다', async () => {
  const dir = await sandbox();
  try {
    await copyStaticAssets({ ...ctxFor(dir, {}), stackId: 'node' });
    const names = await rulesIn(dir);
    for (const f of RN_ONLY_RULES) assert.ok(!names.includes(f), `${f}는 감지된 node stack에 복사되면 안 된다`);
  } finally {
    await rm(dir, { recursive: true, force: true });
  }
});

test('copyStaticAssets: 자동감지된 RN stack(ctx.stackId=react-native)은 RN rules를 복사한다', async () => {
  const dir = await sandbox();
  try {
    await copyStaticAssets({ ...ctxFor(dir, {}), stackId: 'react-native' });
    const names = await rulesIn(dir);
    for (const f of RN_ONLY_RULES) assert.ok(names.includes(f), `${f}는 감지된 react-native stack에 복사돼야 한다`);
  } finally {
    await rm(dir, { recursive: true, force: true });
  }
});

test('copyStaticAssets: 명시 --stack이 감지 결과보다 우선한다', async () => {
  const dir = await sandbox();
  try {
    await copyStaticAssets({ ...ctxFor(dir, { stack: 'react-native' }), stackId: 'node' });
    const names = await rulesIn(dir);
    for (const f of RN_ONLY_RULES) assert.ok(names.includes(f), `${f}: --stack react-native가 감지된 node를 덮어야 한다`);
  } finally {
    await rm(dir, { recursive: true, force: true });
  }
});

test('copyStaticAssets: rules 제외와 무관하게 hooks/skills/docs는 그대로 복사된다', async () => {
  const dir = await sandbox();
  try {
    const results = await copyStaticAssets(ctxFor(dir, { stack: 'python' }));
    assert.ok(results.some(r => r.path.includes('.claude/hooks') && r.action === 'write'), 'hooks는 stack과 무관하게 복사돼야 한다');
    assert.ok(results.some(r => r.path.includes('.claude/skills') && r.action === 'write'), 'skills는 stack과 무관하게 복사돼야 한다');
  } finally {
    await rm(dir, { recursive: true, force: true });
  }
});

test('sync(mirrorCursorRules): 비-RN stack이라 .claude/rules가 비어 있어도 실패하지 않는다', async () => {
  const dir = await sandbox();
  try {
    await copyStaticAssets(ctxFor(dir, { stack: 'python' }));
    // RN 전용 4종이 유일한 rule 파일이므로 python stack 이후 .claude/rules는 비어 있다.
    assert.deepEqual(await rulesIn(dir), []);

    const results = await mirrorCursorRules({ targetDir: dir });
    assert.deepEqual(results, [], '소스가 비어 있으면 미러링할 것도 없다 — 예외 없이 빈 배열');

    const cursorRulesNames = await readdir(join(dir, '.cursor/rules')).catch(() => null);
    assert.equal(cursorRulesNames, null, '.cursor/rules 디렉토리 자체가 생기지 않아야 한다');
  } finally {
    await rm(dir, { recursive: true, force: true });
  }
});

// --- rules 프리셋 (preset-repo-shape R9·R11) ---
const tpl = name => readFile(join(ROOT, 'templates/.claude/rules', name), 'utf8');

async function writeTree(dir, files) {
  for (const [name, body] of Object.entries(files)) {
    await mkdir(dirname(join(dir, name)), { recursive: true });
    await writeFile(join(dir, name), typeof body === 'string' ? body : JSON.stringify(body));
  }
}

test('rules 프리셋: 단일 RN 앱은 템플릿과 바이트 동일한 4종, 비-RN도 빈 .claude/rules는 만든다(종전과 같음)', async () => {
  const rn = await sandbox(), py = await sandbox();
  try {
    const results = await copyStaticAssets({ ...ctxFor(rn, {}), stackId: 'react-native' });
    for (const f of RN_ONLY_RULES) assert.equal(await readFile(join(rn, '.claude/rules', f), 'utf8'), await tpl(f), f);
    assert.equal(results.filter(r => r.path.includes('.claude/rules/') && r.action === 'write').length, 4, 'Copied N 집계에 들어간다');
    await copyStaticAssets(ctxFor(py, { stack: 'python' }));
    assert.deepEqual(await readdir(join(py, '.claude/rules')), []);
  } finally {
    await rm(rn, { recursive: true, force: true });
    await rm(py, { recursive: true, force: true });
  }
});

const WS_RN = {
  'package.json': { name: 'root', private: true, workspaces: ['apps/*', 'packages/*'] },
  'apps/mobile/package.json': { name: 'mobile', dependencies: { expo: '52', 'react-native': '0.76' } },
  'apps/web/package.json': { name: 'web', scripts: { dev: 'next dev' }, dependencies: { next: '15' } },
  'packages/ui/package.json': { name: 'ui', devDependencies: { 'react-native': '0.76' } },
};

test('rules 프리셋: workspace 저장소는 RN 앱에만 앱 경로 접두를 붙인 사본을 설치하고 Cursor 미러에도 전파한다', async () => {
  const dir = await sandbox();
  try {
    await writeTree(dir, WS_RN);
    const ruleInstalls = await planRuleInstalls(await detectRepoShape(dir), 'node');
    assert.deepEqual(ruleInstalls.map(i => `${i.dir}:${i.preset}`), ['apps/mobile:react-native'], 'RN 의존성만 있는 패키지·웹 앱은 대상이 아니다');
    await copyStaticAssets({ ...ctxFor(dir, {}), stackId: 'node', ruleInstalls });
    const names = (await rulesIn(dir)).sort();
    assert.deepEqual(names, RN_ONLY_RULES.map(f => `apps-mobile-${f}`).sort());
    const nav = await readFile(join(dir, '.claude/rules/apps-mobile-navigation.md'), 'utf8');
    assert.match(nav, /^---\npaths:\n  - "apps\/mobile\/app\/\*\*\/\*\.tsx"\n/);
    assert.equal(nav.split('---').slice(2).join('---'), (await tpl('navigation.md')).split('---').slice(2).join('---'), '본문은 그대로다');
    const mirror = await readFile(join(dir, '.cursor/rules/apps-mobile-navigation.mdc'), 'utf8');
    assert.match(mirror, /apps\/mobile\/app\/\*\*\/\*\.tsx/);
  } finally {
    await rm(dir, { recursive: true, force: true });
  }
});

test('rules 프리셋: 루트 RN 앱은 workspace 저장소에서도 접두 없는 4종, 이미 있는 파일은 덮지 않는다', async () => {
  const dir = await sandbox();
  try {
    await writeTree(dir, {
      'package.json': { name: 'app', workspaces: ['packages/*'], dependencies: { expo: '52' } },
      'packages/ui/package.json': { name: 'ui' },
      '.claude/rules/styling.md': 'team edit\n',
    });
    const ruleInstalls = await planRuleInstalls(await detectRepoShape(dir), 'react-native');
    const results = await copyStaticAssets({ ...ctxFor(dir, {}), stackId: 'react-native', ruleInstalls });
    assert.equal(await readFile(join(dir, '.claude/rules/styling.md'), 'utf8'), 'team edit\n');
    assert.ok(results.some(r => r.path.endsWith('.claude/rules/styling.md') && r.action === 'skip'));
    assert.equal(await readFile(join(dir, '.claude/rules/navigation.md'), 'utf8'), await tpl('navigation.md'));
  } finally {
    await rm(dir, { recursive: true, force: true });
  }
});

test('planRuleInstalls: 단일(모양 없음)·거절된 single은 유효 stack id로 판정한다 — Expo라도 --stack node면 없음', async () => {
  assert.deepEqual((await planRuleInstalls(null, 'react-native')).map(i => i.dir), ['.']);
  assert.deepEqual((await planRuleInstalls({ shape: 'single', workspaces: [] }, 'expo')).map(i => i.dir), ['.']);
  assert.deepEqual(await planRuleInstalls(null, 'node'), []);
  assert.deepEqual(await planRuleInstalls(null, undefined), []);
});

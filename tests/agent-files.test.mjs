import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { resolve, dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { render } from '../src/render.mjs';

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const tpl = (f) => readFile(join(ROOT, 'templates', f), 'utf8');
const VARS = {
  projectName: 'demo', stackLabel: 'Node', packageManager: 'npm',
  language: 'ts', cmdInstall: 'npm i', cmdDev: 'npm run dev', cmdTest: 'npm test',
  cmdLint: 'npm run lint', cmdTypecheck: 'npm run tc',
};

test('AGENTS.md(core)는 protocol/roles/principles/stack 마커를 모두 포함', async () => {
  const out = render(await tpl('AGENTS.md.hbs'), VARS);
  for (const s of ['protocol', 'roles', 'principles', 'stack'])
    assert.match(out, new RegExp(`harness:section="${s}" begin`), `${s} 누락`);
  assert.doesNotMatch(out, /harness:section="workflow"/, 'workflow는 core에 없어야');
});

test('CLAUDE.md(thin)는 @AGENTS.md import + workflow 섹션 + user 영역만', async () => {
  const out = render(await tpl('CLAUDE.md.hbs'), VARS);
  assert.match(out, /^@AGENTS\.md\s*$/m, '최상단 @AGENTS.md import');
  assert.match(out, /harness:section="workflow" begin/);
  assert.match(out, /harness:user:begin/);
  assert.doesNotMatch(out, /harness:section="principles"/, 'core 섹션 복제 금지');
});

test('GEMINI.md(thin)는 @AGENTS.md import + reviewer 섹션', async () => {
  const out = render(await tpl('GEMINI.md.hbs'), VARS);
  assert.match(out, /^@AGENTS\.md\s*$/m);
  assert.match(out, /harness:section="reviewer" begin/);
});

test('어느 thin 파일도 core 본문을 복제하지 않는다 (중복 0)', async () => {
  const claude = render(await tpl('CLAUDE.md.hbs'), VARS);
  const gemini = render(await tpl('GEMINI.md.hbs'), VARS);
  assert.doesNotMatch(claude, /## 작업 프로토콜/);
  assert.doesNotMatch(gemini, /## 작업 프로토콜/);
});

test('AGENTS.md(core) roles 표는 D2 반영 — OpenCode=drive, Codex/Gemini=리뷰어', async () => {
  const out = render(await tpl('AGENTS.md.hbs'), VARS);
  assert.match(out, /OpenCode/, 'OpenCode 행 존재');
  assert.match(out, /drive/, 'drive 주체 명시');
  assert.match(out, /리뷰어/, '리뷰어 역할 명시');
});

test('AGENTS.md(core) stack 명령이 vars로 렌더된다', async () => {
  const out = render(await tpl('AGENTS.md.hbs'), VARS);
  assert.match(out, /npm test/, 'cmdTest 치환');
  assert.doesNotMatch(out, /\{\{cmdTest\}\}/, '미치환 토큰 없음');
});

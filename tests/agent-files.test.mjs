import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFile, mkdtemp, rm, writeFile, symlink, lstat } from 'node:fs/promises';
import { resolve, dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { render } from '../src/render.mjs';
import { planChanges, applyChanges } from '../src/harness.mjs';
import { mergeMarkdown } from '../src/merge.mjs';
import { tmpdir } from 'node:os';

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

test('planChanges: 신규 프로젝트에 AGENTS/CLAUDE/GEMINI 3개 markdown change 생성', async () => {
  const dir = await mkdtemp(join(tmpdir(), 'harness-af-'));
  try {
    const ctx = { root: ROOT, targetDir: dir, backupDir: null, flags: {} };
    const { changes } = await planChanges(ctx, { stack: VARS });
    const md = changes.filter(c => c.kind === 'markdown').map(c => c.path);
    assert.ok(md.some(p => p.endsWith('AGENTS.md')), 'AGENTS.md');
    assert.ok(md.some(p => p.endsWith('CLAUDE.md')), 'CLAUDE.md');
    assert.ok(md.some(p => p.endsWith('GEMINI.md')), 'GEMINI.md');
  } finally { await rm(dir, { recursive: true, force: true }); }
});

test('mergeMarkdown: 기존 thin CLAUDE.md 재머지 시 @AGENTS.md 최상단 라인 생존', async () => {
  const incoming = render(await tpl('CLAUDE.md.hbs'), VARS);
  const existing = '@AGENTS.md\n\n# demo — Claude Code\n\n<!-- harness:user:begin -->\n내 메모\n<!-- harness:user:end -->\n';
  const merged = mergeMarkdown(existing, incoming);
  assert.match(merged, /^@AGENTS\.md/m, 'import 라인 보존');
  assert.match(merged, /내 메모/, '사용자 텍스트 보존');
});

test('planChanges: 레거시 alias symlink 에이전트 파일은 건너뛰고 legacyAgentFiles로 보고 (CLAUDE.md 보호)', async () => {
  const dir = await mkdtemp(join(tmpdir(), 'harness-legacy-apply-'));
  try {
    await writeFile(join(dir, 'CLAUDE.md'), '# legacy master\nLEGACY_SENTINEL\n');
    await symlink('CLAUDE.md', join(dir, 'AGENTS.md'));
    await symlink('CLAUDE.md', join(dir, 'GEMINI.md'));
    const ctx = { root: ROOT, targetDir: dir, backupDir: null, flags: {} };
    const { changes, legacyAgentFiles } = await planChanges(ctx, { stack: VARS });
    assert.ok(!changes.some(c => c.path.endsWith('AGENTS.md')), 'AGENTS.md symlink 건너뜀');
    assert.ok(!changes.some(c => c.path.endsWith('GEMINI.md')), 'GEMINI.md symlink 건너뜀');
    assert.deepEqual([...legacyAgentFiles].sort(), ['AGENTS.md', 'GEMINI.md']);
    // CLAUDE.md change은 정상 생성되더라도, apply가 symlink 타깃을 오염시키지 않아야(아래 applyChanges 테스트)
  } finally { await rm(dir, { recursive: true, force: true }); }
});

test('applyChanges: 심볼릭 링크 경로는 unlink 후 실파일로 써서 타깃을 오염시키지 않는다', async () => {
  const dir = await mkdtemp(join(tmpdir(), 'harness-apply-symlink-'));
  try {
    await writeFile(join(dir, 'target.txt'), 'ORIGINAL');
    await symlink('target.txt', join(dir, 'link.txt'));
    await applyChanges([{ path: join(dir, 'link.txt'), kind: 'markdown', after: 'NEW' }]);
    assert.equal(await readFile(join(dir, 'target.txt'), 'utf8'), 'ORIGINAL', 'symlink 타깃 보존');
    const st = await lstat(join(dir, 'link.txt'));
    assert.equal(st.isSymbolicLink(), false, 'link은 실파일로 교체');
    assert.equal(await readFile(join(dir, 'link.txt'), 'utf8'), 'NEW');
  } finally { await rm(dir, { recursive: true, force: true }); }
});

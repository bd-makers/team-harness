import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFile, mkdtemp, rm, writeFile, symlink, lstat } from 'node:fs/promises';
import { resolve, dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { render } from '../src/render.mjs';
import { planChanges, applyChanges } from '../src/harness.mjs';
import { mergeMarkdown, extractSections } from '../src/merge.mjs';
import { detectStack } from '../src/detect-stack.mjs';
import { tmpdir } from 'node:os';

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const tpl = (f) => readFile(join(ROOT, 'templates', f), 'utf8');
const VARS = {
  projectName: 'demo', stackLabel: 'Node', packageManager: 'npm',
  language: 'ts', cmdInstall: 'npm i', cmdDev: 'npm run dev', cmdTest: 'npm test',
  cmdLint: 'npm run lint', cmdTypecheck: 'npm run tc',
};

// 루트 파일의 제목은 이 저장소 고유 이름을 쓸 수 있어 템플릿 전체와 같을 필요는 없다.
// 반면 harness:section 마커 블록은 apply가 템플릿에서 관리하는 영역이므로, 렌더된
// 템플릿의 모든 블록이 루트 적용본에도 내용까지 같아야 한다. 이는 새 샌드박스가 아닌
// 이 저장소 자체를 확인해 템플릿만 변경되어도 드리프트를 잡는다.
test('저장소 루트 AGENTS.md는 렌더된 템플릿의 관리 절과 드리프트하지 않는다', async () => {
  const [template, rootAgents, stack] = await Promise.all([
    tpl('AGENTS.md.hbs'),
    readFile(join(ROOT, 'AGENTS.md'), 'utf8'),
    detectStack(ROOT),
  ]);
  const expected = extractSections(render(template, { projectName: 'repository-root', ...stack }));
  const actual = extractSections(rootAgents);

  assert.ok(Object.keys(expected).length > 0, '템플릿 관리 절을 찾지 못함');
  for (const [name, section] of Object.entries(expected)) {
    assert.equal(actual[name], section, `루트 AGENTS.md의 ${name} 관리 절이 템플릿과 다름`);
  }
});

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

// D4 (2026-07-28) — 쓰기는 단일 스레드. scaffold 되는 AGENTS.md/CLAUDE.md 쌍이
// 병렬 작성 여부에서 서로 모순되면 소비자 프로젝트가 자기모순 문서를 받는다.
const roleRows = (agentsMd) => agentsMd.split('\n').filter((l) => /^\|\s*\*\*/.test(l));

test('AGENTS.md(core) roles 표의 OpenCode 행은 순차 전환 세션 — "병렬 작성 세션" 회귀 금지', async () => {
  const out = render(await tpl('AGENTS.md.hbs'), VARS);
  const row = roleRows(out).find((l) => l.includes('**OpenCode**'));
  assert.ok(row, 'OpenCode 행 존재');
  assert.match(row, /순차/, 'OpenCode는 순차 전환 세션으로 표기');
  assert.doesNotMatch(row, /병렬 작성/, '역할 표가 병렬 작성 세션으로 되돌아가면 안 됨');
});

test('AGENTS.md(core)는 D2 이력을 보존한 채 D4 단일 스레드 쓰기 결정을 담는다', async () => {
  const out = render(await tpl('AGENTS.md.hbs'), VARS);
  assert.match(out, /\*\*D2 \(2026-06-11\)/, 'D2 결정 이력 보존');
  assert.match(out, /\*\*D4 \(2026-07-28\)/, 'D4 결정 노트 존재');
  assert.match(out, /동시에 병렬로 쓰지 않는다/, '단일 스레드 쓰기 규칙 명문화');
});

test('CLAUDE.md(thin) §2는 컨텍스트 격리 서브에이전트는 유지, 병렬 작성·결정은 금지', async () => {
  const out = render(await tpl('CLAUDE.md.hbs'), VARS);
  assert.match(out, /컨텍스트 격리 서브에이전트/, '조사용 서브에이전트는 표준 실무로 유지');
  assert.match(out, /병렬 작성·결정 에이전트는 두지 않는다/, '병렬 작성·결정 금지 규칙');
  assert.match(out, /쓰기는 단일 스레드로 유지한다/, '단일 스레드 쓰기 규칙');
  assert.doesNotMatch(out, /병렬 분석은 서브에이전트에게 위임/, '구 문구 회귀 금지');
});

test('scaffold 되는 AGENTS.md/CLAUDE.md 쌍은 병렬 쓰기 서술에서 모순되지 않는다', async () => {
  const agents = render(await tpl('AGENTS.md.hbs'), VARS);
  const claude = render(await tpl('CLAUDE.md.hbs'), VARS);
  assert.match(claude, /쓰기는 단일 스레드로 유지한다/, 'CLAUDE.md가 단일 스레드 쓰기를 규정');
  const rows = roleRows(agents);
  assert.ok(rows.length >= 4, `역할 표 행 파싱 실패 (${rows.length}행)`);
  for (const row of rows)
    assert.doesNotMatch(row, /병렬/, `역할 표가 병렬 실행을 기술해 CLAUDE.md와 충돌: ${row}`);
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

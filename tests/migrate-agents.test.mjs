import { test } from 'node:test';
import assert from 'node:assert/strict';
import { mkdtemp, writeFile, readFile, symlink, lstat, rm } from 'node:fs/promises';
import { resolve, dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { tmpdir } from 'node:os';
import { migrateToAgentsMd } from '../src/commands/migrate.mjs';

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), '..');

// 레거시 = CLAUDE.md 실파일(4 core 마커 + workflow + user) + 3 alias symlink
async function makeLegacy(claudeBody) {
  const dir = await mkdtemp(join(tmpdir(), 'harness-mig-agents-'));
  await writeFile(join(dir, 'CLAUDE.md'), claudeBody);
  for (const a of ['AGENTS.md', 'GEMINI.md', '.cursorrules']) await symlink('CLAUDE.md', join(dir, a));
  return dir;
}
const LEGACY = [
  '# demo — AI Team Contract',
  '<!-- harness:section="workflow" begin -->\n## 워크플로우\n워크플로우 본문\n<!-- harness:section="workflow" end -->',
  '<!-- harness:section="principles" begin -->\n## 핵심 원칙\n원칙 본문\n<!-- harness:section="principles" end -->',
  '<!-- harness:section="roles" begin -->\n## 역할\n역할 본문\n<!-- harness:section="roles" end -->',
  '<!-- harness:section="protocol" begin -->\n## 프로토콜\n프로토콜 본문\n<!-- harness:section="protocol" end -->',
  '<!-- harness:user:begin -->\n사용자 자유 메모 SENTINEL\n<!-- harness:user:end -->',
].join('\n\n') + '\n';
const ctxYes = (dir) => ({ targetDir: dir, root: ROOT, flags: { yes: true } });

test('레거시 CLAUDE.md master + 3 symlink → AGENTS.md core 실파일 + thin CLAUDE, GEMINI alias 제거', async () => {
  const dir = await makeLegacy(LEGACY);
  try {
    const ret = await migrateToAgentsMd(ctxYes(dir));
    assert.equal(ret, true, '마이그레이션 수행 → true');

    // AGENTS.md = 실파일, core 섹션 포함
    const agentsSt = await lstat(join(dir, 'AGENTS.md'));
    assert.equal(agentsSt.isSymbolicLink(), false, 'AGENTS.md는 실파일');
    const agents = await readFile(join(dir, 'AGENTS.md'), 'utf8');
    for (const s of ['principles', 'roles', 'protocol'])
      assert.match(agents, new RegExp(`section="${s}"`), `${s} core 이동`);
    assert.doesNotMatch(agents, /section="workflow"/, 'workflow는 core에 없음');

    // CLAUDE.md = thin (import + workflow), 사용자 메모 보존
    const claude = await readFile(join(dir, 'CLAUDE.md'), 'utf8');
    assert.match(claude, /^@AGENTS\.md/m, 'thin import');
    assert.match(claude, /section="workflow"/, 'workflow 잔류');
    assert.match(claude, /SENTINEL/, '사용자 텍스트 보존');
    assert.doesNotMatch(claude, /section="protocol"/, 'core 섹션은 CLAUDE에서 제거');

    // 레거시 GEMINI.md alias는 제거되고 다시 만들지 않는다 (Gemini는 멤버가 아니다 — D7)
    const geminiExists = await lstat(join(dir, 'GEMINI.md')).then(() => true, () => false);
    assert.equal(geminiExists, false, 'GEMINI.md alias 제거, 재생성 없음');

    // .cursorrules 제거됨
    const cursorExists = await lstat(join(dir, '.cursorrules')).then(() => true, () => false);
    assert.equal(cursorExists, false, '.cursorrules 제거');

    // 백업 보존
    const bak = await readFile(join(dir, 'CLAUDE.md.bak'), 'utf8');
    assert.match(bak, /section="protocol"/, '원본 백업');
  } finally { await rm(dir, { recursive: true, force: true }); }
});

test('멱등 — 이미 신구조면 변경 없음(false 반환)', async () => {
  const dir = await mkdtemp(join(tmpdir(), 'harness-mig-noop-'));
  try {
    await writeFile(join(dir, 'AGENTS.md'), '# core\n<!-- harness:section="protocol" begin -->x<!-- harness:section="protocol" end -->\n');
    await writeFile(join(dir, 'CLAUDE.md'), '@AGENTS.md\n');
    assert.equal(await migrateToAgentsMd(ctxYes(dir)), false);
  } finally { await rm(dir, { recursive: true, force: true }); }
});

test('비-하네스 CLAUDE.md(core 마커 없음)는 건드리지 않는다(false)', async () => {
  const dir = await mkdtemp(join(tmpdir(), 'harness-mig-plain-'));
  try {
    await writeFile(join(dir, 'CLAUDE.md'), '# 그냥 메모\n내용\n');
    assert.equal(await migrateToAgentsMd(ctxYes(dir)), false);
    const claude = await readFile(join(dir, 'CLAUDE.md'), 'utf8');
    assert.equal(claude, '# 그냥 메모\n내용\n', '불변');
  } finally { await rm(dir, { recursive: true, force: true }); }
});

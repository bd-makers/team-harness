import { test } from 'node:test';
import assert from 'node:assert/strict';
import { mkdtemp, mkdir, writeFile, readFile, rm } from 'node:fs/promises';
import { join, resolve, dirname } from 'node:path';
import { tmpdir } from 'node:os';
import { fileURLToPath } from 'node:url';
import { runMigrate } from '../../src/commands/migrate.mjs';
import { planChanges, applyChanges } from '../../src/harness.mjs';
import { loadRenderState, saveRenderState } from '../../src/render-state.mjs';
import { collectHookCommands, classifyHookCommand } from '../../src/commands/doctor.mjs';
import { exists } from '../../src/fsx.mjs';

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), '../..');
const ctx = (dir) => ({ root: ROOT, targetDir: dir, flags: { yes: true } });

// 0.9 이전 설치본: SessionStart 없는 settings + 사용자가 고친 stack 절
const LEGACY_AGENTS = '# proj\n\n<!-- harness:section="stack" begin -->\n- uv sync\n- uv run pytest\n<!-- harness:section="stack" end -->\n';

// 0.8-era 설치가 실제로 가지고 있던 훅들. observe-tools.mjs와 boundary-checkpoint.sh는
// 이후 버전에 추가된 것이라 일부러 빼 둔다 — 결함 1의 실측 대상이 바로 그 "새로 생긴 훅"이었다.
const LEGACY_HOOKS = ['protect-files.sh', 'block-dangerous-git.sh', 'auto-format.sh', 'pre-commit-check.sh'];

async function legacyProject() {
  const dir = await mkdtemp(join(tmpdir(), 'harness-legacy-'));
  await mkdir(join(dir, '.claude/hooks'), { recursive: true });
  await writeFile(join(dir, 'AGENTS.md'), LEGACY_AGENTS);
  for (const name of LEGACY_HOOKS) {
    await writeFile(join(dir, '.claude/hooks', name), '#!/usr/bin/env bash\nexit 0\n', { mode: 0o755 });
  }
  await writeFile(join(dir, '.claude/settings.json'), JSON.stringify({
    hooks: { PreToolUse: [{ matcher: 'Edit|Write', hooks: [{ type: 'command', command: './.claude/hooks/protect-files.sh' }] }] },
  }, null, 2));
  return dir;
}

test('레거시 설치 → migrate → init: settings가 가리키는 프로젝트 내부 훅이 모두 존재한다', async () => {
  const dir = await legacyProject();
  try {
    await runMigrate(ctx(dir));
    const settings = JSON.parse(await readFile(join(dir, '.claude/settings.json'), 'utf8'));
    for (const cmd of collectHookCommands(settings)) {
      const c = classifyHookCommand(cmd);
      if (c.kind !== 'project-path') continue;
      assert.ok(await exists(join(dir, c.rel)), `migrate 직후 dangling: ${c.rel}`);
    }
  } finally { await rm(dir, { recursive: true, force: true }); }
});

test('migrate가 관리 절 원본을 백업한다', async () => {
  const dir = await legacyProject();
  try {
    await runMigrate(ctx(dir));
    assert.ok(await exists(join(dir, '.harness/backup')), '백업 디렉터리가 생긴다');
  } finally { await rm(dir, { recursive: true, force: true }); }
});

test('init 재실행: 해시 기록 뒤 사용자가 고친 절은 반복해서 보존된다', async () => {
  const dir = await legacyProject();
  try {
    // 1회차 init — 부트스트랩(stock 간주), 해시 기록
    const first = await planChanges(ctx(dir), { stack: {} });
    await applyChanges(first.changes);
    await saveRenderState(dir, first.renderState);
    assert.ok(Object.keys((await loadRenderState(dir)).sections).length > 0, '해시가 기록된다');

    // 사용자가 stack 절을 고친다
    const body = await readFile(join(dir, 'AGENTS.md'), 'utf8');
    const edited = body.replace(
      /(<!-- harness:section="stack" begin -->)[\s\S]*?(<!-- harness:section="stack" end -->)/,
      '$1\n- uv sync (사용자)\n$2');
    await writeFile(join(dir, 'AGENTS.md'), edited);

    // 2회차 init — 그 절은 건너뛴다
    const second = await planChanges(ctx(dir), { stack: {} });
    await applyChanges(second.changes);
    assert.ok(second.skippedSections.some(s => s.section === 'stack'), 'stack이 건너뛰기로 보고된다');
    assert.match(await readFile(join(dir, 'AGENTS.md'), 'utf8'), /uv sync \(사용자\)/,
      '사용자 편집이 살아남는다');
    await saveRenderState(dir, second.renderState);

    // 3회차 — 보호가 "딱 한 번"이 아니어야 한다. 2회차가 건너뛴 절의 이전 해시를 지워 버리면
    // 여기서 부트스트랩으로 판정되어 덮인다. 이 단언이 그 회귀를 잡는 유일한 지점이다.
    const third = await planChanges(ctx(dir), { stack: {} });
    await applyChanges(third.changes);
    assert.ok(third.skippedSections.some(s => s.section === 'stack'), '3회차에도 건너뛴다');
    assert.match(await readFile(join(dir, 'AGENTS.md'), 'utf8'), /uv sync \(사용자\)/,
      '반복 실행해도 사용자 편집이 살아남는다');
  } finally { await rm(dir, { recursive: true, force: true }); }
});

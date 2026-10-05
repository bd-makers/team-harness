// `.gitignore` used to receive `.harness/` wholesale, contradicting the README that asks
// teams to commit the shared harness state (render-state.json, cursor-mirror.json). Only the
// per-user pointer/config, the observability logs and the local managed-section backups are
// personal. init no longer offers an "AI tool entries" gitignore option: it must not add any.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { mkdtemp, readFile, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { copyStaticAssets } from '../src/harness.mjs';

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), '..');

test('.gitignore: .harness/를 통째로 무시하지 않고 개인 상태 파일만 무시한다', async () => {
  const dir = await mkdtemp(join(tmpdir(), 'harness-gitignore-'));
  try {
    await copyStaticAssets({ root: ROOT, targetDir: dir, flags: {}, stackId: 'node' });
    const lines = (await readFile(join(dir, '.gitignore'), 'utf8')).split('\n').map(l => l.trim());
    for (const wanted of ['.claude/settings.local.json', '.harness/active.json', '.harness/config.json', '.harness/observability/', '.harness/backup/', 'docs/*/*-handoff.md']) {
      assert.ok(lines.includes(wanted), `${wanted} 는 무시돼야 한다`);
    }
    assert.ok(!lines.includes('.harness/'), '.harness/ 전체를 무시하면 팀 상태(render-state.json)를 커밋할 수 없다');
    // AI 도구 항목 옵션은 제거됐다 — 하네스가 커밋 대상으로 삼는 에이전트 파일·설정은 무시하지 않는다.
    for (const gone of ['CLAUDE.md', 'AGENTS.md', '.claude', '.claude/', '.codex', '.codex/', '.cursor', '.cursor/', '# AI']) {
      assert.ok(!lines.includes(gone), `${gone} 항목은 추가하지 않는다`);
    }
  } finally { await rm(dir, { recursive: true, force: true }); }
});

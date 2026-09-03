// `.gitignore` used to receive `.harness/` wholesale, contradicting the README that asks
// teams to commit `.harness/backup.json` (the shared backup path). Only the per-user
// pointer/config and the observability logs are personal. AI-tool entries no longer
// list GEMINI.md / opencode.json / .opencode (D7).
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { mkdtemp, readFile, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { copyStaticAssets, AI_GITIGNORE_PREVIEW } from '../src/harness.mjs';

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), '..');

test('.gitignore: .harness/를 통째로 무시하지 않고 개인 상태 파일만 무시한다', async () => {
  const dir = await mkdtemp(join(tmpdir(), 'harness-gitignore-'));
  try {
    await copyStaticAssets({ root: ROOT, targetDir: dir, flags: {}, stackId: 'node', addAiGitignore: true });
    const lines = (await readFile(join(dir, '.gitignore'), 'utf8')).split('\n').map(l => l.trim());
    for (const wanted of ['.claude/settings.local.json', '.harness/active.json', '.harness/config.json', '.harness/observability/']) {
      assert.ok(lines.includes(wanted), `${wanted} 는 무시돼야 한다`);
    }
    assert.ok(!lines.includes('.harness/'), '.harness/ 전체를 무시하면 backup.json을 커밋할 수 없다');
    for (const gone of ['GEMINI.md', 'opencode.json', '.opencode', '.opencode/']) {
      assert.ok(!lines.includes(gone), `${gone} 항목은 D7 이후 추가하지 않는다`);
    }
    assert.ok(lines.includes('.codex'), 'Codex 항목은 유지');
  } finally { await rm(dir, { recursive: true, force: true }); }
});

test('AI_GITIGNORE_PREVIEW(init이 보여주는 미리보기)는 실제 추가 목록과 같은 소스다', () => {
  assert.doesNotMatch(AI_GITIGNORE_PREVIEW, /GEMINI|opencode/i);
  assert.doesNotMatch(AI_GITIGNORE_PREVIEW, /^docs\/$/m, 'task SSOT가 있는 docs/는 무시 목록에 없다');
});

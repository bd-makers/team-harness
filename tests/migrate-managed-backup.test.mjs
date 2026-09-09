import { test } from 'node:test';
import assert from 'node:assert/strict';
import { mkdtemp, writeFile, readFile, readdir, rm } from 'node:fs/promises';
import { join, resolve, dirname } from 'node:path';
import { tmpdir } from 'node:os';
import { fileURLToPath } from 'node:url';
import { migrateManagedSectionBackup } from '../src/commands/migrate.mjs';
import { saveRenderState } from '../src/render-state.mjs';

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const ctxYes = (dir) => ({ root: ROOT, targetDir: dir, flags: { yes: true } });
const EDITED = '# P\n\n<!-- harness:section="stack" begin -->\n- uv sync (사용자가 고침)\n<!-- harness:section="stack" end -->\n';

function captureLogs() {
  const lines = []; const original = console.log;
  console.log = (...a) => lines.push(a.join(' '));
  return { lines, restore: () => { console.log = original; } };
}

async function project(body) {
  const dir = await mkdtemp(join(tmpdir(), 'harness-mig-backup-'));
  await writeFile(join(dir, 'AGENTS.md'), body);
  return dir;
}

test('render-state 없음(부트스트랩) → 원본을 백업하고 diff를 경고로 남긴다', async () => {
  const dir = await project(EDITED);
  const cap = captureLogs();
  try {
    const ret = await migrateManagedSectionBackup(ctxYes(dir));
    cap.restore();
    assert.equal(ret, true);
    const dirs = await readdir(join(dir, '.harness/backup'));
    assert.equal(dirs.length, 1, '백업 디렉터리 하나가 생긴다');
    const saved = await readFile(join(dir, '.harness/backup', dirs[0], 'AGENTS.md'), 'utf8');
    assert.equal(saved, EDITED, '원본 바이트가 그대로 보존된다');
    const log = cap.lines.join('\n');
    assert.ok(/uv sync/.test(log), 'diff에 사라질 내용이 보인다');
  } finally { cap.restore(); await rm(dir, { recursive: true, force: true }); }
});

test('render-state 있음 → 부트스트랩이 아니므로 아무것도 하지 않는다', async () => {
  const dir = await project(EDITED);
  try {
    await saveRenderState(dir, { version: 1, sections: { 'AGENTS.md': { stack: 'abc' } } });
    assert.equal(await migrateManagedSectionBackup(ctxYes(dir)), false);
    await assert.rejects(() => readdir(join(dir, '.harness/backup')));
  } finally { await rm(dir, { recursive: true, force: true }); }
});

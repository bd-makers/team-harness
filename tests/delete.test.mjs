import { test } from 'node:test';
import assert from 'node:assert/strict';
import { mkdtemp, mkdir, writeFile, rm, lstat } from 'node:fs/promises';
import { join } from 'node:path';
import { tmpdir } from 'node:os';
import { runDelete } from '../src/commands/delete.mjs';

async function makeFixture() {
  const parent = await mkdtemp(join(tmpdir(), 'harness-del-'));
  const projectDir = join(parent, 'my-project');
  const backupDir = join(parent, 'harness-backup', 'my-project');

  await mkdir(join(projectDir, '.harness'), { recursive: true });
  await writeFile(
    join(projectDir, '.harness/backup.json'),
    JSON.stringify({ dir: backupDir }),
  );
  await mkdir(backupDir, { recursive: true });
  return { parent, projectDir, backupDir };
}

test('--include-real이 없으면 실제 디렉토리는 skip', async () => {
  const { parent, projectDir } = await makeFixture();
  try {
    await mkdir(join(projectDir, '.claude'), { recursive: true });
    await writeFile(join(projectDir, '.claude/settings.json'), '{}');
    await runDelete({ targetDir: projectDir, flags: { yes: true } });
    // .claude is a real dir, should NOT be deleted without --include-real
    await lstat(join(projectDir, '.claude')); // must still exist → no throw
  } finally {
    await rm(parent, { recursive: true, force: true });
  }
});

test('--include-real이면 실제 디렉토리도 삭제', async () => {
  const { parent, projectDir } = await makeFixture();
  try {
    await mkdir(join(projectDir, '.claude'), { recursive: true });
    await writeFile(join(projectDir, '.claude/settings.json'), '{}');
    await runDelete({ targetDir: projectDir, flags: { yes: true, 'include-real': true } });
    // .claude should be deleted
    const st = await lstat(join(projectDir, '.claude')).catch(() => null);
    assert.equal(st, null);
  } finally {
    await rm(parent, { recursive: true, force: true });
  }
});

test('--include-real: .harness 삭제 후 backup.json 내용 반환', async () => {
  const { parent, projectDir, backupDir } = await makeFixture();
  try {
    // .harness is a real dir (already created in makeFixture)
    const result = await runDelete({ targetDir: projectDir, flags: { yes: true, 'include-real': true } });
    const st = await lstat(join(projectDir, '.harness')).catch(() => null);
    assert.equal(st, null);
    // result should contain the saved backup config
    assert.ok(result?.savedBackupConfig?.dir === backupDir);
  } finally {
    await rm(parent, { recursive: true, force: true });
  }
});

import { test } from 'node:test';
import assert from 'node:assert/strict';
import { mkdtemp, mkdir, writeFile, rm } from 'node:fs/promises';
import { join } from 'node:path';
import { tmpdir } from 'node:os';
import { resolveBackupDir } from '../src/backup-dir.mjs';

test('opts.backupDir override를 즉시 반환', async () => {
  const result = await resolveBackupDir('/nonexistent', { backupDir: '/custom/path' });
  assert.equal(result, '/custom/path');
});

test('.harness/backup.json의 dir 필드를 읽음', async () => {
  const dir = await mkdtemp(join(tmpdir(), 'harness-test-'));
  try {
    await mkdir(join(dir, '.harness'), { recursive: true });
    await writeFile(join(dir, '.harness/backup.json'), JSON.stringify({ dir: '/some/backup' }));
    assert.equal(await resolveBackupDir(dir), '/some/backup');
  } finally {
    await rm(dir, { recursive: true, force: true });
  }
});

test('../harness-backup/<projectName> 디렉토리가 있으면 auto-detect', async () => {
  const parent = await mkdtemp(join(tmpdir(), 'harness-parent-'));
  const projectDir = join(parent, 'my-project');
  const backupDir = join(parent, 'harness-backup', 'my-project');
  try {
    await mkdir(projectDir, { recursive: true });
    await mkdir(backupDir, { recursive: true });
    assert.equal(await resolveBackupDir(projectDir), backupDir);
  } finally {
    await rm(parent, { recursive: true, force: true });
  }
});

test('아무것도 없으면 null 반환', async () => {
  const dir = await mkdtemp(join(tmpdir(), 'harness-test-'));
  try {
    assert.equal(await resolveBackupDir(dir), null);
  } finally {
    await rm(dir, { recursive: true, force: true });
  }
});

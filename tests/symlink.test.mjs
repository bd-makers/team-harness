import { test } from 'node:test';
import assert from 'node:assert/strict';
import { mkdtemp, mkdir, writeFile, readFile, readlink, rm, lstat } from 'node:fs/promises';
import { join } from 'node:path';
import { tmpdir } from 'node:os';
import { runSymlink } from '../src/commands/symlink.mjs';

async function makeFixture() {
  const parent = await mkdtemp(join(tmpdir(), 'harness-symlink-'));
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

test('실파일이 backup과 다르면 --yes에도 절대 교체하지 않는다', async () => {
  const { parent, projectDir, backupDir } = await makeFixture();
  try {
    await writeFile(join(projectDir, 'CLAUDE.md'), 'PROJECT CONTENT');
    await writeFile(join(backupDir, 'CLAUDE.md'), 'BACKUP CONTENT');

    await runSymlink({ targetDir: projectDir, flags: { yes: true } });

    const st = await lstat(join(projectDir, 'CLAUDE.md'));
    assert.equal(st.isSymbolicLink(), false, 'real file must NOT be replaced when contents differ');
    const content = await readFile(join(projectDir, 'CLAUDE.md'), 'utf8');
    assert.equal(content, 'PROJECT CONTENT');
  } finally {
    await rm(parent, { recursive: true, force: true });
  }
});

test('실파일이 backup과 동일하면 안전하게 symlink로 교체', async () => {
  const { parent, projectDir, backupDir } = await makeFixture();
  try {
    await writeFile(join(projectDir, 'CLAUDE.md'), 'SAME');
    await writeFile(join(backupDir, 'CLAUDE.md'), 'SAME');

    await runSymlink({ targetDir: projectDir, flags: { yes: true } });

    const st = await lstat(join(projectDir, 'CLAUDE.md'));
    assert.equal(st.isSymbolicLink(), true);
    const target = await readlink(join(projectDir, 'CLAUDE.md'));
    assert.ok(target.endsWith('CLAUDE.md'));
  } finally {
    await rm(parent, { recursive: true, force: true });
  }
});

test('실디렉토리 내용이 다르면 교체하지 않는다', async () => {
  const { parent, projectDir, backupDir } = await makeFixture();
  try {
    await mkdir(join(projectDir, '.claude'), { recursive: true });
    await writeFile(join(projectDir, '.claude/settings.json'), '{"a":1}');
    await mkdir(join(backupDir, '.claude'), { recursive: true });
    await writeFile(join(backupDir, '.claude/settings.json'), '{"a":2}');

    await runSymlink({ targetDir: projectDir, flags: { yes: true } });

    const st = await lstat(join(projectDir, '.claude'));
    assert.equal(st.isSymbolicLink(), false);
    const content = await readFile(join(projectDir, '.claude/settings.json'), 'utf8');
    assert.equal(content, '{"a":1}');
  } finally {
    await rm(parent, { recursive: true, force: true });
  }
});

test('항목이 없으면 새 symlink 생성', async () => {
  const { parent, projectDir, backupDir } = await makeFixture();
  try {
    await writeFile(join(backupDir, 'CLAUDE.md'), 'BACKUP');

    await runSymlink({ targetDir: projectDir, flags: { yes: true } });

    const st = await lstat(join(projectDir, 'CLAUDE.md'));
    assert.equal(st.isSymbolicLink(), true);
  } finally {
    await rm(parent, { recursive: true, force: true });
  }
});

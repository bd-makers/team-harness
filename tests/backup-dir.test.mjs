import { test } from 'node:test';
import assert from 'node:assert/strict';
import { mkdtemp, mkdir, writeFile, rm, symlink } from 'node:fs/promises';
import { join } from 'node:path';
import { tmpdir } from 'node:os';
import { resolveBackupDir } from '../src/backup-dir.mjs';

test('opts.backupDir override를 즉시 반환', async () => {
  const result = await resolveBackupDir('/nonexistent', { backupDir: '/custom/path' });
  assert.equal(result, '/custom/path');
});

test('opts.backupDir tilde를 절대경로로 확장', async () => {
  const { homedir } = await import('node:os');
  const result = await resolveBackupDir('/nonexistent', { backupDir: '~/my-backup' });
  assert.equal(result, `${homedir()}/my-backup`);
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

test('기존 symlink에서 backup dir 역추적', async () => {
  const parent = await mkdtemp(join(tmpdir(), 'harness-parent-'));
  const projectDir = join(parent, 'my-project');
  const backupDir = join(parent, 'harness-backup', 'my-project');
  try {
    await mkdir(projectDir, { recursive: true });
    await mkdir(backupDir, { recursive: true });
    await writeFile(join(backupDir, 'CLAUDE.md'), '# test');
    // Create CLAUDE.md in project as a symlink pointing into backup
    await symlink(join(backupDir, 'CLAUDE.md'), join(projectDir, 'CLAUDE.md'));
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

// ── 링크된 git 워크트리 ─────────────────────────────────────────────────────────
// 앱 워크트리(`<repo>/.claude/worktrees/<w>`)에서 `{parent,name}`의 `..`가 `.claude/worktrees/`로 풀리던 결함.
// 기대값은 메인 체크아웃 기준이다. tmpdir 은 macOS 에서 /var → /private/var 이므로 realpath 로 맞춘다.
async function worktreeFixture() {
  const { realpath } = await import('node:fs/promises');
  const { execFileSync } = await import('node:child_process');
  const parent = await realpath(await mkdtemp(join(tmpdir(), 'harness-wt-')));
  const main = join(parent, 'proj');
  await mkdir(main, { recursive: true });
  const git = (...args) => execFileSync('git', ['-C', main, ...args], { stdio: 'pipe' });
  git('init', '-q');
  git('-c', 'user.name=t', '-c', 'user.email=t@t', '-c', 'commit.gpgsign=false', 'commit', '-q', '--allow-empty', '-m', 'init');
  const wt = join(main, '.claude', 'worktrees', 'w1');
  git('worktree', 'add', '-q', '-b', 'w1', wt);
  return { parent, main, wt, cleanup: () => rm(parent, { recursive: true, force: true }) };
}

async function writeBackupJson(dir, data) {
  await mkdir(join(dir, '.harness'), { recursive: true });
  await writeFile(join(dir, '.harness/backup.json'), JSON.stringify(data));
}

test('워크트리: backup.json {parent,name}을 메인 체크아웃 기준으로 푼다 (load·resolve 공통)', async () => {
  const { loadBackupDir } = await import('../src/harness.mjs');
  const fx = await worktreeFixture();
  try {
    const cfg = { parent: 'harness-backup', name: 'proj' };
    await writeBackupJson(fx.main, cfg);
    await writeBackupJson(fx.wt, cfg);
    const expected = join(fx.parent, 'harness-backup', 'proj');
    assert.equal(await loadBackupDir(fx.main), expected, '메인 체크아웃 결과는 종전과 같다');
    assert.equal(await loadBackupDir(fx.wt), expected);
    assert.equal(await resolveBackupDir(fx.wt), expected);
  } finally {
    await fx.cleanup();
  }
});

test('워크트리: 하위 디렉터리 설치본도 메인 체크아웃의 같은 상대 위치 기준', async () => {
  const { loadBackupDir } = await import('../src/harness.mjs');
  const fx = await worktreeFixture();
  try {
    const cfg = { parent: 'harness-backup', name: 'pkg' };
    await writeBackupJson(join(fx.wt, 'pkg'), cfg);
    const expected = join(fx.main, 'harness-backup', 'pkg');
    assert.equal(await loadBackupDir(join(fx.wt, 'pkg')), expected);
    assert.equal(await resolveBackupDir(join(fx.wt, 'pkg')), expected);
  } finally {
    await fx.cleanup();
  }
});

test('워크트리: auto-detect 는 메인 체크아웃 이름으로 ../harness-backup/<name> 을 찾는다', async () => {
  const fx = await worktreeFixture();
  try {
    const backupDir = join(fx.parent, 'harness-backup', 'proj');
    await mkdir(backupDir, { recursive: true });
    assert.equal(await resolveBackupDir(fx.wt), backupDir);
  } finally {
    await fx.cleanup();
  }
});

test('backupAnchor: 메인·비-git 은 targetDir 그대로, 워크트리는 메인 체크아웃 쪽 경로', async () => {
  const { backupAnchor } = await import('../src/backup-dir.mjs');
  const fx = await worktreeFixture();
  const plain = await mkdtemp(join(tmpdir(), 'harness-nogit-'));
  try {
    assert.equal(await backupAnchor(fx.main), fx.main);
    assert.equal(await backupAnchor(plain), plain);
    assert.equal(await backupAnchor(fx.wt), fx.main);
  } finally {
    await fx.cleanup();
    await rm(plain, { recursive: true, force: true });
  }
});

test('backupAnchor: .git 에 둔 bare 저장소의 워크트리는 targetDir 그대로', async () => {
  const { backupAnchor } = await import('../src/backup-dir.mjs');
  const { realpath } = await import('node:fs/promises');
  const { execFileSync } = await import('node:child_process');
  const parent = await realpath(await mkdtemp(join(tmpdir(), 'harness-bare-')));
  const git = (...args) => execFileSync('git', args, { cwd: parent, stdio: 'pipe' });
  try {
    git('init', '-q', 'src');
    git('-C', 'src', '-c', 'user.name=t', '-c', 'user.email=t@t', '-c', 'commit.gpgsign=false', 'commit', '-q', '--allow-empty', '-m', 'init');
    git('clone', '-q', '--bare', 'src', join('bb', '.git'));
    git('-C', join('bb', '.git'), 'worktree', 'add', '-q', join(parent, 'bb', 'wt1'));
    const wt = join(parent, 'bb', 'wt1');
    assert.equal(await backupAnchor(wt), wt);
  } finally {
    await rm(parent, { recursive: true, force: true });
  }
});

test('backupAnchor: 상속된 GIT_DIR 을 무시하고 targetDir 로 저장소를 찾는다', async () => {
  const { backupAnchor } = await import('../src/backup-dir.mjs');
  const fx = await worktreeFixture();
  const plain = await mkdtemp(join(tmpdir(), 'harness-nogit-'));
  const saved = process.env.GIT_DIR;
  process.env.GIT_DIR = join(fx.main, '.git', 'worktrees', 'w1');
  try {
    assert.equal(await backupAnchor(plain), plain);
  } finally {
    if (saved === undefined) delete process.env.GIT_DIR; else process.env.GIT_DIR = saved;
    await fx.cleanup();
    await rm(plain, { recursive: true, force: true });
  }
});

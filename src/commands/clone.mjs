import { join, resolve } from 'node:path';
import { lstat, readlink, mkdir, copyFile, readdir, symlink as makeSymlink } from 'node:fs/promises';
import { resolveBackupDir } from '../backup-dir.mjs';
import { confirm } from '../prompt.mjs';

const ITEMS = ['CLAUDE.md', 'AGENTS.md', 'GEMINI.md', '.claude', '.cursor', '.opencode', '.cursorrules', 'docs', '.harness'];

async function mergeDirNewer(src, dst) {
  await mkdir(dst, { recursive: true });
  const entries = await readdir(src, { withFileTypes: true });
  for (const e of entries) {
    if (e.name === '.DS_Store') continue;
    const s = join(src, e.name);
    const d = join(dst, e.name);
    if (e.isDirectory()) {
      await mergeDirNewer(s, d);
    } else {
      const srcSt = await lstat(s);
      const dstSt = await lstat(d).catch(() => null);
      if (!dstSt || srcSt.mtimeMs > dstSt.mtimeMs) await copyFile(s, d);
    }
  }
}

export async function runClone(ctx) {
  const backupDir = await resolveBackupDir(ctx.targetDir);
  if (!backupDir) {
    console.error('No backup dir found. Run `harness-team init` or `harness-team backup` first.');
    process.exit(1);
  }

  console.log(`harness-team clone → ${ctx.targetDir}`);
  console.log(`  backup dir: ${backupDir}`);

  const ops = [];
  for (const item of ITEMS) {
    const src = join(ctx.targetDir, item);
    const dst = join(backupDir, item);
    const st = await lstat(src).catch(() => null);
    if (!st) { ops.push({ item, kind: 'skip', reason: 'not found' }); continue; }

    if (st.isSymbolicLink()) {
      const raw = await readlink(src);
      const resolved = resolve(ctx.targetDir, raw);
      if (resolved === backupDir || resolved.startsWith(backupDir + '/')) {
        ops.push({ item, kind: 'skip', reason: 'harness symlink' });
      } else {
        ops.push({ item, kind: 'symlink', src, dst, target: resolved });
      }
    } else if (st.isDirectory()) {
      ops.push({ item, kind: 'dir', src, dst });
    } else {
      ops.push({ item, kind: 'file', src, dst });
    }
  }

  const toProcess = ops.filter(o => o.kind !== 'skip');
  if (toProcess.length === 0) {
    console.log('Nothing to clone — all items are harness symlinks.');
    return;
  }

  console.log('\nItems to sync to backup dir:');
  for (const op of toProcess) console.log(`  ${op.kind}: ${op.item}`);

  const ok = ctx.flags.yes || await confirm('\nProceed?', { defaultYes: true });
  if (!ok) { console.log('Aborted.'); return; }

  await mkdir(backupDir, { recursive: true });

  for (const op of toProcess) {
    if (op.kind === 'symlink') {
      if (!await lstat(op.dst).catch(() => null)) await makeSymlink(op.target, op.dst);
      console.log(`  ✓ synced symlink: ${op.item} → ${op.target}`);
    } else if (op.kind === 'dir') {
      await mergeDirNewer(op.src, op.dst);
      console.log(`  ✓ merged dir: ${op.item}`);
    } else {
      const srcSt = await lstat(op.src);
      const dstSt = await lstat(op.dst).catch(() => null);
      if (!dstSt || srcSt.mtimeMs > dstSt.mtimeMs) {
        await copyFile(op.src, op.dst);
        console.log(`  ✓ copied (newer): ${op.item}`);
      } else {
        console.log(`  skip: ${op.item} (backup newer or equal)`);
      }
    }
  }

  console.log('\n✓ Clone complete.');
}

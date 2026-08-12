import { join } from 'node:path';
import { mkdir, lstat, cp, rm, symlink, unlink } from 'node:fs/promises';
import { loadBackupDir } from '../harness.mjs';
import { confirm } from '../prompt.mjs';

// Items moved from project into backupDir, then replaced with absolute symlinks.
// AGENTS.md / GEMINI.md are now real canonical files (not CLAUDE.md aliases), so they
// are moved like any other real file — never recreated as aliases.
const MOVE_ITEMS = ['CLAUDE.md', 'AGENTS.md', 'GEMINI.md', '.claude', '.cursor', '.opencode', '.codex', 'docs', '.harness'];

// Alias machinery retired: the only former alias (.cursorrules) is dropped, AGENTS.md/
// GEMINI.md became real files. Kept as an empty list to leave the wiring loop inert.
const ALIAS_ITEMS = [];

export async function runBackup(ctx) {
  const backupDir = await loadBackupDir(ctx.targetDir);
  if (!backupDir) {
    console.error('No backup dir configured. Run harness-team init first.');
    process.exit(1);
  }

  console.log(`harness-team backup → ${ctx.targetDir}`);
  console.log(`  backup dir: ${backupDir}`);

  const toMove = [];
  for (const item of MOVE_ITEMS) {
    const src = join(ctx.targetDir, item);
    const st = await lstat(src).catch(() => null);
    if (!st) continue;
    if (st.isSymbolicLink()) { console.log(`  skip: ${item} (already a symlink)`); continue; }
    toMove.push(item);
  }

  const toAlias = [];
  for (const item of ALIAS_ITEMS) {
    const src = join(ctx.targetDir, item);
    const dst = join(backupDir, item);
    const srcSt = await lstat(src).catch(() => null);
    const dstSt = await lstat(dst).catch(() => null);
    // needs work if project item isn't already an abs symlink to backupDir
    const alreadyDone = srcSt?.isSymbolicLink() && dstSt;
    if (!alreadyDone) toAlias.push(item);
    else console.log(`  skip: ${item} (already a symlink)`);
  }

  if (toMove.length === 0 && toAlias.length === 0) {
    console.log('Nothing to back up — all items already symlinked.');
    return;
  }

  if (toMove.length > 0) {
    console.log('\nItems to move to backup dir:');
    for (const item of toMove) console.log(`  ${item}`);
  }
  if (toAlias.length > 0) {
    console.log('\nAlias items to wire into backup dir:');
    for (const item of toAlias) console.log(`  ${item}`);
  }

  const ok = ctx.flags.yes || await confirm('\nProceed?', { defaultYes: true });
  if (!ok) { console.log('Aborted.'); return; }

  await mkdir(backupDir, { recursive: true });

  for (const item of toMove) {
    const src = join(ctx.targetDir, item);
    const dst = join(backupDir, item);
    await cp(src, dst, { recursive: true });
    await rm(src, { recursive: true, force: true });
    await symlink(dst, src);
    console.log(`  ✓ move  ${item} → ${dst}`);
  }

  for (const item of toAlias) {
    const src = join(ctx.targetDir, item);
    const dst = join(backupDir, item);
    // ensure backupDir alias exists as a relative symlink → CLAUDE.md
    if (!await lstat(dst).catch(() => null)) {
      await symlink('CLAUDE.md', dst);
      console.log(`  ✓ alias ${item} created in backup dir`);
    }
    // replace project version (relative symlink or file) with absolute symlink → backupDir/$item
    const srcSt = await lstat(src).catch(() => null);
    if (srcSt?.isSymbolicLink()) await unlink(src);
    else if (srcSt) await rm(src, { recursive: true, force: true });
    await symlink(dst, src);
    console.log(`  ✓ link  ${item} → ${dst}`);
  }

  console.log('\n✓ Backup complete. Run harness-doctor to verify.');
}

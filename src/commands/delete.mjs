import { join, resolve } from 'node:path';
import { lstat, readlink, unlink } from 'node:fs/promises';
import { resolveBackupDir } from '../backup-dir.mjs';
import { confirm } from '../prompt.mjs';

const MOVE_ITEMS = ['CLAUDE.md', '.claude', '.cursor', '.opencode', 'docs', '.harness', 'clone.sh', 'delete.sh'];
const ALIAS_ITEMS = ['AGENTS.md', 'GEMINI.md', '.cursorrules'];

export async function runDelete(ctx) {
  const backupDir = await resolveBackupDir(ctx.targetDir);
  if (!backupDir) {
    console.error('No backup dir found. Run `harness-team init` or `harness-team backup` first.');
    process.exit(1);
  }

  console.log(`harness-team delete → ${ctx.targetDir}`);
  console.log(`  backup dir: ${backupDir}`);

  const toRemove = [];

  for (const item of MOVE_ITEMS) {
    const p = join(ctx.targetDir, item);
    const st = await lstat(p).catch(() => null);
    if (!st) continue;
    if (st.isSymbolicLink()) {
      const raw = await readlink(p);
      const resolved = resolve(ctx.targetDir, raw);
      if (resolved === backupDir || resolved.startsWith(backupDir + '/')) {
        toRemove.push({ item, p });
      } else {
        console.log(`  skip: ${item} (local symlink → ${raw})`);
      }
    } else {
      console.log(`  skip: ${item} (not a symlink)`);
    }
  }

  for (const item of ALIAS_ITEMS) {
    const p = join(ctx.targetDir, item);
    const st = await lstat(p).catch(() => null);
    if (!st) continue;
    if (st.isSymbolicLink()) {
      toRemove.push({ item, p });
    } else {
      console.log(`  skip: ${item} (not a symlink, leaving untouched)`);
    }
  }

  if (toRemove.length === 0) { console.log('Nothing to remove.'); return; }

  console.log('\nItems to remove:');
  for (const op of toRemove) console.log(`  ${op.item}`);

  const ok = ctx.flags.yes || await confirm('\nProceed?', { defaultYes: true });
  if (!ok) { console.log('Aborted.'); return; }

  for (const op of toRemove) {
    await unlink(op.p);
    console.log(`  ✓ removed: ${op.item}`);
  }

  console.log('\n✓ Delete complete.');
}

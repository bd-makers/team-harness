import { join, resolve } from 'node:path';
import { lstat, readlink, unlink, rm } from 'node:fs/promises';
import { resolveBackupDir } from '../backup-dir.mjs';
import { readTextSafe } from '../fsx.mjs';
import { confirm } from '../prompt.mjs';

const MOVE_ITEMS = ['CLAUDE.md', '.claude', '.cursor', '.opencode', 'docs', '.harness', 'clone.sh', 'delete.sh'];
const ALIAS_ITEMS = ['AGENTS.md', 'GEMINI.md', '.cursorrules'];

export async function runDelete(ctx) {
  const includeReal = !!ctx.flags['include-real'];
  const backupDir = await resolveBackupDir(ctx.targetDir, { backupDir: ctx.flags['backup-dir'] });
  if (!backupDir) {
    console.error('No backup dir found. Run `harness-team init` or `harness-team backup` first.');
    process.exit(1);
  }

  console.log(`harness-team delete → ${ctx.targetDir}`);
  console.log(`  backup dir: ${backupDir}`);

  const toRemove = [];
  let savedBackupConfig = null;

  for (const item of MOVE_ITEMS) {
    const p = join(ctx.targetDir, item);
    const st = await lstat(p).catch(() => null);
    if (!st) continue;
    if (st.isSymbolicLink()) {
      const raw = await readlink(p);
      const resolved = resolve(ctx.targetDir, raw);
      if (resolved === backupDir || resolved.startsWith(backupDir + '/')) {
        toRemove.push({ item, p, kind: 'symlink' });
      } else {
        console.log(`  skip: ${item} (local symlink → ${raw})`);
      }
    } else if (includeReal) {
      if (item === '.harness') {
        const cfg = await readTextSafe(join(p, 'backup.json'));
        if (cfg) {
          try { savedBackupConfig = JSON.parse(cfg); } catch {}
        }
      }
      toRemove.push({ item, p, kind: 'real', isDir: st.isDirectory() });
    } else {
      console.log(`  skip: ${item} (not a symlink)`);
    }
  }

  for (const item of ALIAS_ITEMS) {
    const p = join(ctx.targetDir, item);
    const st = await lstat(p).catch(() => null);
    if (!st) continue;
    if (st.isSymbolicLink()) {
      toRemove.push({ item, p, kind: 'symlink' });
    } else {
      console.log(`  skip: ${item} (not a symlink, leaving untouched)`);
    }
  }

  if (toRemove.length === 0) { console.log('Nothing to remove.'); return { savedBackupConfig }; }

  console.log('\nItems to remove:');
  for (const op of toRemove) {
    const label = op.kind === 'real' ? ' (real file/dir — PERMANENT)' : '';
    console.log(`  ${op.item}${label}`);
  }

  const hasReal = toRemove.some(o => o.kind === 'real');
  const question = hasReal
    ? '\nThis will PERMANENTLY delete real files/dirs. Proceed?'
    : '\nProceed?';

  const ok = ctx.flags.yes || await confirm(question, { defaultYes: !hasReal });
  if (!ok) { console.log('Aborted.'); return { savedBackupConfig }; }

  for (const op of toRemove) {
    if (op.kind === 'real') {
      await rm(op.p, { recursive: true, force: true });
    } else {
      await unlink(op.p);
    }
    console.log(`  ✓ removed: ${op.item}`);
  }

  console.log('\n✓ Delete complete.');
  return { savedBackupConfig };
}

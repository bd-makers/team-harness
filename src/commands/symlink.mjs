import { join, resolve } from 'node:path';
import { lstat, readlink, rm, symlink as makeSymlink } from 'node:fs/promises';
import { resolveBackupDir } from '../backup-dir.mjs';
import { confirm } from '../prompt.mjs';

const MOVE_ITEMS = ['CLAUDE.md', '.claude', '.cursor', '.opencode', 'docs', '.harness'];
const ALIAS_ITEMS = ['AGENTS.md', 'GEMINI.md', '.cursorrules'];
const SCRIPT_ITEMS = ['clone.sh', 'delete.sh'];

export async function runSymlink(ctx) {
  const backupDir = await resolveBackupDir(ctx.targetDir);
  if (!backupDir) {
    console.error('No backup dir found. Run `harness-team init` or `harness-team backup` first.');
    process.exit(1);
  }

  const allItems = [...MOVE_ITEMS, ...ALIAS_ITEMS];
  for (const s of SCRIPT_ITEMS) {
    if (await lstat(join(backupDir, s)).catch(() => null)) allItems.push(s);
  }

  console.log(`harness-team symlink → ${ctx.targetDir}`);
  console.log(`  backup dir: ${backupDir}`);

  const ops = [];
  for (const item of allItems) {
    const backup = join(backupDir, item);
    if (!await lstat(backup).catch(() => null)) {
      ops.push({ item, kind: 'skip', reason: 'not in backup' });
      continue;
    }

    const link = join(ctx.targetDir, item);
    const linkSt = await lstat(link).catch(() => null);

    if (!linkSt) {
      ops.push({ item, kind: 'link', link, backup });
    } else if (linkSt.isSymbolicLink()) {
      const raw = await readlink(link);
      const resolved = resolve(ctx.targetDir, raw);
      if (resolved === backup) {
        ops.push({ item, kind: 'skip', reason: 'already linked' });
      } else {
        ops.push({ item, kind: 'replace', link, backup });
      }
    } else {
      ops.push({ item, kind: 'replace', link, backup });
    }
  }

  const toProcess = ops.filter(o => o.kind !== 'skip');
  if (toProcess.length === 0) {
    console.log('Nothing to symlink — all already linked.');
    return;
  }

  console.log('\nItems to link:');
  for (const op of toProcess) console.log(`  ${op.kind}: ${op.item} → ${op.backup}`);

  const ok = ctx.flags.yes || await confirm('\nProceed?', { defaultYes: true });
  if (!ok) { console.log('Aborted.'); return; }

  for (const op of toProcess) {
    if (op.kind === 'replace') await rm(op.link, { recursive: true, force: true });
    await makeSymlink(op.backup, op.link);
    console.log(`  ✓ linked: ${op.item} → ${op.backup}`);
  }

  console.log('\n✓ Symlink complete.');
}

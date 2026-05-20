import { join, resolve } from 'node:path';
import { lstat, readlink, readdir, readFile, rm, symlink as makeSymlink } from 'node:fs/promises';
import { resolveBackupDir } from '../backup-dir.mjs';
import { confirm } from '../prompt.mjs';

async function sameTree(a, b) {
  const sa = await lstat(a).catch(() => null);
  const sb = await lstat(b).catch(() => null);
  if (!sa || !sb) return false;
  if (sa.isDirectory() && sb.isDirectory()) {
    const [ea, eb] = await Promise.all([readdir(a), readdir(b)]);
    const ah = [...ea].sort();
    const bh = [...eb].sort();
    if (ah.length !== bh.length) return false;
    for (let i = 0; i < ah.length; i++) {
      if (ah[i] !== bh[i]) return false;
      if (!await sameTree(join(a, ah[i]), join(b, bh[i]))) return false;
    }
    return true;
  }
  if (sa.isFile() && sb.isFile()) {
    if (sa.size !== sb.size) return false;
    const [ca, cb] = await Promise.all([readFile(a), readFile(b)]);
    return ca.equals(cb);
  }
  return false;
}

const MOVE_ITEMS = ['CLAUDE.md', '.claude', '.cursor', '.opencode', 'docs', '.harness'];
const ALIAS_ITEMS = ['AGENTS.md', 'GEMINI.md', '.cursorrules'];
const SCRIPT_ITEMS = ['clone.sh', 'delete.sh'];

export async function runSymlink(ctx) {
  const backupDir = await resolveBackupDir(ctx.targetDir, { backupDir: ctx.flags['backup-dir'] });
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
      if (await sameTree(link, backup)) {
        ops.push({ item, kind: 'replace', link, backup, identical: true });
      } else {
        ops.push({
          item,
          kind: 'skip',
          reason: 'real file differs from backup — run `harness-team clone` first, then re-run',
        });
      }
    }
  }

  const skipped = ops.filter(o => o.kind === 'skip' && o.reason && o.reason !== 'not in backup' && o.reason !== 'already linked');
  if (skipped.length > 0) {
    console.log('\nSkipped (needs manual action):');
    for (const op of skipped) console.log(`  ! ${op.item}: ${op.reason}`);
  }

  const toProcess = ops.filter(o => o.kind !== 'skip');
  if (toProcess.length === 0) {
    console.log('Nothing to symlink — all already linked or skipped.');
    return;
  }

  console.log('\nItems to link:');
  for (const op of toProcess) {
    const note = op.identical ? ' (identical → safe replace)' : '';
    console.log(`  ${op.kind}: ${op.item} → ${op.backup}${note}`);
  }

  const ok = ctx.flags.yes || await confirm('\nProceed?', { defaultYes: true });
  if (!ok) { console.log('Aborted.'); return; }

  for (const op of toProcess) {
    if (op.kind === 'replace') await rm(op.link, { recursive: true, force: true });
    await makeSymlink(op.backup, op.link);
    console.log(`  ✓ linked: ${op.item} → ${op.backup}`);
  }

  console.log('\n✓ Symlink complete.');
}

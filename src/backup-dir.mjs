import { join, resolve, dirname, basename } from 'node:path';
import { lstat, readlink } from 'node:fs/promises';
import { readTextSafe, exists } from './fsx.mjs';

const PROBE_ITEMS = ['CLAUDE.md', '.claude'];
const DEFAULT_BACKUP_PARENT = 'harness-backup';

export async function resolveBackupDir(targetDir, { backupDir } = {}) {
  if (backupDir) return backupDir;

  // 1. Try .harness/backup.json
  const cfg = await readTextSafe(join(targetDir, '.harness/backup.json'));
  if (cfg) {
    try {
      const data = JSON.parse(cfg);
      if (data.dir) return data.dir;
      const { parent, name } = data;
      if (parent && name) return join(targetDir, '..', parent, name);
    } catch {}
  }

  // 2. Fallback: probe existing symlinks to reverse-engineer backup dir
  for (const item of PROBE_ITEMS) {
    const p = join(targetDir, item);
    try {
      const st = await lstat(p);
      if (st.isSymbolicLink()) {
        const raw = await readlink(p);
        const resolved = resolve(targetDir, raw);
        return dirname(resolved);
      }
    } catch {}
  }

  // 3. Auto-detect ../harness-backup/<projectName>
  const autoPath = join(targetDir, '..', DEFAULT_BACKUP_PARENT, basename(targetDir));
  if (await exists(autoPath)) return autoPath;

  return null;
}

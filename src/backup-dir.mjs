import { join, resolve, dirname } from 'node:path';
import { lstat, readlink } from 'node:fs/promises';
import { readTextSafe } from './fsx.mjs';

const PROBE_ITEMS = ['CLAUDE.md', '.claude'];

export async function resolveBackupDir(targetDir) {
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

  return null;
}

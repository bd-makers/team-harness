import { symlink, lstat, unlink, copyFile, readlink } from 'node:fs/promises';
import { platform } from 'node:os';

export async function ensureSymlink(target, linkPath, { copyFallback = platform() === 'win32' } = {}) {
  try {
    const st = await lstat(linkPath);
    if (st.isSymbolicLink()) {
      const current = await readlink(linkPath);
      if (current === target) return { action: 'skip', reason: 'already linked' };
      await unlink(linkPath);
    } else {
      return { action: 'skip', reason: 'exists (not a symlink) — leaving untouched' };
    }
  } catch {
    // doesn't exist — fall through
  }

  if (copyFallback) {
    await copyFile(target, linkPath);
    return { action: 'copy', reason: 'symlink unsupported, copied instead' };
  }
  await symlink(target, linkPath);
  return { action: 'link', reason: 'created' };
}

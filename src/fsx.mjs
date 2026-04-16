import { mkdir, readFile, writeFile, copyFile, readdir, stat, chmod } from 'node:fs/promises';
import { join, dirname, basename, relative } from 'node:path';

export async function exists(p) {
  try { await stat(p); return true; } catch { return false; }
}

export async function readTextSafe(p) {
  try { return await readFile(p, 'utf8'); } catch { return null; }
}

export async function writeText(p, content, { mode } = {}) {
  await mkdir(dirname(p), { recursive: true });
  await writeFile(p, content);
  if (mode !== undefined) await chmod(p, mode);
}

export async function copyTree(srcDir, dstDir, { skipExisting = false } = {}) {
  const out = [];
  const entries = await readdir(srcDir, { withFileTypes: true });
  await mkdir(dstDir, { recursive: true });
  for (const e of entries) {
    if (e.name === '.DS_Store') continue;
    const s = join(srcDir, e.name);
    const d = join(dstDir, e.name);
    if (e.isDirectory()) {
      out.push(...await copyTree(s, d, { skipExisting }));
    } else {
      if (skipExisting && await exists(d)) { out.push({ path: d, action: 'skip' }); continue; }
      await copyFile(s, d);
      if (s.endsWith('.sh')) await chmod(d, 0o755);
      out.push({ path: d, action: 'write' });
    }
  }
  return out;
}

export { relative, basename, dirname, join };

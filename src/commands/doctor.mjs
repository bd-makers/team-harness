import { lstat, readlink, readFile } from 'node:fs/promises';
import { join } from 'node:path';
import { exists } from '../fsx.mjs';
import { loadBackupDir } from '../harness.mjs';

const CHECKS = [
  { path: 'CLAUDE.md', required: true },
  { path: 'AGENTS.md', symlink: 'CLAUDE.md' },
  { path: 'GEMINI.md', symlink: 'CLAUDE.md' },
  { path: '.cursorrules', symlink: 'CLAUDE.md' },
  { path: '.claude/settings.json', required: true, json: true },
  { path: '.claude/hooks/protect-files.sh', executable: true },
  { path: '.claude/hooks/auto-format.sh', executable: true },
  { path: '.claude/hooks/pre-commit-check.sh', executable: true },
  { path: '.cursor/rules', required: false, dir: true },
  { path: '.opencode/opencode.json', required: false, json: true },
  { path: 'docs/README.md', required: false },
  { path: '.harness/backup.json', required: true, json: true },
];

const BACKUP_SCRIPTS = ['clone.sh', 'symlink.sh', 'delete.sh'];

export async function runDoctor(ctx) {
  console.log(`harness-team doctor → ${ctx.targetDir}\n`);
  let fail = 0;
  for (const c of CHECKS) {
    const p = join(ctx.targetDir, c.path);
    const ok = await exists(p);
    if (!ok) {
      if (c.required) { console.log(`✗ ${c.path}  (missing)`); fail++; }
      else console.log(`- ${c.path}  (not present, optional)`);
      continue;
    }
    if (c.symlink) {
      const st = await lstat(p);
      if (!st.isSymbolicLink()) { console.log(`✗ ${c.path}  (not a symlink)`); fail++; continue; }
      const tgt = await readlink(p);
      if (tgt !== c.symlink) { console.log(`✗ ${c.path}  (→ ${tgt}, expected ${c.symlink})`); fail++; continue; }
      console.log(`✓ ${c.path}  → ${tgt}`);
      continue;
    }
    if (c.json) {
      try { JSON.parse(await readFile(p, 'utf8')); console.log(`✓ ${c.path}  (valid JSON)`); }
      catch (e) { console.log(`✗ ${c.path}  (invalid JSON: ${e.message})`); fail++; }
      continue;
    }
    if (c.executable) {
      const st = await lstat(p);
      if (!(st.mode & 0o100)) { console.log(`✗ ${c.path}  (not executable)`); fail++; continue; }
      console.log(`✓ ${c.path}  (exec)`);
      continue;
    }
    console.log(`✓ ${c.path}`);
  }
  // Harness scripts live in the project root since v0.3+.
  console.log('');
  for (const name of BACKUP_SCRIPTS) {
    const p = join(ctx.targetDir, name);
    if (!(await exists(p))) { console.log(`✗ ${name}  (missing in project root)`); fail++; continue; }
    const st = await lstat(p);
    if (!(st.mode & 0o100)) { console.log(`✗ ${name}  (not executable)`); fail++; continue; }
    console.log(`✓ ${name}  (exec)`);
  }

  const backupDir = await loadBackupDir(ctx.targetDir);
  if (backupDir) {
    console.log(`\nbackup clone dir: ${backupDir}`);
  } else {
    console.log(`\n✗ backup clone dir is not configured (missing .harness/backup.json)`);
    fail++;
  }

  console.log(fail ? `\n${fail} problem(s). Run: harness-team sync` : '\nAll checks passed.');
  if (fail) process.exitCode = 1;
}

import { join, resolve } from 'node:path';
import { readFile, writeFile, access, appendFile, chmod, stat } from 'node:fs/promises';
import { execFile } from 'node:child_process';
import { promisify } from 'node:util';

const pexec = promisify(execFile);

export const POST_COMMIT_HOOK = `#!/bin/sh
# harness: auto-update handoff on commit
harness-team handoff 2>/dev/null || true
`;

// The line that proves the hook is installed. `includes('harness')` used to count a
// stray comment containing the word as "already installed" and skip the install.
export const POST_COMMIT_MARKER = 'harness-team handoff';

// Where git will actually read hooks from. Honours `core.hooksPath` (husky, lefthook,
// a shared hooks dir) and worktrees, whose `.git` is a file pointing at the main
// repository. Joining `.git/hooks` by hand covered neither: the hook was written where
// git never looks, or the install was skipped without a word. `null` = not a git repo.
export async function resolveHooksDir(targetDir) {
  try {
    const { stdout } = await pexec('git', ['-C', targetDir, 'rev-parse', '--git-path', 'hooks'], { timeout: 5000 });
    const out = stdout.trim();
    return out ? resolve(targetDir, out) : null;
  } catch {
    return null;
  }
}

export async function installPostCommitHook(targetDir) {
  const hooksDir = await resolveHooksDir(targetDir);
  if (!hooksDir) return; // not a git repo (or no git) — nothing to hook into
  try {
    await access(hooksDir);
  } catch {
    // `core.hooksPath` pointing at a directory that does not exist yet. Say so instead
    // of vanishing — no hook runs until that directory does.
    console.log(`  post-commit hook: hooks dir not found (${hooksDir}) — skipping`);
    return;
  }

  const hookPath = join(hooksDir, 'post-commit');
  let existing = null;
  try {
    existing = await readFile(hookPath, 'utf8');
  } catch { /* doesn't exist */ }

  if (existing !== null) {
    // Only a live (non-comment) line counts — a comment that merely mentions the
    // command must not pass for an install (codex review P2, 2026-09-03).
    const installed = existing.split('\n').some(line => !/^\s*#/.test(line) && line.includes(POST_COMMIT_MARKER));
    if (installed) return;
    await appendFile(hookPath, '\n' + POST_COMMIT_HOOK);
    const st = await stat(hookPath);
    if (!(st.mode & 0o111)) await chmod(hookPath, st.mode | 0o755);
    console.log('  post-commit hook: appended harness line');
  } else {
    await writeFile(hookPath, POST_COMMIT_HOOK, 'utf8');
    await chmod(hookPath, 0o755);
    console.log('  post-commit hook: installed');
  }
}

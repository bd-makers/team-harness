import { join, resolve } from 'node:path';
import { readFile, writeFile, access, appendFile, chmod, stat, mkdir } from 'node:fs/promises';
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

// Whether the repository points git at its own hooks directory. A missing directory means
// two different things, and only one of them is ours to fix.
async function hasCustomHooksPath(targetDir) {
  try {
    const { stdout } = await pexec('git', ['-C', targetDir, 'config', '--get', 'core.hooksPath'], { timeout: 5000 });
    return stdout.trim().length > 0;
  } catch {
    return false; // exit 1 = not set
  }
}

export async function installPostCommitHook(targetDir) {
  const hooksDir = await resolveHooksDir(targetDir);
  if (!hooksDir) return; // not a git repo (or no git) — nothing to hook into
  try {
    await access(hooksDir);
  } catch {
    if (await hasCustomHooksPath(targetDir)) {
      // The repository declared its own hooks directory (husky, lefthook, a shared dir) and it
      // is not there yet. That directory belongs to that tool, so creating it would install our
      // hook into a manager that has not run its own setup. Say so instead of vanishing.
      console.log(`  post-commit hook: hooks dir not found (${hooksDir}) — skipping`);
      return;
    }
    // Default `.git/hooks`, simply absent — git creates it from a template at init time and a
    // repository can end up without one (empty `init.templateDir`, a pruned clone). git still
    // reads hooks from there, so the directory is ours to create. Skipping here is how bodoc4
    // ended up with `--mirror` reporting success while no hook was ever installed (2026-09-21).
    await mkdir(hooksDir, { recursive: true });
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

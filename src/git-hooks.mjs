import { join } from 'node:path';
import { readFile, writeFile, access, appendFile, chmod } from 'node:fs/promises';

export const POST_COMMIT_HOOK = `#!/bin/sh
# harness: auto-update handoff on commit
harness-team handoff 2>/dev/null || true
`;

export async function installPostCommitHook(targetDir) {
  const hooksDir = join(targetDir, '.git', 'hooks');
  try {
    await access(hooksDir);
  } catch {
    return; // not a git repo or no hooks dir
  }

  const hookPath = join(hooksDir, 'post-commit');
  let existing = null;
  try {
    existing = await readFile(hookPath, 'utf8');
  } catch { /* doesn't exist */ }

  if (existing !== null) {
    if (existing.includes('harness')) return; // already installed
    await appendFile(hookPath, '\n' + POST_COMMIT_HOOK);
    console.log('  post-commit hook: appended harness line');
  } else {
    await writeFile(hookPath, POST_COMMIT_HOOK, 'utf8');
    await chmod(hookPath, 0o755);
    console.log('  post-commit hook: installed');
  }
}

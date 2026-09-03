// L1 — init smoke: a fresh sandbox of each stack gets the full harness installed,
// every expected artifact exists, the stack is detected correctly, and
// `doctor --json` reports success (exit 0).
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { access } from 'node:fs/promises';
import { join } from 'node:path';
import { STACKS, appliedSandbox } from './sandbox.mjs';

const REQUIRED_PATHS = [
  'AGENTS.md', 'CLAUDE.md',
  'clone.sh', 'symlink.sh', 'delete.sh',
  '.claude/settings.json',
  '.claude/hooks/protect-files.sh',
  '.claude/hooks/block-dangerous-git.sh',
  '.claude/hooks/boundary-checkpoint.sh',
  '.claude/hooks/auto-format.sh',
  '.claude/hooks/pre-commit-check.sh',
  '.claude/hooks/observe-tools.mjs',
  '.codex/hooks.json',
  '.harness/backup.json',
  '.harness/active.json',
  'docs/README.md',
  '.git/hooks/post-commit',
];

for (const stack of STACKS) {
  test(`L1 init-smoke [${stack.label}]: artifacts + stack detect + doctor green`, async () => {
    const sb = await appliedSandbox(stack);
    try {
      assert.equal(sb.initResult.code, 0, `init failed:\n${sb.initResult.stderr}`);
      assert.match(sb.initResult.stdout, new RegExp(`\\(${stack.id}\\)`), 'detect-stack should report the expected stack id');

      for (const p of REQUIRED_PATHS) {
        await access(join(sb.dir, p)); // throws → test fails if missing
      }
      // The shipped rules are all React Native / Expo specific, so only an RN project
      // receives `.claude/rules` and therefore a `.cursor/rules` mirror. A bare Node or
      // Next.js project starts with no rules — and no empty mirror directory.
      const mirror = await access(join(sb.dir, '.cursor/rules')).then(() => true, () => false);
      assert.equal(mirror, stack.id === 'react-native', `.cursor/rules should exist only for RN stacks (stack=${stack.id})`);

      const gitignore = await (await import('node:fs/promises')).readFile(join(sb.dir, '.gitignore'), 'utf8');
      assert.match(gitignore, /^\.harness\/observability\/$/m, 'observability logs must always be gitignored');

      const doc = await sb.cli(['doctor', '--json']);
      assert.equal(doc.code, 0, `doctor exit non-zero:\n${doc.stdout}\n${doc.stderr}`);
      const env = JSON.parse(doc.stdout);
      assert.equal(env.status, 'success', `doctor status: ${env.status} — ${env.summary}`);
    } finally {
      await sb.cleanup();
    }
  });
}

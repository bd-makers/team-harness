// L2 — task lifecycle: create a task (4 SSOT files), commit (post-commit hook
// updates handoff), hit the done guard, then force-complete (active.json cleared).
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { access, readFile } from 'node:fs/promises';
import { join } from 'node:path';
import { STACKS, appliedSandbox } from './sandbox.mjs';

for (const stack of STACKS) {
  test(`L2 lifecycle [${stack.label}]: task → commit → handoff → done guard → force`, async () => {
    const sb = await appliedSandbox(stack);
    try {
      assert.equal(sb.applyResult.code, 0, sb.applyResult.stderr);

      // create task → 4 SSOT files + active.json populated
      const created = await sb.cli(['task', 'demo']);
      assert.equal(created.code, 0, created.stderr);
      for (const kind of ['spec', 'plan', 'handoff', 'artifact']) {
        await access(join(sb.dir, `docs/tester/demo/demo-${kind}.md`));
      }
      const active = JSON.parse(await readFile(join(sb.dir, '.harness/active.json'), 'utf8'));
      assert.equal(active.task, 'demo');

      // commit → post-commit hook appends the commit message to the task handoff
      const committed = await sb.gitCommit('feat: scaffold harness and task');
      assert.equal(committed.code, 0, committed.stderr);
      const handoff = await readFile(join(sb.dir, 'docs/tester/demo/demo-handoff.md'), 'utf8');
      assert.match(handoff, /feat: scaffold harness and task/, 'post-commit hook should record the commit in handoff');

      // done guard fires on template artifact / uncommitted backup churn
      const guarded = await sb.cli(['done']);
      assert.equal(guarded.code, 1, 'done guard should block an incomplete task');

      // force completes: active.json cleared to null
      const forced = await sb.cli(['done', '--force']);
      assert.equal(forced.code, 0, forced.stderr);
      const cleared = JSON.parse(await readFile(join(sb.dir, '.harness/active.json'), 'utf8'));
      assert.equal(cleared, null, 'active.json should be cleared after done');
    } finally {
      await sb.cleanup();
    }
  });
}

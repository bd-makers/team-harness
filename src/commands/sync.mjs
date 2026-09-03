import { mirrorCursorRules } from '../harness.mjs';
import { ensureUsername } from '../user-config.mjs';
import { installPostCommitHook } from '../git-hooks.mjs';

export async function runSync(ctx) {
  console.log(`harness-team sync → ${ctx.targetDir}`);
  await ensureUsername(ctx.targetDir, ctx.flags);
  const results = await mirrorCursorRules(ctx);
  await installPostCommitHook(ctx.targetDir);
  const mirrored = results.filter(r => r.action === 'mirror');
  const pruned = results.filter(r => r.action === 'prune');
  console.log(`✓ Mirrored ${mirrored.length} cursor rule(s)`);
  if (pruned.length) console.log(`✓ Pruned ${pruned.length} stale cursor rule(s) (source removed)`);
  console.log(`  (agent files are real files now — no symlinks to re-create; run \`init\` to refresh AGENTS/CLAUDE)`);
}

import { mirrorCursorRules } from '../harness.mjs';
import { ensureUsername } from '../user-config.mjs';
import { installPostCommitHook } from '../git-hooks.mjs';

export async function runSync(ctx) {
  console.log(`harness-team sync → ${ctx.targetDir}`);
  await ensureUsername(ctx.targetDir, ctx.flags);
  const mirrored = await mirrorCursorRules(ctx);
  await installPostCommitHook(ctx.targetDir);
  console.log(`✓ Mirrored ${mirrored.length} cursor rule(s)`);
  console.log(`  (agent files are real files now — no symlinks to re-create; run \`apply\` to refresh AGENTS/CLAUDE/GEMINI)`);
}

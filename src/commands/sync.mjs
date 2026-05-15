import { mirrorCursorRules, setupSymlinks } from '../harness.mjs';
import { ensureUsername } from '../user-config.mjs';
import { installPostCommitHook } from '../git-hooks.mjs';

export async function runSync(ctx) {
  console.log(`harness-team sync → ${ctx.targetDir}`);
  await ensureUsername(ctx.targetDir, ctx.flags);
  const mirrored = await mirrorCursorRules(ctx);
  const links = await setupSymlinks(ctx);
  await installPostCommitHook(ctx.targetDir);
  console.log(`✓ Mirrored ${mirrored.length} cursor rule(s)`);
  for (const l of links) console.log(`  ${l.action.padEnd(5)} ${l.link}  [${l.reason}]`);
}

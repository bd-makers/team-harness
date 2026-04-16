import { mirrorCursorRules, setupSymlinks } from '../harness.mjs';

export async function runSync(ctx) {
  console.log(`harness-team sync → ${ctx.targetDir}`);
  const mirrored = await mirrorCursorRules(ctx);
  const links = await setupSymlinks(ctx);
  console.log(`✓ Mirrored ${mirrored.length} cursor rule(s)`);
  for (const l of links) console.log(`  ${l.action.padEnd(5)} ${l.link}  [${l.reason}]`);
}

import { join } from 'node:path';
import { readFile, writeFile, mkdir, access, appendFile, chmod } from 'node:fs/promises';
import { execFile } from 'node:child_process';
import { promisify } from 'node:util';
import { mirrorCursorRules, setupSymlinks } from '../harness.mjs';
import { confirm, ask } from '../prompt.mjs';

const pexec = promisify(execFile);

async function ensureUsername(targetDir, flags = {}) {
  const configPath = join(targetDir, '.harness', 'config.json');
  let config = {};
  try {
    config = JSON.parse(await readFile(configPath, 'utf8'));
  } catch { /* file may not exist yet */ }

  if (config.user) return; // already configured

  let name;
  if (flags.yes) {
    // silent fallback: git config → $USER → 'unknown'
    try {
      const { stdout } = await pexec('git', ['-C', targetDir, 'config', 'user.name']);
      name = stdout.trim() || null;
    } catch { /* ignore */ }
    name = name || process.env.USER || process.env.USERNAME || 'unknown';
  } else {
    let gitName = null;
    try {
      const { stdout } = await pexec('git', ['-C', targetDir, 'config', 'user.name']);
      gitName = stdout.trim() || null;
    } catch { /* ignore */ }

    if (gitName) {
      const ok = await confirm(
        `\ndocs/ 경로에 사용할 이름이 '${gitName}'으로 설정됩니다. 맞나요?`,
        { defaultYes: true },
      );
      name = ok ? gitName : await ask('사용할 이름을 입력하세요:');
    } else {
      name = await ask('docs/ 경로에 사용할 이름을 입력하세요:');
    }
  }

  config.user = name;
  await mkdir(join(targetDir, '.harness'), { recursive: true });
  await writeFile(configPath, JSON.stringify(config, null, 2) + '\n', 'utf8');
  console.log(`  user: ${name}`);
}

const POST_COMMIT_HOOK = `#!/bin/sh
# harness: auto-update handoff on commit
harness-team handoff 2>/dev/null || true
`;

async function installPostCommitHook(targetDir) {
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

export async function runSync(ctx) {
  console.log(`harness-team sync → ${ctx.targetDir}`);
  await ensureUsername(ctx.targetDir, ctx.flags);
  const mirrored = await mirrorCursorRules(ctx);
  const links = await setupSymlinks(ctx);
  await installPostCommitHook(ctx.targetDir);
  console.log(`✓ Mirrored ${mirrored.length} cursor rule(s)`);
  for (const l of links) console.log(`  ${l.action.padEnd(5)} ${l.link}  [${l.reason}]`);
}

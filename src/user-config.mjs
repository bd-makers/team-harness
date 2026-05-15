import { join } from 'node:path';
import { readFile, writeFile, mkdir } from 'node:fs/promises';
import { execFile } from 'node:child_process';
import { promisify } from 'node:util';
import { confirm, ask } from './prompt.mjs';

const pexec = promisify(execFile);

export async function ensureUsername(targetDir, flags = {}) {
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

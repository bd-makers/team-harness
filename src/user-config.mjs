import { join } from 'node:path';
import { readFile, writeFile, mkdir } from 'node:fs/promises';
import { execFile } from 'node:child_process';
import { promisify } from 'node:util';
import { confirm, ask } from './prompt.mjs';

const pexec = promisify(execFile);

function configPathOf(targetDir) {
  return join(targetDir, '.harness', 'config.json');
}

async function readConfig(targetDir) {
  try {
    return JSON.parse(await readFile(configPathOf(targetDir), 'utf8'));
  } catch { return {}; } // file may not exist yet
}

// 결정만 한다 — 파일을 쓰지 않는다. 이미 user가 있으면 null(저장할 것 없음).
// init은 이 값을 계획 단계에서 들고 있다가 최종 Apply 뒤에 saveUsername으로 저장한다 —
// 그전에 쓰면 "Apply?"에 n을 답해도 .harness/config.json이 남는다(2026-09-13 Codex 분석 P2).
export async function resolveUsername(targetDir, flags = {}) {
  const config = await readConfig(targetDir);
  if (config.user) return null; // already configured

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
  console.log(`  user: ${name}`);
  return name;
}

export async function saveUsername(targetDir, name) {
  const config = await readConfig(targetDir);
  config.user = name;
  await mkdir(join(targetDir, '.harness'), { recursive: true });
  await writeFile(configPathOf(targetDir), JSON.stringify(config, null, 2) + '\n', 'utf8');
}

// 종전 동작: 결정 즉시 저장. 계획/적용 분기가 없는 sync가 쓴다.
export async function ensureUsername(targetDir, flags = {}) {
  const name = await resolveUsername(targetDir, flags);
  if (name) await saveUsername(targetDir, name);
}

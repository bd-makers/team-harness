// `harness-team gate commit|format` — runs only what .harness/config.json declares.
// The hooks are thin wrappers around these verbs, so no language or package-manager branch
// lives in hook code (D11); what to run is the developer's confirmed preset proposal.
import { spawnSync } from 'node:child_process';
import { realpath } from 'node:fs/promises';
import { basename, isAbsolute, join, matchesGlob, relative, sep } from 'node:path';
import { readConfigStrict } from '../user-config.mjs';

const CONFIG_HINT = '.harness/config.json 의 gates.commit 을 고치거나 `harness-team gate suggest` 를 실행하세요.';

export async function runGate(ctx) {
  const [verb, ...rest] = ctx.taskArgs || [];
  if (verb === 'commit' && rest.length === 0) return gateCommit(ctx);
  if (verb === 'format' && rest.length === 1) return gateFormat(ctx, rest[0]);
  console.error('usage: harness-team gate commit | format <file> | suggest');
  process.exitCode = 2;
}

function block(msg) {
  console.error(`❌ ${msg}\n   커밋을 중단합니다.`);
  process.exitCode = 2;
}

async function gateCommit(ctx) {
  let config;
  try { config = await readConfigStrict(ctx.targetDir); }
  catch (e) { return block(`설정 오류: ${e.message}`); }
  const list = config.gates?.commit;
  if (list === undefined) {
    console.error('ℹ️ 커밋 게이트 미설정 — `harness-team gate suggest` 로 설정할 수 있습니다.');
    return;
  }
  if (!Array.isArray(list) || list.some(c => typeof c !== 'string' || !c.trim())) {
    return block(`설정 오류: gates.commit 은 비어 있지 않은 문자열 배열이어야 합니다 — ${CONFIG_HINT}`);
  }
  console.error(`🔍 커밋 전 검증 실행 중... (${list.length}개)`);
  for (const cmd of list) {
    // Command output goes to stderr: that is the channel Claude reads when a PreToolUse hook exits 2.
    const r = spawnSync('/bin/sh', ['-c', cmd], { cwd: ctx.targetDir, stdio: ['ignore', 2, 2] });
    if (r.status === 127) return block(`설정 오류: 명령을 찾을 수 없습니다 — ${cmd}\n   → ${CONFIG_HINT}`);
    if (r.status !== 0) return block(`커밋 게이트 실패: ${cmd} (exit ${r.status ?? r.signal})`);
  }
  console.error('✅ 검증 통과. 커밋을 진행합니다.');
}

// A convenience, not a control: every failure ends quietly with exit 0.
async function gateFormat(ctx, file) {
  let config, root, abs;
  try {
    config = await readConfigStrict(ctx.targetDir);
    // realpath both sides: on macOS the cwd resolves to /private/var while the edited path
    // may arrive as /var, and a lexical relative() would then place the file outside the project.
    root = await realpath(ctx.targetDir);
    abs = await realpath(isAbsolute(file) ? file : join(ctx.targetDir, file));
  } catch { return; }
  const format = config.format;
  if (!format || typeof format !== 'object' || Array.isArray(format)) return;
  const rel = relative(root, abs);
  if (rel === '' || rel === '..' || rel.startsWith(`..${sep}`) || isAbsolute(rel)) return;
  for (const [glob, cmds] of Object.entries(format)) {
    if (!Array.isArray(cmds) || !matchesGlob(glob.includes('/') ? rel : basename(rel), glob)) continue;
    for (const cmd of cmds) {
      if (typeof cmd !== 'string' || !cmd.trim()) continue;
      // The path rides in as "$1", never spliced into the command string, so spaces and quotes are safe.
      spawnSync('/bin/sh', ['-c', `${cmd} "$@"`, 'sh', file], { cwd: ctx.targetDir, stdio: 'ignore' });
    }
  }
}

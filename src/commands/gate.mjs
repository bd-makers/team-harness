// `harness-team gate commit|format|suggest` — runs only what .harness/gates.json declares.
// The hooks are thin wrappers around these verbs, so no language or package-manager branch
// lives in hook code (D11); what to run is the developer's confirmed preset proposal.
import { spawnSync } from 'node:child_process';
import { realpath } from 'node:fs/promises';
import { basename, isAbsolute, join, matchesGlob, relative, sep } from 'node:path';
import { resolveStack } from '../detect-stack.mjs';
import { loadRenderState } from '../render-state.mjs';
import { confirm } from '../prompt.mjs';
import { applyProposal, buildProposal, describeProposal, readGates, GATES_REL } from '../presets.mjs';

const CONFIG_HINT = `${GATES_REL} 의 commit 을 고치거나 \`harness-team gate suggest\` 를 실행하세요.`;

export async function runGate(ctx) {
  const [verb, ...rest] = ctx.taskArgs || [];
  if (verb === 'commit' && rest.length === 0) return gateCommit(ctx);
  if (verb === 'format' && rest.length === 1) return gateFormat(ctx, rest[0]);
  if (verb === 'suggest' && rest.length === 0) return gateSuggest(ctx);
  console.error('usage: harness-team gate commit | format <file> | suggest');
  process.exitCode = 2;
}

function block(msg) {
  console.error(`❌ ${msg}\n   커밋을 중단합니다.`);
  process.exitCode = 2;
}

async function gateCommit(ctx) {
  let gates;
  try { gates = await readGates(ctx.targetDir); }
  catch (e) { return block(`설정 오류: ${e.message}`); }
  if (gates === null) {
    // Only a missing file means "not configured". A hook that exits 0 has its stderr hidden, so
    // the notice goes out as a hook systemMessage on stdout — the channel the user actually sees.
    console.log(JSON.stringify({ systemMessage: `ℹ️ 커밋 게이트 미설정 — ${GATES_REL} 이 없습니다. \`harness-team gate suggest\` 로 만들고 커밋하세요.` }));
    return;
  }
  // A present but wrong-shaped file is a config error, never "unconfigured": init/migrate treat
  // an existing file as confirmed, so failing open here would keep the gate off for good.
  const list = gates.commit;
  if (!Array.isArray(list) || list.some(c => typeof c !== 'string' || !c.trim())) {
    return block(`설정 오류: ${GATES_REL} 의 commit 은 비어 있지 않은 문자열 배열이어야 합니다 — ${CONFIG_HINT}`);
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
  let gates, root, abs;
  try {
    gates = await readGates(ctx.targetDir);
    // realpath both sides: on macOS the cwd resolves to /private/var while the edited path
    // may arrive as /var, and a lexical relative() would then place the file outside the project.
    root = await realpath(ctx.targetDir);
    abs = await realpath(isAbsolute(file) ? file : join(ctx.targetDir, file));
  } catch { return; }
  const format = gates?.format;
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

// Re-applies the current detection as a proposal. The one place that may replace confirmed
// gates — and only after an explicit yes (the default flips to "no" when it would overwrite).
async function gateSuggest(ctx) {
  let existing;
  try { existing = await readGates(ctx.targetDir); }
  catch (e) { console.error(`gate suggest: ${e.message}`); process.exitCode = 1; return; }
  const { stack: pin } = await loadRenderState(ctx.targetDir);   // same stack resolution as init
  const proposal = await buildProposal(ctx.targetDir, await resolveStack(ctx.targetDir, pin));
  console.log(describeProposal(proposal));
  const overwriting = existing !== null;
  if (overwriting) console.log(`  현재 commit: ${JSON.stringify(existing.commit ?? null)} — 기록하면 ${GATES_REL} 전체(commit·format·fingerprint)를 덮어씁니다.`);
  const ok = ctx.flags.yes || await confirm(`이 제안을 ${GATES_REL} 에 기록할까요?`, { defaultYes: !overwriting });
  if (!ok) { console.log('기록하지 않았습니다.'); return; }
  await applyProposal(ctx.targetDir, proposal);
  console.log(`✓ ${GATES_REL} 갱신 — 팀과 공유하려면 커밋하세요.`);
}

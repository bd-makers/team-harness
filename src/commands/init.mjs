import { detectStack, resolveStack, KNOWN_STACK_IDS } from '../detect-stack.mjs';
import {
  planChanges, applyChanges, copyStaticAssets, formatDiff,
} from '../harness.mjs';
import { loadRenderState, saveRenderState } from '../render-state.mjs';
import { confirm } from '../prompt.mjs';
import { resolveUsername, saveUsername, readConfigStrict } from '../user-config.mjs';
import { applyProposal, buildProposal, describeProposal } from '../presets.mjs';
import { installPostCommitHook } from '../git-hooks.mjs';

export async function runInit(ctx) {
  console.log(`harness-team init → ${ctx.targetDir}`);
  const forced = ctx.flags.stack;
  if (forced !== undefined && !KNOWN_STACK_IDS.includes(forced)) {
    // A typo used to pass straight through as the stack id and render an AGENTS.md
    // naming a stack nothing recognizes. Refuse before anything is written.
    console.error(`init: unknown --stack "${forced}" (expected one of ${KNOWN_STACK_IDS.join('|')})`);
    process.exitCode = 2;
    return;
  }
  // 강제 스택은 render-state에 고정해 플래그 없는 다음 init·doctor·migrate가 같은 스택으로 렌더한다.
  // 감지와 같은 id를 주면 고정을 푼다(자동 감지로 복귀). 저장은 render-state와 함께 Apply 뒤에 한다.
  const detectedId = (await detectStack(ctx.targetDir)).id;
  const { stack: priorPin } = await loadRenderState(ctx.targetDir);
  const stackPin = forced === undefined ? priorPin : (forced === detectedId ? undefined : forced);
  const stack = await resolveStack(ctx.targetDir, stackPin);
  // copyStaticAssets gates the RN-only rules on this, not just on an explicit --stack.
  ctx.stackId = stack.id;
  const pinNote = forced === undefined && stackPin ? ` — pinned by an earlier --stack; --stack ${detectedId} to unpin` : '';
  console.log(`  stack: ${stack.stackLabel} (${stack.id})${pinNote}`);

  // 결정만 — 저장은 최종 Apply 뒤(applyChanges 직후). 여기서 쓰면 취소해도 config가 남는다.
  const pendingUsername = await resolveUsername(ctx.targetDir, ctx.flags);

  // 커밋 게이트도 결정만 여기서 — 이미 확정된 gates는 다시 묻지 않는다(D8, 갱신은 `gate suggest`).
  let pendingGates = null;
  const existingConfig = await readConfigStrict(ctx.targetDir).catch(() => ({}));
  if (existingConfig.gates === undefined) {
    const proposal = await buildProposal(ctx.targetDir, stack);
    console.log(`\n${describeProposal(proposal)}`);
    const ok = ctx.flags.yes || await confirm('이 커밋 게이트를 .harness/config.json 에 기록할까요?', { defaultYes: true });
    if (ok) pendingGates = proposal;
  }

  const { changes, legacyAgentFiles, brokenMarkerFiles, skippedSections, renderState } = await planChanges(ctx, { stack, stackPin });

  if (legacyAgentFiles && legacyAgentFiles.length) {
    console.log(`\n⚠️ 레거시 alias symlink 감지: ${legacyAgentFiles.join(', ')} → CLAUDE.md`);
    console.log(`   이 파일들은 건너뜁니다(CLAUDE.md 오염 방지). 신구조 전환: harness-team migrate`);
  }
  for (const broken of brokenMarkerFiles || []) {
    console.log(`\n⚠️ ${broken.file}: ${broken.message}`);
    console.log(`   이 파일은 건너뜁니다 — 마커가 한쪽만 남은 채 병합하면 다음 실행에서 사용자 텍스트가 지워집니다.`);
  }

  if (changes.length === 0) {
    console.log('  (no changes needed for text/JSON files)');
  } else {
    console.log(formatDiff(changes));
  }

  // 관리 절의 사용자 편집은 지우지 않는다 — 그 절만 건너뛰고 무엇이 반영되지 않았는지 보여준다.
  // `--yes`에서도 이 경고와 건너뛰기는 그대로다(프롬프트만 생략). 종료 코드는 바꾸지 않는다.
  if (skippedSections && skippedSections.length) {
    console.log('\n⚠️  관리 절에 사용자 편집이 있어 건너뜁니다 (사용자 텍스트를 지우지 않습니다):');
    for (const { file, section, diff } of skippedSections) {
      console.log(`  - ${file} → harness:section="${section}"`);
      console.log(diff.split('\n').map(l => `      ${l}`).join('\n'));
    }
    console.log('  → 템플릿 변경을 반영하려면 위 diff를 보고 직접 옮긴 뒤 다시 실행하세요.');
  }

  const ok = ctx.flags.yes || await confirm('\nApply these changes + scaffold the rest?', { defaultYes: true });
  // 거절하면 아무것도 쓰지 않았으므로 렌더 상태도 저장하지 않는다 — 저장하면 다음 실행이
  // 쓰지도 않은 내용을 "우리 렌더"로 믿는다.
  if (!ok) { console.log('Aborted.'); return; }

  await applyChanges(changes);
  if (pendingUsername) await saveUsername(ctx.targetDir, pendingUsername);
  if (pendingGates) {
    await applyProposal(ctx.targetDir, pendingGates)
      .catch(e => console.warn(`  gates: 기록하지 못했습니다 — ${e.message}`));
  }
  await saveRenderState(ctx.targetDir, renderState);
  const copied = await copyStaticAssets(ctx);
  await installPostCommitHook(ctx.targetDir);

  console.log(`\n✓ Wrote ${changes.length} merged file(s)`);
  console.log(`✓ Copied ${copied.filter(c => c.action === 'write').length} asset(s) (${copied.filter(c => c.action === 'skip').length} skipped as existing)`);
  console.log(`✓ Agent files: AGENTS.md (core) + CLAUDE.md (@AGENTS.md import)`);
}

// `harness-team scope` — read-only. 리뷰·ship 이 대상으로 삼을 scope 와 base 를 판정해 보고한다.
//
// 판정 자체는 `review.mjs` 의 `resolveScope` 가 소유하고 여기서는 복제하지 않는다. 그 규칙의 정본은
// `commands/harness-review.md` 2단계이고 코드가 그 미러다.
//
// 이 커맨드가 생긴 이유는 `commands/harness-ship.md` 2단계다. ship 은 같은 사다리를 산문으로 다시
// 적어 에이전트에게 손으로 실행시키고, 그 결과를 7단계에서 `review --scope diff --base <ref>` 로
// 넘긴다 — 호출할 CLI 표면이 없었기 때문이다. 이제 있다.
import { resolveScope, SCOPES, posixSingleQuote } from './review.mjs';
import { buildEnvelope, buildErrorPacket, emitObservation, renderErrorPacket } from '../observation.mjs';

// task-docs 는 `review` 가 framing 또는 --prompt-file 없이는 즉시 거절한다(review.mjs:404). 그냥
// `--scope task-docs` 를 안내하면 따라 한 사람이 바로 에러를 맞는다 — 실행되지 않는 명령은 안내가 아니다.
function reviewHint(scope, base) {
  if (scope === 'task-docs') {
    return '`harness-team review <engine> --framing contrarian|simplifier` 로 task 문서를 리뷰할 수 있습니다 (task-docs 는 framing 또는 --prompt-file 이, 그리고 활성 task 가 필요합니다)';
  }
  // 브랜치 이름에는 `$`·백틱·괄호가 들어갈 수 있다. 인용 없이 안내하면 그 줄을 셸에 붙여넣는 순간
  // command substitution 이 실행된다 — 원격 브랜치 이름은 우리가 만든 값이 아니다(codex P1).
  const baseArg = base ? ` --base ${posixSingleQuote(base)}` : '';
  return `\`harness-team review <engine> --scope ${scope}${baseArg}\` 로 이 대상을 리뷰할 수 있습니다`;
}

const EMPTY_SUMMARY = 'base 대비 diff 가 비어 있습니다 — 리뷰하거나 ship 할 변경이 없습니다';

export async function runScope(ctx) {
  const json = !!(ctx.flags && ctx.flags.json);
  // `resolveScope` 는 모르는 scope 값을 조용히 diff 로 흘린다 — `review` 는 호출 전에 목록 대조로
  // 막지만 여기서 빠뜨렸고, `--scope typo` 가 성공한 diff 판정으로 나왔다(codex P2).
  // 판정 실패를 판정 결과처럼 보이게 하는 부류라 `--stack` 오타 가드와 같은 이유로 거절한다.
  const requestedScope = ctx.flags.scope;
  if (requestedScope !== undefined && !SCOPES.includes(requestedScope)) {
    process.exitCode = 2;
    console.error(`scope: 알 수 없는 --scope "${requestedScope}" (허용: ${SCOPES.join('|')})`);
    return;
  }
  const resolved = await resolveScope({
    targetDir: ctx.targetDir,
    scope: requestedScope,
    base: ctx.flags.base,
  });

  if (resolved.error) {
    const packet = buildErrorPacket({
      cause: resolved.error,
      retry: '`--base <ref>` 로 기준을 직접 주거나, `--scope worktree` 로 워킹트리 전체를 대상으로 다시 실행',
      alternatives: ['`git remote -v` 와 `git symbolic-ref refs/remotes/origin/HEAD` 로 기본 브랜치 설정을 확인'],
      safeDefault: '아무것도 바뀌지 않았다 — 이 명령은 판정만 한다',
      stop: '판정하지 못한 base 로 리뷰를 기록하지 말 것',
    });
    process.exitCode = 1;
    if (json) emitObservation(buildEnvelope({ command: 'scope', status: 'error', summary: resolved.error, error: packet }));
    else {
      console.log(`✗ scope: ${resolved.error}`);
      for (const line of renderErrorPacket(packet)) console.log(line);
    }
    return;
  }

  // 빈 diff 는 실패가 아니라 관측이다 — 리뷰·ship 이 여기서 "할 것 없음"으로 멈춘다. exit 은 0 이다.
  const empty = resolved.empty === true;
  const scope = empty ? null : resolved.scope;
  const base = resolved.base ?? null;
  const tip = resolved.tip ?? 'none';

  if (json) {
    emitObservation(buildEnvelope({
      command: 'scope',
      status: empty ? 'warning' : 'success',
      summary: empty ? EMPTY_SUMMARY : `scope: ${scope}${base ? ` · base: ${base}` : ''} · tip: ${tip}`,
      nextActions: empty
        ? ['변경을 커밋하거나 `--base <ref>` 로 다른 기준을 주고 다시 판정하세요']
        : [reviewHint(scope, base)],
      extra: { scope, base, tip },
    }));
    return;
  }

  if (empty) {
    console.log(`scope: (없음) — ${EMPTY_SUMMARY}`);
    console.log(`base: ${base} · tip: ${tip}`);
    return;
  }
  console.log(`scope: ${scope}${base ? ` · base: ${base}` : ''} · tip: ${tip}`);
}

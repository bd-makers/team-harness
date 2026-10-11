# followups-22-23 — Context Card
<!-- working set only; UTF-8 <= 6 KiB, nonblank lines <= 100 -->

## Now
- Goal: diff-failed cause 에 git stderr 사유(22) · pre-push 가 무관 히스토리 브랜치를 건너뜀(23, 방향 A)
- Current atomic step: PR #146 리뷰 대기(머지·종결은 사람)
- Stop / human-decision condition: decisions.md D11 문구 변경이 필요하면 고치지 말고 보고

## Constraints and settled decisions
- 23 은 `git merge-base` exit 1 일 때만 건너뛴다 — 그 밖의 실패는 삼키지 않는다(`mergeBaseOf` 재사용 금지)
- 접두 `diff 계산 실패:`·errorKind·retry·envelope 불변
- gh-pages 를 체크아웃한 채 push 하는 경우는 범위 밖(#144 패킷 유지)

## JIT retrieval map
- Identifiers / symbols: `gitFailureReason`, `resolveScope`, `sharesHistory`, `runPrCheck`
- Narrow globs: `src/commands/{review,pr-check}.mjs`, `tests/{review-command,pr-check}.test.mjs`
- Read next: spec `## 설계 / 접근`
- Verification command: `npm test && npm run docs:check`

## Failure capsules (max 3 unresolved)
- (none)

## Resume checklist
- PR 상태·CI annotation 확인

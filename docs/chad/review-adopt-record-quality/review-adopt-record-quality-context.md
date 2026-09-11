# review-adopt-record-quality — Context Card
<!-- working set only; UTF-8 <= 6 KiB, nonblank lines <= 100 -->

## Now
- Goal: followups 3(구 task → CLI 소유 채택)·8(review 기록 품질 3건) 구현 → 0.38.0 릴리스
- Current atomic step: 구현·테스트·리뷰 완료(3차 APPROVE). 남은 것은 릴리스 문서 + bump — **사용자 승인 대기**
- Stop / human-decision condition: `harness-team release 0.38.0`은 승인 없이 실행하지 않는다

## Constraints and settled decisions
- 채택은 옵트인 플래그 전용. `--yes` 단독으로 채택하지 않는다 (증거를 잃는 유일한 migrate 단계)
- 잃는 증거 N은 가드와 같은 함수로 센다 — `evidenceWindowStart` · `isVerifyKind` (task.mjs에서 export)
- `review`가 부수효과로 `reviews` 키를 만들지 않는 규칙은 그대로
- 개발 중 dogfood는 `node bin/harness-team.mjs` — 전역 `harness-team`은 릴리스된 clone 코드다

## JIT retrieval map
- Identifiers / symbols: `adoptTaskReviews` · `collectReviewAdoptionCandidates` · `insertReviewBlock` ·
  `evidenceWindowStart` · `isVerifyKind` · `which(name, env, cwd)`
- Narrow globs: `src/commands/{migrate,review,task}.mjs` · `tests/review-{command,adoption}.test.mjs`
- Read next (릴리스 시): `MAINTAINING.md` · `docs/what-changes-0.37.0.html`(형식) · `docs/harness-overview.template.html`
- Verification command: `npm run test` · `git add -A && npm run docs:generate && npm run docs:check`

## Failure capsules (max 3 unresolved)
- (none — 2건 모두 해소: 전역 CLI로 dogfood한 1차 리뷰, 수동 indexOf로 인한 artifact 훼손)

## Resume checklist
- 스테이징된 변경이 커밋 전 상태다 (`git status --porcelain`). 릴리스는 문서 → bump → 단일 커밋 순서
- 릴리스 함정은 개인 메모리 `release-icloud-gotchas` 참조

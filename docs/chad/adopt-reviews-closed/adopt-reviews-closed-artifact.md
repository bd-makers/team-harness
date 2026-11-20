# adopt-reviews-closed — Artifact

*최종 결과물과 학습 내용을 기록한다.*

## 결과
- 결정 A(2026-11-20, 사용자 선택): `migrate --adopt-reviews` 후보에서 기본 브랜치 R에서 종결(마지막 재개 이후)된 task를 뺀다.
- `src/commands/migrate.mjs` `collectReviewAdoptionCandidates`: `resolveClosureRef`를 한 번 구하고, 기록 종결 제외 뒤
  `closedSinceReopen(closureAtRef(R), meta)`가 참이면 건너뛴다. ref가 없으면 종전 동작. fetch 없음.
- 테스트 3건(`tests/review-adoption.test.mjs` P2-6): R 종결 제외 + 로컬 plan만 종결(머지 전)은 남음 / 재개(reopenedAt > R 종결)는 남고 재개가 앞이면 제외 / git 없음은 종전대로 후보.
  수정 줄을 뺀 상태에서 앞의 2건이 실패함을 확인(red→green).
- 문서: `commands/harness-migrate.md`·`commands/harness-review.md`의 "열린 구 task" 정의, CHANGELOG Unreleased/Changed.
- 검증: `npm run test` 1444 / pass 1443 / fail 0 / skip 1(기존 CI 전용), `npm run docs:check` 최신.
- 손대지 않음: `docs/harness-overview.template.html`의 0.38.0 문단(릴리스 이력 서술이라 당시 정의 그대로 둔다).


## Reviews
*Codex 등 리뷰 실행 시 결과(요약·발견·조치)를 날짜와 함께 남긴다. 남기지 않은 리뷰는 "안 한 것"으로 간주.*
*기계 판독용 마커를 함께 남긴다: `<!-- harness:review kind=codex scope=worktree tip=<sha|none> at=<ISO8601> -->`*


## Learnings
- "R에서 종결"을 제외 조건으로 쓸 때는 `closureAtRef(...).closed`가 아니라 `closedSinceReopen`을 쓴다 — 재개 MR 머지 전에는
  R이 closed인데 그 task는 가드를 다시 지난다. 재개·clean·채택이 같은 판정을 공유한다.

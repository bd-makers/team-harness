# review-retry-hint — Handoff

(세션 종료 시 post-commit hook이 자동 갱신합니다)

## 2026-10-11T05:23:41.515Z — 0927c69 fix(review): scope 오류 retry 를 원인 종류로 고른다 (followups 19)
CHANGELOG.md                                       |   3 +
 docs/followups.md                                  |  18 +---
 .../review-retry-hint-artifact.md                  |  44 +++++++++
 .../review-retry-hint/review-retry-hint-context.md |  23 +++++
 .../review-retry-hint/review-retry-hint-handoff.md |   3 +
 .../review-retry-hint/review-retry-hint-meta.json  |  11 +++
 .../review-retry-hint/review-retry-hint-plan.md    |  22 +++++
 .../review-retry-hint/review-retry-hint-spec.md    | 109 +++++++++++++++++++++
 src/commands/review.mjs                            |  29 ++++--
 src/commands/scope.mjs                             |  12 ++-
 tests/review-command.test.mjs                      |  54 ++++++++++
 tests/scope-command.test.mjs                       |  50 ++++++++++
 12 files changed, 353 insertions(+), 25 deletions(-)

## 2026-10-11T05:27:08.698Z — d87cfa8 fix(scope): diff-failed retry 가 worktree 의 범위 축소를 알린다 (codex P3)
.../review-retry-hint-artifact.md                  | 23 ++++++++++++++++++++++
 .../review-retry-hint/review-retry-hint-handoff.md | 15 ++++++++++++++
 .../review-retry-hint/review-retry-hint-meta.json  | 14 ++++++++++++-
 .../review-retry-hint/review-retry-hint-spec.md    |  3 ++-
 src/commands/review.mjs                            |  2 +-
 src/commands/scope.mjs                             |  2 +-
 6 files changed, 55 insertions(+), 4 deletions(-)

## 2026-10-11T05:28:01.749Z — 78e6ec8 docs(task): review-retry-hint PR #143 기록 — 리뷰 덱 미실행(스킬 없음)
docs/hslee/review-retry-hint/review-retry-hint-context.md | 2 +-
 docs/hslee/review-retry-hint/review-retry-hint-handoff.md | 9 +++++++++
 docs/hslee/review-retry-hint/review-retry-hint-plan.md    | 2 +-
 3 files changed, 11 insertions(+), 2 deletions(-)

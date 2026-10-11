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

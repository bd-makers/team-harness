# review-scope-handoff — Handoff

(세션 종료 시 post-commit hook이 자동 갱신합니다)

## 2026-10-09T16:19:43.675Z — 4ff5b20 docs(task): review-scope-handoff spec·plan — scope 자동 판정의 handoff 오판
CHANGELOG.md                                       |   7 +
 commands/harness-review.md                         |   4 +-
 commands/harness-task.md                           |   3 +-
 docs/followups.md                                  |  15 +-
 .../review-scope-handoff-artifact.md               |  22 +++
 .../review-scope-handoff-context.md                |  21 +++
 .../review-scope-handoff-handoff.md                |   3 +
 .../review-scope-handoff-meta.json                 |  11 ++
 .../review-scope-handoff-plan.md                   |  23 +++
 .../review-scope-handoff-spec.md                   | 156 +++++++++++++++++++++
 src/commands/review.mjs                            |  17 ++-
 src/commands/task.mjs                              |   2 +-
 tests/review-command.test.mjs                      |  76 ++++++++++
 tests/scope-command.test.mjs                       |  22 ++-
 14 files changed, 375 insertions(+), 7 deletions(-)

## 2026-10-09T16:19:48.788Z — 262d943 fix(review): scope 자동 판정이 post-commit 훅의 handoff 변경을 dirty로 세지 않는다
CHANGELOG.md                                       |  7 ++
 commands/harness-review.md                         |  4 +-
 commands/harness-task.md                           |  3 +-
 docs/followups.md                                  | 15 ++++-
 .../review-scope-handoff-handoff.md                | 17 +++++
 src/commands/review.mjs                            | 17 ++++-
 src/commands/task.mjs                              |  2 +-
 tests/review-command.test.mjs                      | 76 ++++++++++++++++++++++
 tests/scope-command.test.mjs                       | 22 ++++++-
 9 files changed, 156 insertions(+), 7 deletions(-)

## 2026-10-09T16:21:50.281Z — 4d2af02 test(review): S1이 저장된 meta.reviews scope와 base 브랜치의 미기록을 검증한다
.../review-scope-handoff-artifact.md               | 27 ++++++++++++++++++++++
 .../review-scope-handoff-handoff.md                | 12 ++++++++++
 .../review-scope-handoff-meta.json                 | 12 +++++++++-
 tests/review-command.test.mjs                      |  6 +++++
 4 files changed, 56 insertions(+), 1 deletion(-)

## 2026-10-09T16:24:48.708Z — 519c75b docs(task): review-scope-handoff R2·R3 리뷰 판별과 재검증 기록
.../review-scope-handoff-artifact.md               | 41 ++++++++++++++++++++++
 .../review-scope-handoff-context.md                |  4 +--
 .../review-scope-handoff-handoff.md                |  7 ++++
 .../review-scope-handoff-meta.json                 | 18 ++++++++++
 .../review-scope-handoff-plan.md                   |  2 +-
 5 files changed, 69 insertions(+), 3 deletions(-)

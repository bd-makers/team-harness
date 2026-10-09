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

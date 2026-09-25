# task-reserved-names — Handoff

(세션 종료 시 post-commit hook이 자동 갱신합니다)

## 2026-09-25T09:21:36.949Z — f686c83 fix(task): harness-team 명령 이름으로 새 task 를 만들지 않는다
CHANGELOG.md                                       |  6 +++
 commands/harness-task.md                           |  2 +-
 docs/harness-overview.html                         |  5 ++
 .../task-reserved-names-artifact.md                | 13 +++++
 .../task-reserved-names-context.md                 | 27 ++++++++++
 .../task-reserved-names-handoff.md                 |  3 ++
 .../task-reserved-names-meta.json                  | 11 ++++
 .../task-reserved-names-plan.md                    | 17 +++++++
 .../task-reserved-names-spec.md                    | 40 +++++++++++++++
 src/commands/task.mjs                              | 13 +++++
 tests/task-reserved-names.test.mjs                 | 59 ++++++++++++++++++++++
 11 files changed, 195 insertions(+), 1 deletion(-)

## 2026-09-25T09:25:15.575Z — ce25e49 chore(task-reserved-names): codex 리뷰 P3 반영 — 예약어 테스트가 COMMANDS 전체를 돈다
docs/hslee/hslee-handoff.md                            |  9 ++++-----
 .../task-reserved-names-artifact.md                    | 18 ++++++++++++++++++
 .../task-reserved-names/task-reserved-names-handoff.md | 14 ++++++++++++++
 .../task-reserved-names/task-reserved-names-meta.json  | 12 +++++++++++-
 .../task-reserved-names/task-reserved-names-plan.md    |  2 +-
 tests/task-reserved-names.test.mjs                     |  4 +++-
 6 files changed, 51 insertions(+), 8 deletions(-)

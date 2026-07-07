# task-index-open-naming — Handoff

(세션 종료 시 post-commit hook이 자동 갱신합니다)

## 2026-07-07T02:29:51.420Z — 51d90ee refactor(task): rename index "active" label to "open"
docs/chad/chad-task.md                             |   3 +-
 docs/chad/pocock-merge/pocock-merge-handoff.md     |  15 +
 .../task-index-open-naming-artifact.md             |  29 ++
 .../task-index-open-naming-handoff.md              |   3 +
 .../task-index-open-naming-plan.md                 |  21 +
 .../task-index-open-naming-spec.md                 |  42 ++
 docs/harness-overview.html                         | 478 ++-------------------
 docs/harness-workflow-simulation.html              | 193 ++-------
 docs/task_summary.md                               |   3 +-
 src/commands/migrate.mjs                           |  43 +-
 src/commands/task.mjs                              |  13 +-
 tests/task-templates.test.mjs                      |  65 ++-
 12 files changed, 303 insertions(+), 605 deletions(-)


## 2026-07-07T02:30:09.678Z — 완료

태스크 종료.

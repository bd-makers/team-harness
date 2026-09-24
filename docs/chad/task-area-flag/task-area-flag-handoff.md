# task-area-flag — Handoff

(세션 종료 시 post-commit hook이 자동 갱신합니다)

## 2026-09-24T12:39:54.951Z — ebe37fb feat(task): --area 로 모노레포 task 를 앱·서비스 단위로 묶는다
CHANGELOG.md                                       |  11 ++
 commands/harness-task.md                           |  27 +++-
 .../chad/task-area-flag/task-area-flag-artifact.md |  32 ++++
 docs/chad/task-area-flag/task-area-flag-context.md |  27 ++++
 docs/chad/task-area-flag/task-area-flag-handoff.md |   3 +
 docs/chad/task-area-flag/task-area-flag-meta.json  |  21 +++
 docs/chad/task-area-flag/task-area-flag-plan.md    |  22 +++
 docs/chad/task-area-flag/task-area-flag-spec.md    |  64 ++++++++
 docs/harness-overview.html                         |   5 +
 docs/spec-monorepo-scope.md                        |   2 +
 src/cli-args.mjs                                   |   6 +-
 src/commands/summary.mjs                           |  17 +-
 src/commands/task.mjs                              |  78 ++++++++-
 tests/task-area.test.mjs                           | 176 +++++++++++++++++++++
 14 files changed, 472 insertions(+), 19 deletions(-)

## 2026-09-24T13:06:05.874Z — 완료

태스크 종료.

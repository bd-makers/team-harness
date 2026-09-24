# task-paths-helper — Handoff

(세션 종료 시 post-commit hook이 자동 갱신합니다)

## 2026-09-24T11:59:53.820Z — c4edad4 refactor(paths): task 경로 조립을 src/task-paths.mjs 한 곳으로 모은다
CHANGELOG.md                                       |  10 +
 .../task-paths-helper-artifact.md                  |  45 +++
 .../task-paths-helper/task-paths-helper-context.md |  27 ++
 .../task-paths-helper/task-paths-helper-handoff.md |   3 +
 .../task-paths-helper/task-paths-helper-meta.json  |  21 ++
 .../task-paths-helper/task-paths-helper-plan.md    |  23 ++
 .../task-paths-helper/task-paths-helper-spec.md    |  65 ++++
 docs/spec-monorepo-scope.md                        | 367 ++++++++++++++++++
 src/commands/boundary.mjs                          |   5 +-
 src/commands/context.mjs                           |   4 +-
 src/commands/diagram.mjs                           |  16 +-
 src/commands/doctor.mjs                            |   9 +-
 src/commands/migrate.mjs                           |  18 +-
 src/commands/observe.mjs                           |   7 +-
 src/commands/remote-task.mjs                       |   7 +-
 src/commands/review.mjs                            |  15 +-
 src/commands/rules.mjs                             |   7 +-
 src/commands/session-context.mjs                   |  53 ++-
 src/commands/summary.mjs                           |  42 +--
 src/commands/task.mjs                              | 117 +++---
 src/task-paths.mjs                                 |  57 +++
 tests/e2e/task-paths-golden.test.mjs               | 103 +++++
 tests/fixtures/task-paths-golden/expected.txt      | 414 +++++++++++++++++++++
 tests/task-paths-single-source.test.mjs            |  58 +++
 24 files changed, 1326 insertions(+), 167 deletions(-)

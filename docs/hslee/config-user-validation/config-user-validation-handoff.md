# config-user-validation — Handoff

(세션 종료 시 post-commit hook이 자동 갱신합니다)

## 2026-09-25T11:27:17.595Z — 5c930e1 fix(task): config user 가 docs/ 밖을 가리키면 task 는 쓰기 전에, init 은 저장 전에 거부한다
CHANGELOG.md                                       |  6 ++
 README.md                                          |  3 +
 commands/harness-task.md                           |  2 +
 docs/harness-overview.html                         |  5 ++
 .../config-user-validation-artifact.md             | 13 ++++
 .../config-user-validation-context.md              | 27 ++++++++
 .../config-user-validation-handoff.md              |  3 +
 .../config-user-validation-meta.json               | 11 +++
 .../config-user-validation-plan.md                 | 23 +++++++
 .../config-user-validation-spec.md                 | 61 +++++++++++++++++
 src/commands/task.mjs                              | 24 +++++--
 src/user-config.mjs                                | 15 ++++
 tests/task-user-validation.test.mjs                | 80 ++++++++++++++++++++++
 tests/user-config.test.mjs                         | 26 ++++++-
 14 files changed, 294 insertions(+), 5 deletions(-)

# task-member-collision — Handoff

(세션 종료 시 post-commit hook이 자동 갱신합니다)

## 2026-09-25T09:39:44.643Z — 040d134 fix(task): --member 가 config user 를 이기고, 추론 member 로 다른 member 와 같은 이름의 task 를 만들지 않는다
CHANGELOG.md                                       |  9 +++
 README.md                                          | 10 ++-
 commands/harness-task.md                           |  1 +
 docs/harness-overview.html                         |  5 ++
 .../task-member-collision-artifact.md              | 13 ++++
 .../task-member-collision-context.md               | 27 +++++++
 .../task-member-collision-handoff.md               |  3 +
 .../task-member-collision-meta.json                | 11 +++
 .../task-member-collision-plan.md                  | 17 +++++
 .../task-member-collision-spec.md                  | 41 ++++++++++
 src/commands/task.mjs                              | 22 +++++-
 tests/task-member-collision.test.mjs               | 89 ++++++++++++++++++++++
 12 files changed, 243 insertions(+), 5 deletions(-)

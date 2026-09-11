# done-on-main-nudge — Handoff

(세션 종료 시 post-commit hook이 자동 갱신합니다)

## 2026-09-11T07:33:51.669Z — 308cca9 feat(task-gate): "main에서 이미 종결된 task" 감지 — session-context·doctor·task 세 지점 nudge (done-on-main-nudge)
AGENTS.md                                          |   1 +
 CHANGELOG.md                                       |   8 ++
 commands/harness-task.md                           |  21 +++
 .../done-on-main-nudge-artifact.md                 |  56 ++++++++
 .../done-on-main-nudge-context.md                  |  26 ++++
 .../done-on-main-nudge-handoff.md                  |   3 +
 .../done-on-main-nudge-meta.json                   |  21 +++
 .../done-on-main-nudge/done-on-main-nudge-plan.md  |  22 +++
 .../done-on-main-nudge/done-on-main-nudge-spec.md  |  89 +++++++++++++
 docs/followups.md                                  |  19 +--
 src/commands/doctor.mjs                            |  22 +++
 src/commands/remote-task.mjs                       |  82 ++++++++++++
 src/commands/session-context.mjs                   |  18 ++-
 src/commands/task.mjs                              |  13 +-
 templates/AGENTS.md.hbs                            |   1 +
 tests/doctor.test.mjs                              |  29 +++-
 tests/remote-task.test.mjs                         | 147 +++++++++++++++++++++
 tests/session-context.test.mjs                     |  42 ++++++
 tests/task-done-on-main.test.mjs                   |  79 +++++++++++
 19 files changed, 678 insertions(+), 21 deletions(-)

## 2026-09-11T07:33:51.788Z — 완료

태스크 종료.

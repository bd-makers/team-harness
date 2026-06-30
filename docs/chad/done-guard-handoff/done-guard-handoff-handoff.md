# done-guard-handoff — Handoff

(세션 종료 시 post-commit hook이 자동 갱신합니다)

## 2026-06-30T02:15:23.020Z — c7a7bad fix(done-guard): exclude post-commit handoff from uncommitted-change check
CHANGELOG.md                                       |  3 +
 docs/chad/chad-task.md                             |  1 +
 .../done-guard-handoff-artifact.md                 | 20 +++++++
 .../done-guard-handoff-handoff.md                  |  3 +
 .../done-guard-handoff/done-guard-handoff-plan.md  | 17 ++++++
 .../done-guard-handoff/done-guard-handoff-spec.md  | 37 +++++++++++++
 docs/task_summary.md                               |  1 +
 src/commands/task.mjs                              | 25 ++++++++-
 tests/done-guard.test.mjs                          | 64 +++++++++++++++++++++-
 9 files changed, 169 insertions(+), 2 deletions(-)


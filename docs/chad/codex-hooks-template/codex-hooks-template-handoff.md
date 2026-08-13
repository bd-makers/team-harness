# codex-hooks-template — Handoff

(세션 종료 시 post-commit hook이 자동 갱신합니다)

## 2026-08-12T08:34:13.396Z — bbe287a feat(apply): install the Codex SessionStart hook template
CHANGELOG.md                                       |  10 ++
 README.md                                          |  19 +++-
 docs/chad/chad-task.md                             |   1 +
 .../codex-hooks-template-artifact.md               |  79 ++++++++++++++
 .../codex-hooks-template-context.md                |  33 ++++++
 .../codex-hooks-template-handoff.md                |   3 +
 .../codex-hooks-template-plan.md                   |  31 ++++++
 .../codex-hooks-template-spec.md                   |  55 ++++++++++
 docs/task_summary.md                               |   1 +
 skills/harness-team/SKILL.md                       |   4 +
 src/commands/backup.mjs                            |   2 +-
 src/commands/clone.mjs                             |   2 +-
 src/commands/delete.mjs                            |   2 +-
 src/commands/doctor.mjs                            |  17 ++-
 src/commands/symlink.mjs                           |   2 +-
 src/commands/upgrade.mjs                           |   2 +-
 src/harness.mjs                                    |  31 ++++++
 templates/.codex/hooks.json                        |  15 +++
 templates/clone.sh                                 |   2 +-
 templates/delete.sh                                |   2 +-
 templates/symlink.sh                               |   2 +-
 tests/codex-hooks.test.mjs                         | 117 +++++++++++++++++++++
 tests/e2e/apply-smoke.test.mjs                     |   1 +
 23 files changed, 420 insertions(+), 13 deletions(-)


## 2026-08-12T08:34:32.969Z — 완료

태스크 종료.

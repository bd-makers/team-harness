# tcc-removal — Handoff

(세션 종료 시 post-commit hook이 자동 갱신합니다)

## 2026-11-04T14:58:30.593Z — 5dbc7e5 feat(task)!: Task Context Card를 폐지하고 plan 현재 단계를 주입한다
AGENTS.md                                          |  20 +-
 CHANGELOG.md                                       |  10 +
 README.md                                          |   4 +-
 bin/harness-team.mjs                               |   2 -
 commands/harness-diagram.md                        |   2 +-
 commands/harness-task.md                           |   2 +-
 docs/decisions.md                                  |   2 +
 docs/diagrams/harness-overview/task-files.mmd      |   1 -
 docs/diagrams/harness-overview/task-lifecycle.mmd  |   3 +-
 docs/followups.md                                  |  13 +-
 docs/harness-cheatsheet.html                       |   3 +-
 docs/harness-cycle.md                              |   4 +-
 docs/harness-kickoff-deck.html                     |   4 +-
 docs/harness-onboarding-checklist.html             |   2 +-
 docs/harness-operations-playground.html            |   5 +-
 docs/harness-overview.html                         |  26 +-
 docs/harness-overview.template.html                |   2 +-
 docs/harness-task-guide.html                       |  72 ++---
 docs/harness-workflow-diagrams.html                |  16 +-
 docs/harness-workflow-schematics.html              |  12 +-
 docs/harness-workflow-simulation.html              |  17 +-
 docs/hslee/tcc-removal/tcc-removal-artifact.md     |  13 +
 docs/hslee/tcc-removal/tcc-removal-handoff.md      |   3 +
 docs/hslee/tcc-removal/tcc-removal-meta.json       |  11 +
 docs/hslee/tcc-removal/tcc-removal-plan.md         |  20 ++
 docs/hslee/tcc-removal/tcc-removal-spec.md         |  89 ++++++
 skills/harness-team/SKILL.md                       |   1 -
 src/cli-args.mjs                                   |   3 +-
 src/commands/context.mjs                           | 208 -------------
 src/commands/doctor.mjs                            |   3 +-
 src/commands/migrate.mjs                           |   2 +
 src/commands/session-context.mjs                   |  50 +---
 src/commands/task.mjs                              |  45 +--
 src/task-paths.mjs                                 |   2 +-
 templates/.claude/skills/fix-bug/SKILL.md          |   6 +-
 templates/.claude/skills/new-feature/SKILL.md      |   6 +-
 templates/AGENTS.md.hbs                            |  20 +-
 templates/docs/README.md                           |  10 +-
 tests/context.test.mjs                             | 322 ---------------------
 tests/documentation-inventory-pointers.test.mjs    |   2 +-
 tests/e2e/task-paths-golden.test.mjs               |   1 -
 .../.claude/skills/fix-bug/SKILL.md                |  55 ++++
 .../.claude/skills/new-feature/SKILL.md            |  53 ++++
 tests/fixtures/stock-templates/README.md           |   3 +-
 tests/fixtures/task-paths-golden/expected.txt      |  98 -------
 tests/migrate-templates.test.mjs                   |   2 +-
 tests/observation-commands.test.mjs                |   5 +-
 tests/session-context.test.mjs                     |  92 +++---
 tests/task-templates.test.mjs                      |   9 +-
 49 files changed, 413 insertions(+), 943 deletions(-)

## 2026-11-04T14:59:02.343Z — a5c2b03 chore(task): tcc-removal handoff 갱신 + 검증 단계 체크
docs/hslee/tcc-removal/tcc-removal-handoff.md | 52 +++++++++++++++++++++++++++
 docs/hslee/tcc-removal/tcc-removal-plan.md    |  2 +-
 2 files changed, 53 insertions(+), 1 deletion(-)

## 2026-11-04T15:02:34.453Z — d603c69 feat(task)!: Task Context Card를 폐지하고 plan 현재 단계를 주입한다
AGENTS.md                                          |  20 +-
 CHANGELOG.md                                       |  10 +
 README.md                                          |   4 +-
 bin/harness-team.mjs                               |   2 -
 commands/harness-diagram.md                        |   2 +-
 commands/harness-task.md                           |   2 +-
 docs/decisions.md                                  |   2 +
 docs/diagrams/harness-overview/task-files.mmd      |   1 -
 docs/diagrams/harness-overview/task-lifecycle.mmd  |   3 +-
 docs/followups.md                                  |  13 +-
 docs/harness-cheatsheet.html                       |   3 +-
 docs/harness-cycle.md                              |   4 +-
 docs/harness-kickoff-deck.html                     |   4 +-
 docs/harness-onboarding-checklist.html             |   2 +-
 docs/harness-operations-playground.html            |   5 +-
 docs/harness-overview.html                         |  26 +-
 docs/harness-overview.template.html                |   2 +-
 docs/harness-task-guide.html                       |  72 ++---
 docs/harness-workflow-diagrams.html                |  16 +-
 docs/harness-workflow-schematics.html              |  12 +-
 docs/harness-workflow-simulation.html              |  17 +-
 docs/hslee/tcc-removal/tcc-removal-artifact.md     |  38 +++
 docs/hslee/tcc-removal/tcc-removal-handoff.md      |  60 ++++
 docs/hslee/tcc-removal/tcc-removal-meta.json       |  23 ++
 docs/hslee/tcc-removal/tcc-removal-plan.md         |  20 ++
 docs/hslee/tcc-removal/tcc-removal-spec.md         |  89 ++++++
 skills/harness-team/SKILL.md                       |   1 -
 src/cli-args.mjs                                   |   3 +-
 src/commands/context.mjs                           | 208 -------------
 src/commands/doctor.mjs                            |   3 +-
 src/commands/migrate.mjs                           |   2 +
 src/commands/session-context.mjs                   |  50 +---
 src/commands/task.mjs                              |  45 +--
 src/task-paths.mjs                                 |   2 +-
 templates/.claude/skills/fix-bug/SKILL.md          |   8 +-
 templates/.claude/skills/new-feature/SKILL.md      |   8 +-
 templates/AGENTS.md.hbs                            |  20 +-
 templates/docs/README.md                           |  10 +-
 tests/context.test.mjs                             | 322 ---------------------
 tests/documentation-inventory-pointers.test.mjs    |   2 +-
 tests/e2e/task-paths-golden.test.mjs               |   1 -
 .../.claude/skills/fix-bug/SKILL.md                |  55 ++++
 .../.claude/skills/new-feature/SKILL.md            |  53 ++++
 tests/fixtures/stock-templates/README.md           |   3 +-
 tests/fixtures/task-paths-golden/expected.txt      |  98 -------
 tests/migrate-templates.test.mjs                   |   2 +-
 tests/observation-commands.test.mjs                |   5 +-
 tests/session-context.test.mjs                     |  92 +++---
 tests/task-templates.test.mjs                      |   9 +-
 49 files changed, 509 insertions(+), 945 deletions(-)

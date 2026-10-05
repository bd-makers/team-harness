# remove-backup-cluster — Handoff

(세션 종료 시 post-commit hook이 자동 갱신합니다)

## 2026-10-05T09:16:09.921Z — 32ca082 feat!: 백업 클론과 AI 파일 gitignore 옵션을 제거하고 메인테이너 전용 명령을 배포에서 내린다
.claude-plugin/plugin.json                         |   6 -
 {commands => .claude/commands}/harness-release.md  |   0
 {commands => .claude/commands}/harness-sim.md      |   2 +-
 CHANGELOG.md                                       |  11 +
 MAINTAINING.md                                     |   2 +
 README.md                                          | 198 +--------------
 bin/harness-team.mjs                               |  10 -
 commands/harness-clone.md                          |  15 --
 commands/harness-delete.md                         |  19 --
 commands/harness-init.md                           |  71 +-----
 commands/harness-symlink.md                        |  15 --
 commands/harness-upgrade.md                        |  19 --
 docs/diagrams/harness-overview/architecture.mmd    |   7 +-
 docs/diagrams/harness-overview/backup-layout.mmd   |  22 --
 .../harness-overview/backup-resolution.mmd         |  21 --
 docs/diagrams/harness-overview/workflow.mmd        |   4 -
 docs/harness-overview.html                         | 274 +--------------------
 docs/harness-overview.template.html                |  22 --
 docs/harness-workflow-simulation.html              |   4 -
 .../remove-backup-cluster-artifact.md              |  19 ++
 .../remove-backup-cluster-context.md               |  22 ++
 .../remove-backup-cluster-handoff.md               |   3 +
 .../remove-backup-cluster-meta.json                |  11 +
 .../remove-backup-cluster-plan.md                  |  19 ++
 .../remove-backup-cluster-spec.md                  |  54 ++++
 docs/index.html                                    |   2 -
 docs/prerequisites.md                              |   4 +-
 .../maintainer-skills}/harness-codex-sim/SKILL.md  |   0
 .../harness-codex-sim/agents/openai.yaml           |   0
 .../maintainer-skills}/harness-release/SKILL.md    |   2 +-
 .../harness-release/agents/openai.yaml             |   0
 .../maintainer-skills}/harness-sim/SKILL.md        |   2 +-
 .../harness-sim/agents/openai.yaml                 |   0
 skills/harness-clone/SKILL.md                      |  20 --
 skills/harness-clone/agents/openai.yaml            |   4 -
 skills/harness-delete/SKILL.md                     |  20 --
 skills/harness-delete/agents/openai.yaml           |   4 -
 skills/harness-symlink/SKILL.md                    |  20 --
 skills/harness-symlink/agents/openai.yaml          |   4 -
 skills/harness-upgrade/SKILL.md                    |  20 --
 skills/harness-upgrade/agents/openai.yaml          |   4 -
 src/backup-dir.mjs                                 |  80 ------
 src/cli-args.mjs                                   |  44 +---
 src/commands/backup.mjs                            |  91 -------
 src/commands/clone.mjs                             |  96 --------
 src/commands/delete.mjs                            |  89 -------
 src/commands/doctor.mjs                            |  66 +----
 src/commands/init.mjs                              |  65 +----
 src/commands/migrate.mjs                           | 104 +-------
 src/commands/symlink.mjs                           | 110 ---------
 src/commands/upgrade.mjs                           |  86 -------
 src/harness.mjs                                    |  92 +------
 templates/clone.sh                                 |  37 ---
 templates/delete.sh                                |  27 --
 templates/symlink.sh                               |  58 -----
 tests/backup-dir.test.mjs                          | 176 -------------
 tests/cli-args.test.mjs                            |  21 +-
 tests/delete.test.mjs                              |  61 -----
 tests/detect-stack.test.mjs                        |   4 +-
 tests/doctor.test.mjs                              |  42 +---
 tests/documentation-inventory-pointers.test.mjs    |   3 +-
 tests/e2e/init-smoke.test.mjs                      |   2 -
 tests/e2e/sandbox.mjs                              |   7 +-
 tests/gitignore-entries.test.mjs                   |  25 +-
 tests/sim/codex-agentloop.mjs                      |   2 +-
 tests/symlink.test.mjs                             |  87 -------
 tests/task-paths-single-source.test.mjs            |   2 +-
 67 files changed, 224 insertions(+), 2209 deletions(-)

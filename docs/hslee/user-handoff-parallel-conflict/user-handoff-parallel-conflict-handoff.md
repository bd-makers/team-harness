# user-handoff-parallel-conflict — Handoff

(세션 종료 시 post-commit hook이 자동 갱신합니다)

## 2026-09-27T13:46:14.031Z — fd37fa3 docs(task): user-handoff-parallel-conflict spec·plan — 병렬 PR의 user handoff 충돌 선택지와 권장안
.../user-handoff-parallel-conflict-artifact.md     |  13 ++
 .../user-handoff-parallel-conflict-context.md      |  24 +++
 .../user-handoff-parallel-conflict-handoff.md      |   3 +
 .../user-handoff-parallel-conflict-meta.json       |  11 ++
 .../user-handoff-parallel-conflict-plan.md         |  29 ++++
 .../user-handoff-parallel-conflict-spec.md         | 167 +++++++++++++++++++++
 6 files changed, 247 insertions(+)

## 2026-09-27T14:35:30.400Z — 97fd185 fix(handoff): user handoff를 워크트리 로컬 파일로 — 병렬 PR 충돌 제거
.gitignore                                         |   1 +
 AGENTS.md                                          |   5 +-
 CHANGELOG.md                                       |   8 +
 commands/harness-ship.md                           |   2 +-
 commands/harness-task.md                           |  11 +-
 docs/ao-worker-rules.md                            |   8 +-
 docs/chad/chad-handoff.md                          |  11 --
 docs/harness-overview.html                         |   5 +
 docs/hslee/hslee-handoff.md                        |  11 --
 .../user-handoff-parallel-conflict-artifact.md     |  34 ++++
 .../user-handoff-parallel-conflict-context.md      |   5 +-
 .../user-handoff-parallel-conflict-handoff.md      |   9 +
 .../user-handoff-parallel-conflict-meta.json       |  12 +-
 .../user-handoff-parallel-conflict-plan.md         |  24 +--
 .../user-handoff-parallel-conflict-spec.md         |  12 +-
 docs/index.html                                    |   2 -
 src/commands/doctor.mjs                            |  23 ++-
 src/commands/migrate.mjs                           |  22 ++-
 src/commands/task.mjs                              |  44 ++++-
 src/harness.mjs                                    |  11 +-
 src/task-paths.mjs                                 |   7 +
 templates/AGENTS.md.hbs                            |   5 +-
 templates/docs/README.md                           |   2 +-
 tests/gitignore-entries.test.mjs                   |   2 +-
 tests/summary.test.mjs                             |   7 +-
 tests/user-handoff-untracked.test.mjs              | 209 +++++++++++++++++++++
 26 files changed, 420 insertions(+), 72 deletions(-)

## 2026-09-27T14:36:23.763Z — 593d31b Merge refs/remotes/origin/main (0.44.3) into user-handoff-parallel-conflict
.claude-plugin/marketplace.json                    |   2 +-
 .claude-plugin/plugin.json                         |   2 +-
 .codex-plugin/plugin.json                          |   2 +-
 CHANGELOG.md                                       |  16 +
 MAINTAINING.md                                     |  13 +-
 commands/harness-init.md                           |   1 +
 docs/ao-worker-rules.md                            |   2 +-
 docs/followups.md                                  |  13 +-
 docs/harness-overview.html                         |  18 +-
 docs/harness-overview.template.html                |   8 +-
 .../docs-version-drift-check-artifact.md           |  33 +++
 .../docs-version-drift-check-context.md            |  27 ++
 .../docs-version-drift-check-handoff.md            |  32 ++
 .../docs-version-drift-check-meta.json             |  21 ++
 .../docs-version-drift-check-plan.md               |  20 ++
 .../docs-version-drift-check-spec.md               |  42 +++
 docs/hslee/hslee-task.md                           |   2 +
 .../stack-pin-display-artifact.md                  |  30 ++
 .../stack-pin-display/stack-pin-display-context.md |  27 ++
 .../stack-pin-display/stack-pin-display-handoff.md |  30 ++
 .../stack-pin-display/stack-pin-display-meta.json  |  21 ++
 .../stack-pin-display/stack-pin-display-plan.md    |  21 ++
 .../stack-pin-display/stack-pin-display-spec.md    |  52 ++++
 docs/index.html                                    |   1 +
 docs/task_summary.md                               |   2 +
 docs/what-changes-0.44.3.html                      | 322 +++++++++++++++++++++
 docs/what-changes-latest-version.html              |  76 +++--
 package.json                                       |   2 +-
 scripts/docs-version-drift.mjs                     | 102 +++++++
 scripts/generate-harness-overview.mjs              |  10 +
 src/commands/stack.mjs                             |  22 +-
 tests/detect-testing.test.mjs                      |  23 ++
 tests/docs-version-drift.test.mjs                  |  93 ++++++
 33 files changed, 1040 insertions(+), 48 deletions(-)

## 2026-09-27T14:43:10.068Z — e0f0810 docs(readme): init --stack 고정 여부를 harness-team stack으로 확인한다
README.md | 1 +
 1 file changed, 1 insertion(+)

## 2026-09-27T14:44:40.749Z — 완료

태스크 종료.

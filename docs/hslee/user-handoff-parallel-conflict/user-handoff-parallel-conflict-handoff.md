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

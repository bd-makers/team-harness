# instruction-structure — Handoff

(세션 종료 시 post-commit hook이 자동 갱신합니다)

## 2026-08-21T05:37:38.698Z — 0c500c1 refactor(agents): 지시 구조 슬림화 — D-log·다이어그램·TCC 상세를 lazy 정본으로 이관
AGENTS.md                                          | 61 ++++++++--------------
 CLAUDE.md                                          | 27 +---------
 README.md                                          |  2 +-
 .../instruction-structure-artifact.md              | 13 +++++
 .../instruction-structure-context.md               | 24 +++++++++
 .../instruction-structure-handoff.md               |  3 ++
 .../instruction-structure-meta.json                |  7 +++
 .../instruction-structure-plan.md                  | 25 +++++++++
 .../instruction-structure-spec.md                  | 57 ++++++++++++++++++++
 docs/decisions.md                                  | 33 ++++++++++++
 src/commands/task.mjs                              |  3 +-
 templates/AGENTS.md.hbs                            | 61 ++++++++--------------
 templates/CLAUDE.md.hbs                            | 27 +---------
 templates/docs/decisions.md                        | 33 ++++++++++++
 tests/agent-files.test.mjs                         | 55 +++++++++++++------
 15 files changed, 286 insertions(+), 145 deletions(-)


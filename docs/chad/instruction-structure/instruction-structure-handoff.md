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


## 2026-08-21T05:51:06.066Z — e1361d4 docs(task): instruction-structure 결과·Codex 리뷰 기록 (P2 3건, 조치 대기)
docs/chad/chad-handoff.md                          |  8 +++---
 .../instruction-structure-artifact.md              | 30 ++++++++++++++++++++++
 .../instruction-structure-context.md               |  4 +--
 .../instruction-structure-handoff.md               | 19 ++++++++++++++
 .../instruction-structure-plan.md                  |  5 ++--
 5 files changed, 58 insertions(+), 8 deletions(-)


## 2026-08-21T06:25:37.882Z — 6ecd91b fix(agents): Codex 리뷰 P2 조치 — 게이트 예외 복원·check 메시지 힌트·정본 테스트 핀
CLAUDE.md                                                    |  2 +-
 docs/chad/chad-handoff.md                                    |  2 +-
 .../instruction-structure/instruction-structure-artifact.md  | 12 +++++++++++-
 .../instruction-structure/instruction-structure-handoff.md   |  9 +++++++++
 .../chad/instruction-structure/instruction-structure-plan.md |  5 ++++-
 docs/harness-overview.html                                   |  5 +++++
 docs/harness-task-guide.html                                 |  2 +-
 src/commands/context.mjs                                     |  2 +-
 templates/CLAUDE.md.hbs                                      |  2 +-
 tests/agent-files.test.mjs                                   |  4 ++++
 tests/context.test.mjs                                       |  4 ++++
 11 files changed, 42 insertions(+), 7 deletions(-)


## 2026-08-21T06:30:56.398Z — 완료

태스크 종료.

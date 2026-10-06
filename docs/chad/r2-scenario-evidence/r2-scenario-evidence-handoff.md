# r2-scenario-evidence — Handoff

(세션 종료 시 post-commit hook이 자동 갱신합니다)

## 2026-10-06T08:44:35.591Z — 5edfa36 feat(r2): 시나리오 ↔ 증거 대조 — Done evidence scenarios · scenario check · --framing scenario
AGENTS.md                                          |   3 +
 CHANGELOG.md                                       |  11 ++
 README.md                                          |  16 +-
 bin/harness-team.mjs                               |   6 +-
 commands/harness-review.md                         |  33 +++-
 .../r2-scenario-evidence-artifact.md               | 153 +++++++++++++++++
 .../r2-scenario-evidence-context.md                |  25 +++
 .../r2-scenario-evidence-handoff.md                |   3 +
 .../r2-scenario-evidence-meta.json                 |  48 ++++++
 .../r2-scenario-evidence-plan.md                   |  22 +++
 .../r2-scenario-evidence-spec.md                   | 188 +++++++++++++++++++++
 docs/harness-cycle.md                              |   4 +
 docs/harness-overview.html                         |  10 ++
 src/cli-args.mjs                                   |   1 +
 src/commands/migrate.mjs                           |   9 +-
 src/commands/review-prompts.mjs                    |  15 ++
 src/commands/scenario.mjs                          |  70 ++++++++
 src/commands/task.mjs                              |  50 +++++-
 templates/AGENTS.md.hbs                            |   3 +
 tests/done-guard.test.mjs                          |  38 +++++
 tests/fixtures/task-paths-golden/expected.txt      |  10 +-
 tests/review-adoption.test.mjs                     |  15 ++
 tests/review-command.test.mjs                      |  31 +++-
 tests/scenario.test.mjs                            | 130 ++++++++++++++
 24 files changed, 875 insertions(+), 19 deletions(-)

## 2026-10-06T08:44:45.772Z — dc28096 docs(task): r2-scenario-evidence plan 완료·handoff 반영
.../r2-scenario-evidence-handoff.md                | 27 ++++++++++++++++++++++
 .../r2-scenario-evidence-plan.md                   |  2 +-
 2 files changed, 28 insertions(+), 1 deletion(-)

## 2026-10-06T08:47:35.354Z — fc43333 docs(r2): scenario cmd 신뢰 경계 명시 + 리뷰 기록
README.md                                                |  2 ++
 .../r2-scenario-evidence-artifact.md                     | 16 ++++++++++++++++
 .../r2-scenario-evidence/r2-scenario-evidence-meta.json  |  9 +++++++++
 .../r2-scenario-evidence/r2-scenario-evidence-spec.md    |  2 ++
 4 files changed, 29 insertions(+)

## 2026-10-06T08:49:55.514Z — 06e7452 docs(task): r2-scenario-evidence 최종 리뷰 판별 기록
.../r2-scenario-evidence-artifact.md                     | 16 ++++++++++++++++
 .../r2-scenario-evidence/r2-scenario-evidence-meta.json  |  9 +++++++++
 2 files changed, 25 insertions(+)

## 2026-10-06T08:54:31.091Z — 완료

태스크 종료.

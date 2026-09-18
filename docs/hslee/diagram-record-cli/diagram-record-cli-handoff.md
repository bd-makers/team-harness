# diagram-record-cli — Handoff

(세션 종료 시 post-commit hook이 자동 갱신합니다)

## 2026-09-18T14:35:13.316Z — 70e28cd feat(diagram-record-cli): 다이어그램 옵트인 기록 단계를 harness-team diagram record 로 이관
CHANGELOG.md                                       |   8 +
 bin/harness-team.mjs                               |   6 +-
 commands/harness-diagram.md                        |  18 +-
 commands/harness-ship.md                           |   5 +-
 commands/harness-task.md                           |   4 +-
 docs/harness-overview.html                         |  10 +
 .../diagram-record-cli-artifact.md                 |  89 +++++++
 .../diagram-record-cli-context.md                  |  27 ++
 .../diagram-record-cli-handoff.md                  |   3 +
 .../diagram-record-cli-meta.json                   |  39 +++
 .../diagram-record-cli/diagram-record-cli-plan.md  |  27 ++
 .../diagram-record-cli/diagram-record-cli-spec.md  |  84 ++++++
 skills/harness-team/SKILL.md                       |   1 +
 src/cli-args.mjs                                   |   5 +-
 src/commands/diagram.mjs                           | 210 +++++++++++++++
 src/commands/review.mjs                            |   8 +-
 tests/agent-files.test.mjs                         |   4 +-
 tests/cli-args.test.mjs                            |   2 +-
 tests/diagram-command.test.mjs                     | 289 +++++++++++++++++++++
 19 files changed, 823 insertions(+), 16 deletions(-)

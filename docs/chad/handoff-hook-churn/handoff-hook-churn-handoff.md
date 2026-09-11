# handoff-hook-churn — Handoff

(세션 종료 시 post-commit hook이 자동 갱신합니다)

## 2026-09-11T12:14:40.614Z — 4904f83 fix(handoff): post-commit churn 루프를 끊는다 — 0.38.1
.claude-plugin/marketplace.json                    |   2 +-
 .claude-plugin/plugin.json                         |   2 +-
 .codex-plugin/plugin.json                          |   2 +-
 CHANGELOG.md                                       |  18 +
 README.md                                          |   1 +
 commands/harness-task.md                           |  16 +
 .../handoff-hook-churn-artifact.md                 | 183 +++++++++++
 .../handoff-hook-churn-context.md                  |  27 ++
 .../handoff-hook-churn-handoff.md                  |   3 +
 .../handoff-hook-churn-meta.json                   |  39 +++
 .../handoff-hook-churn/handoff-hook-churn-plan.md  |  20 ++
 .../handoff-hook-churn/handoff-hook-churn-spec.md  |  76 +++++
 docs/harness-overview.html                         |  13 +-
 docs/harness-overview.template.html                |   8 +-
 docs/index.html                                    |   1 +
 docs/what-changes-0.38.1.html                      | 362 +++++++++++++++++++++
 docs/what-changes-latest-version.html              | 172 ++++------
 package.json                                       |   2 +-
 src/commands/task.mjs                              |  76 ++++-
 tests/done-guard.test.mjs                          |  21 +-
 tests/handoff-hook-churn.test.mjs                  | 193 +++++++++++
 21 files changed, 1107 insertions(+), 130 deletions(-)

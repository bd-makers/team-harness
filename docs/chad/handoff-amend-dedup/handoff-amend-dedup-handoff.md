# handoff-amend-dedup — Handoff

(세션 종료 시 post-commit hook이 자동 갱신합니다)

## 2026-09-11T16:20:05.650Z — 22f03cb fix(handoff): amend 가 남기던 고아 항목을 없앤다 — 0.38.2
.claude-plugin/marketplace.json                    |   2 +-
 .claude-plugin/plugin.json                         |   2 +-
 .codex-plugin/plugin.json                          |   2 +-
 CHANGELOG.md                                       |  13 +
 README.md                                          |   1 +
 commands/harness-task.md                           |  12 +
 .../handoff-amend-dedup-artifact.md                | 160 ++++++++++
 .../handoff-amend-dedup-context.md                 |  27 ++
 .../handoff-amend-dedup-handoff.md                 |   3 +
 .../handoff-amend-dedup-meta.json                  |  39 +++
 .../handoff-amend-dedup-plan.md                    |  20 ++
 .../handoff-amend-dedup-spec.md                    |  54 ++++
 docs/followups.md                                  |  19 +-
 docs/harness-overview.html                         |   8 +-
 docs/harness-overview.template.html                |   8 +-
 docs/index.html                                    |   1 +
 docs/what-changes-0.38.2.html                      | 338 +++++++++++++++++++++
 docs/what-changes-latest-version.html              | 130 ++++----
 package.json                                       |   2 +-
 src/commands/task.mjs                              |  49 ++-
 tests/handoff-hook-churn.test.mjs                  | 148 +++++++++
 21 files changed, 936 insertions(+), 102 deletions(-)

## 2026-09-11T16:21:00.440Z — 3ed4d72 chore(task): handoff-amend-dedup plan 종결
docs/chad/handoff-amend-dedup/handoff-amend-dedup-plan.md | 4 ++--
 1 file changed, 2 insertions(+), 2 deletions(-)

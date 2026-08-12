# cursor-rules-mirror — Handoff

(세션 종료 시 post-commit hook이 자동 갱신합니다)

## 2026-08-12T08:40:52.270Z — 188ff28 fix(apply): translate rule path scoping into the Cursor mirror
CHANGELOG.md                                       |   3 +
 README.md                                          |  22 +++--
 docs/chad/chad-task.md                             |   1 +
 .../cursor-rules-mirror-artifact.md                |  40 ++++++++
 .../cursor-rules-mirror-context.md                 |  27 ++++++
 .../cursor-rules-mirror-handoff.md                 |   3 +
 .../cursor-rules-mirror-plan.md                    |  31 ++++++
 .../cursor-rules-mirror-spec.md                    |  53 ++++++++++
 docs/task_summary.md                               |   1 +
 src/harness.mjs                                    |  74 ++++++++++++--
 tests/cursor-rules-mirror.test.mjs                 | 107 +++++++++++++++++++++
 tests/e2e/ssot-consistency.test.mjs                |   7 ++
 12 files changed, 352 insertions(+), 17 deletions(-)


## 2026-08-12T08:41:06.548Z — a69a174 docs: regenerate overview for the codex hook and cursor mirror sources
docs/chad/chad-handoff.md                                |  6 +++---
 .../cursor-rules-mirror/cursor-rules-mirror-handoff.md   | 16 ++++++++++++++++
 docs/harness-overview.html                               | 15 +++++++++++++++
 3 files changed, 34 insertions(+), 3 deletions(-)


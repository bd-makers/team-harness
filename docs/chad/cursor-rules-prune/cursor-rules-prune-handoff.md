# cursor-rules-prune — Handoff

(세션 종료 시 post-commit hook이 자동 갱신합니다)

## 2026-08-12T09:31:44.513Z — abc087c fix(apply): remove Cursor mirrors whose source rule is gone
CHANGELOG.md                                       |   1 +
 docs/chad/chad-task.md                             |   1 +
 .../cursor-rules-prune-artifact.md                 |  51 +++++++++
 .../cursor-rules-prune-context.md                  |  24 ++++
 .../cursor-rules-prune-handoff.md                  |   3 +
 .../cursor-rules-prune/cursor-rules-prune-plan.md  |  31 +++++
 .../cursor-rules-prune/cursor-rules-prune-spec.md  |  49 ++++++++
 docs/task_summary.md                               |   1 +
 src/commands/sync.mjs                              |   5 +-
 src/harness.mjs                                    |  72 +++++++++++-
 tests/cursor-rules-mirror.test.mjs                 | 127 ++++++++++++++++++++-
 11 files changed, 359 insertions(+), 6 deletions(-)


## 2026-08-12T09:31:51.010Z — 완료

태스크 종료.

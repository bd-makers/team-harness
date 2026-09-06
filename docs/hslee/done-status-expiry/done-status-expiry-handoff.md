# done-status-expiry — Handoff

(세션 종료 시 post-commit hook이 자동 갱신합니다)

## 2026-09-06T09:59:36.123Z — 5b126ac feat(task): 완료 task 상태 만료 — reopen 전이로 meta.status를 정본화
AGENTS.md                                          | 14 +++-
 CHANGELOG.md                                       | 19 +++++
 README.md                                          |  3 +-
 .../done-status-expiry-artifact.md                 | 14 ++++
 .../done-status-expiry-context.md                  | 27 ++++++
 .../done-status-expiry-handoff.md                  |  3 +
 .../done-status-expiry-meta.json                   |  8 ++
 .../done-status-expiry/done-status-expiry-plan.md  | 34 ++++++++
 .../done-status-expiry/done-status-expiry-spec.md  | 98 ++++++++++++++++++++++
 src/commands/session-context.mjs                   |  9 +-
 src/commands/task.mjs                              | 31 +++++--
 templates/AGENTS.md.hbs                            | 14 +++-
 tests/done-guard.test.mjs                          | 41 ++++++++-
 tests/session-context.test.mjs                     | 47 +++++++++++
 tests/summary.test.mjs                             | 73 ++++++++++++++++
 15 files changed, 421 insertions(+), 14 deletions(-)

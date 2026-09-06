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

## 2026-09-06T10:03:15.539Z — d8b3fef test(task): reopen 전이의 미검증 표면 3곳 보강 + 명령 문서에 reopened 분기 추가
commands/harness-task.md                           |  3 +++
 .../done-status-expiry-handoff.md                  | 18 ++++++++++++++++++
 docs/hslee/hslee-handoff.md                        |  9 ++++-----
 tests/agent-files.test.mjs                         |  7 +++++++
 tests/done-guard.test.mjs                          | 22 ++++++++++++++++++++++
 tests/observation-commands.test.mjs                | 16 +++++++++++++++-
 6 files changed, 69 insertions(+), 6 deletions(-)

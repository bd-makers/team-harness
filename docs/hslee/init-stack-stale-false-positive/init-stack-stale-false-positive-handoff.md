# init-stack-stale-false-positive — Handoff

(세션 종료 시 post-commit hook이 자동 갱신합니다)

## 2026-09-27T01:39:23.290Z — b311cd8 fix(init-stack-stale-false-positive): init --stack 강제 스택을 render-state에 고정해 doctor stack 절 stale 오탐 제거
CHANGELOG.md                                       |  7 ++
 README.md                                          |  2 +
 commands/harness-init.md                           |  2 +
 .../init-stack-stale-false-positive-artifact.md    | 38 ++++++++++
 .../init-stack-stale-false-positive-context.md     | 23 +++++++
 .../init-stack-stale-false-positive-handoff.md     |  3 +
 .../init-stack-stale-false-positive-meta.json      | 21 ++++++
 .../init-stack-stale-false-positive-plan.md        | 23 +++++++
 .../init-stack-stale-false-positive-spec.md        | 80 ++++++++++++++++++++++
 src/commands/doctor.mjs                            |  7 +-
 src/commands/init.mjs                              | 16 +++--
 src/commands/migrate.mjs                           |  6 +-
 src/harness.mjs                                    |  5 +-
 src/render-state.mjs                               |  8 ++-
 tests/detect-stack.test.mjs                        | 28 ++++++++
 tests/doctor.test.mjs                              | 11 +++
 tests/migrate-managed-backup.test.mjs              | 14 ++++
 tests/render-state.test.mjs                        |  8 +++
 18 files changed, 288 insertions(+), 14 deletions(-)

## 2026-09-27T02:50:43.037Z — 완료

태스크 종료.

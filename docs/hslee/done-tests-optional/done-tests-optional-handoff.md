# done-tests-optional — Handoff

(세션 종료 시 post-commit hook이 자동 갱신합니다)

## 2026-11-02T14:21:37.183Z — 57ef8f9 fix(done): tests 증거 기본값을 optional로 내림
CHANGELOG.md                                       |  3 +
 README.md                                          |  5 +-
 docs/decisions.md                                  |  3 +
 .../done-tests-optional-artifact.md                | 19 ++++++
 .../done-tests-optional-context.md                 | 27 ++++++++
 .../done-tests-optional-handoff.md                 |  3 +
 .../done-tests-optional-meta.json                  | 11 ++++
 .../done-tests-optional-plan.md                    | 18 ++++++
 .../done-tests-optional-spec.md                    | 53 ++++++++++++++++
 src/commands/task.mjs                              | 15 ++---
 tests/done-guard.test.mjs                          | 73 ++++++++++++++++------
 tests/fixtures/task-paths-golden/expected.txt      |  8 +--
 12 files changed, 207 insertions(+), 31 deletions(-)

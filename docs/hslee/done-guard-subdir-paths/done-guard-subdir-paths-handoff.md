# done-guard-subdir-paths — Handoff

(세션 종료 시 post-commit hook이 자동 갱신합니다)

## 2026-09-26T00:50:16.955Z — 5ed2a7a fix(done-guard-subdir-paths): 하위 디렉터리 설치본에서 handoff 제외·체크박스 면제·sweep 판정이 듣지 않던 결함
CHANGELOG.md                                       |  7 +++
 commands/harness-task.md                           |  2 +-
 .../done-guard-subdir-paths-artifact.md            | 40 +++++++++++++++
 .../done-guard-subdir-paths-context.md             | 23 +++++++++
 .../done-guard-subdir-paths-handoff.md             |  3 ++
 .../done-guard-subdir-paths-meta.json              | 21 ++++++++
 .../done-guard-subdir-paths-plan.md                | 20 ++++++++
 .../done-guard-subdir-paths-spec.md                | 47 +++++++++++++++++
 src/commands/task.mjs                              | 25 +++++++--
 tests/done-guard.test.mjs                          | 60 ++++++++++++++++++----
 tests/handoff-hook-churn.test.mjs                  | 26 ++++++++--
 11 files changed, 255 insertions(+), 19 deletions(-)

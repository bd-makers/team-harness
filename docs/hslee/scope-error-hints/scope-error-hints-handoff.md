# scope-error-hints — Handoff

(세션 종료 시 post-commit hook이 자동 갱신합니다)

## 2026-10-11T06:31:08.190Z — 2ddca58 fix(scope,pr-check): scope 오류 alternatives·pr-check base retry 를 원인 종류로 고른다
CHANGELOG.md                                       |   1 +
 docs/followups.md                                  |  19 +---
 .../scope-error-hints-artifact.md                  |  51 +++++++++
 .../scope-error-hints/scope-error-hints-context.md |  20 ++++
 .../scope-error-hints/scope-error-hints-handoff.md |   3 +
 .../scope-error-hints/scope-error-hints-meta.json  |  11 ++
 .../scope-error-hints/scope-error-hints-plan.md    |  22 ++++
 .../scope-error-hints/scope-error-hints-spec.md    | 117 +++++++++++++++++++++
 src/commands/pr-check.mjs                          |  28 ++++-
 src/commands/scope.mjs                             |  11 +-
 tests/pr-check.test.mjs                            |  70 +++++++++++-
 tests/scope-command.test.mjs                       |  42 ++++++++
 12 files changed, 371 insertions(+), 24 deletions(-)

## 2026-10-11T06:31:17.789Z — ddfdaca docs(task): scope-error-hints TCC 필수 절 복원 + handoff
docs/hslee/scope-error-hints/scope-error-hints-context.md |  3 +++
 docs/hslee/scope-error-hints/scope-error-hints-handoff.md | 15 +++++++++++++++
 2 files changed, 18 insertions(+)

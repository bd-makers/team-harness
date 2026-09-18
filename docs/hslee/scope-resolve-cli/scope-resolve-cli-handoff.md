# scope-resolve-cli — Handoff

(세션 종료 시 post-commit hook이 자동 갱신합니다)

## 2026-09-18T12:32:30.949Z — 0c9df2f fix(scope-resolve-cli): base ref 를 원격 기본 브랜치로 판정하고 harness-team scope 로 노출
bin/harness-team.mjs                               |   2 +
 commands/harness-review.md                         |  17 +-
 commands/harness-ship.md                           |  53 +++-
 docs/harness-overview.html                         |  10 +
 .../scope-resolve-cli-artifact.md                  | 290 ++++++++++++++++++++
 .../scope-resolve-cli/scope-resolve-cli-context.md |  28 ++
 .../scope-resolve-cli/scope-resolve-cli-handoff.md |   3 +
 .../scope-resolve-cli/scope-resolve-cli-meta.json  |  84 ++++++
 .../scope-resolve-cli/scope-resolve-cli-plan.md    |  30 +++
 .../scope-resolve-cli/scope-resolve-cli-spec.md    |  79 ++++++
 skills/harness-team/SKILL.md                       |   1 +
 src/cli-args.mjs                                   |   5 +-
 src/commands/review.mjs                            |  36 ++-
 src/commands/scope.mjs                             |  85 ++++++
 tests/cli-args.test.mjs                            |   2 +-
 tests/scope-command.test.mjs                       | 299 +++++++++++++++++++++
 16 files changed, 1005 insertions(+), 19 deletions(-)

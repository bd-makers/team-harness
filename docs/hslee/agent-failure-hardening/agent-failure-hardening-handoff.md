# agent-failure-hardening — Handoff

(세션 종료 시 post-commit hook이 자동 갱신합니다)

## 2026-10-17T04:22:05.152Z — 0c9a37a fix(done): 삭제된 테스트를 증거로 세던 가드 수정 + 테스트 후퇴·Bash 우회 가드 보강
AGENTS.md                                          |   2 +
 CHANGELOG.md                                       |  12 ++
 commands/harness-comptest.md                       |   1 +
 commands/harness-inttest.md                        |   1 +
 commands/harness-loop.md                           |   4 +-
 commands/harness-spec.md                           |   2 +-
 commands/harness-unittest.md                       |   1 +
 docs/harness-overview.html                         |  14 +++
 docs/harness-overview.template.html                |   9 ++
 .../agent-failure-hardening-artifact.md            | 110 ++++++++++++++++++
 .../agent-failure-hardening-context.md             |  26 +++++
 .../agent-failure-hardening-handoff.md             |   3 +
 .../agent-failure-hardening-meta.json              |  34 ++++++
 .../agent-failure-hardening-plan.md                |  25 ++++
 .../agent-failure-hardening-spec.md                | 128 +++++++++++++++++++++
 src/commands/doctor.mjs                            |   5 +-
 src/commands/migrate.mjs                           |   4 +-
 src/commands/review-prompts.mjs                    |   3 +
 src/commands/task.mjs                              |  80 ++++++++++++-
 templates/.claude/hooks/block-dangerous-bash.sh    | 109 ++++++++++++++++++
 templates/.claude/settings.json                    |  10 ++
 templates/AGENTS.md.hbs                            |   2 +
 tests/agent-files.test.mjs                         |   8 ++
 tests/done-guard.test.mjs                          | 118 +++++++++++++++++++
 tests/e2e/init-smoke.test.mjs                      |   1 +
 tests/fixtures/task-paths-golden/expected.txt      |  10 ++
 tests/hooks-jq-fallback.test.mjs                   |  93 ++++++++++++++-
 tests/loop-command.test.mjs                        |   2 +-
 tests/migrate-hooks.test.mjs                       |  12 +-
 tests/review-command.test.mjs                      |   8 ++
 tests/task-templates.test.mjs                      |  14 +++
 31 files changed, 836 insertions(+), 15 deletions(-)

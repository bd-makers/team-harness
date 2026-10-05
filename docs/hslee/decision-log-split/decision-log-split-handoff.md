# decision-log-split — Handoff

(세션 종료 시 post-commit hook이 자동 갱신합니다)

## 2026-10-05T08:54:02.319Z — 2724ff7 feat(decisions): 결정 로그를 팀 운영·플러그인 결정으로 나누고 D11 범위 헌장을 기록한다
AGENTS.md                                          |   1 -
 CHANGELOG.md                                       |   7 +
 commands/harness-migrate.md                        |   2 +-
 commands/harness-review.md                         |   2 +-
 docs/decisions.md                                  |  56 ++++-
 docs/harness-cycle.md                              | 242 +++++++++++++++++++++
 .../decision-log-split-artifact.md                 |  13 ++
 .../decision-log-split-context.md                  |  22 ++
 .../decision-log-split-handoff.md                  |   3 +
 .../decision-log-split-meta.json                   |  11 +
 .../decision-log-split/decision-log-split-plan.md  |  23 ++
 .../decision-log-split/decision-log-split-spec.md  |  54 +++++
 src/commands/doctor.mjs                            |   5 +-
 templates/AGENTS.md.hbs                            |   1 -
 templates/docs/decisions.md                        | 138 +-----------
 tests/agent-files.test.mjs                         |  23 +-
 tests/doctor.test.mjs                              |  47 ++--
 17 files changed, 481 insertions(+), 169 deletions(-)

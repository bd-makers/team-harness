# hook-jq-fallback-delivery — Handoff

(세션 종료 시 post-commit hook이 자동 갱신합니다)

## 2026-08-21T13:11:49.528Z — aa9de65 fix(hooks): PR #29 후속 — jq-fallback 배달·doctor 정직성·extraction-failure 커버리지
CHANGELOG.md                                       |  27 ++++
 .../hook-jq-fallback-delivery-artifact.md          |  48 ++++++
 .../hook-jq-fallback-delivery-context.md           |  33 +++++
 .../hook-jq-fallback-delivery-handoff.md           |   3 +
 .../hook-jq-fallback-delivery-meta.json            |   7 +
 .../hook-jq-fallback-delivery-plan.md              |  30 ++++
 .../hook-jq-fallback-delivery-spec.md              |  97 ++++++++++++
 src/commands/doctor.mjs                            |  52 ++++++-
 src/commands/migrate.mjs                           |  99 +++++++++----
 templates/.claude/hooks/auto-format.sh             |  10 +-
 templates/.claude/hooks/block-dangerous-git.sh     |  10 +-
 templates/.claude/hooks/pre-commit-check.sh        |  10 +-
 templates/.claude/hooks/protect-files.sh           |  10 +-
 tests/doctor.test.mjs                              |  89 ++++++++++-
 tests/fixtures/stock-hooks/README.md               |  18 +++
 .../stock-hooks/jq-fallback-v1/auto-format.sh      |  46 ++++++
 .../jq-fallback-v1/block-dangerous-git.sh          |  86 +++++++++++
 .../stock-hooks/jq-fallback-v1/pre-commit-check.sh | 118 +++++++++++++++
 .../stock-hooks/jq-fallback-v1/protect-files.sh    |  49 ++++++
 .../stock-hooks/older/block-dangerous-git.sh       |  47 ++++++
 .../fixtures/stock-hooks/older/pre-commit-check.sh |  35 +++++
 .../stock-hooks/pre-jq-fallback/auto-format.sh     |  21 +++
 .../pre-jq-fallback/block-dangerous-git.sh         |  56 +++++++
 .../pre-jq-fallback/pre-commit-check.sh            |  75 ++++++++++
 .../stock-hooks/pre-jq-fallback/protect-files.sh   |  24 +++
 tests/hooks-jq-fallback.test.mjs                   |  79 ++++++++++
 tests/migrate-hooks.test.mjs                       | 165 +++++++++++++++++++++
 27 files changed, 1303 insertions(+), 41 deletions(-)


## 2026-08-21T13:11:54.968Z — 35d821e docs(task): post-commit hook handoff 자동 갱신 반영
docs/chad/chad-handoff.md                          |  6 ++---
 .../hook-jq-fallback-delivery-handoff.md           | 31 ++++++++++++++++++++++
 2 files changed, 34 insertions(+), 3 deletions(-)


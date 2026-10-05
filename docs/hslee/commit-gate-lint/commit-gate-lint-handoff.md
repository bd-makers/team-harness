# commit-gate-lint — Handoff

(세션 종료 시 post-commit hook이 자동 갱신합니다)

## 2026-10-05T02:56:11.972Z — 1f38b9c feat(hooks): 커밋 게이트가 package.json lint 스크립트를 돌린다
docs/diagrams/harness-overview/hooks.mmd           |   5 +-
 docs/harness-overview.html                         |  13 +-
 docs/harness-overview.template.html                |   3 +-
 .../commit-gate-lint/commit-gate-lint-artifact.md  |  38 ++++++
 .../commit-gate-lint/commit-gate-lint-context.md   |  22 ++++
 .../commit-gate-lint/commit-gate-lint-handoff.md   |   3 +
 .../commit-gate-lint/commit-gate-lint-meta.json    |  11 ++
 .../commit-gate-lint/commit-gate-lint-plan.md      |  20 ++++
 .../commit-gate-lint/commit-gate-lint-spec.md      |  84 +++++++++++++
 src/commands/migrate.mjs                           |   1 +
 templates/.claude/hooks/pre-commit-check.sh        |  30 +++--
 tests/fixtures/stock-hooks/README.md               |   3 +
 .../stock-hooks/pre-lint/pre-commit-check.sh       | 133 +++++++++++++++++++++
 tests/hooks-jq-fallback.test.mjs                   |  56 +++++++++
 tests/migrate-hooks.test.mjs                       |  12 +-
 15 files changed, 420 insertions(+), 14 deletions(-)

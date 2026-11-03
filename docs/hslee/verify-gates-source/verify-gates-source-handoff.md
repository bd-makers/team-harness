# verify-gates-source — Handoff

(세션 종료 시 post-commit hook이 자동 갱신합니다)

## 2026-11-03T16:26:14.243Z — ff91954 feat(verify): /verify가 커밋 게이트 목록(.harness/gates.json)을 정본으로 읽는다
CHANGELOG.md                                       |  3 ++
 docs/harness-overview.html                         |  5 ++
 .../verify-gates-source-artifact.md                | 17 ++++++
 .../verify-gates-source-context.md                 | 28 ++++++++++
 .../verify-gates-source-handoff.md                 |  3 ++
 .../verify-gates-source-meta.json                  | 11 ++++
 .../verify-gates-source-plan.md                    | 18 +++++++
 .../verify-gates-source-spec.md                    | 62 ++++++++++++++++++++++
 src/commands/migrate.mjs                           |  1 +
 templates/.claude/skills/verify/SKILL.md           | 28 +++++-----
 .../.claude/skills/verify/SKILL.md                 | 30 +++++++++++
 tests/fixtures/stock-templates/README.md           |  4 +-
 tests/migrate-templates.test.mjs                   |  2 +-
 13 files changed, 197 insertions(+), 15 deletions(-)

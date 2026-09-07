# template-refresh-policy — Handoff

(세션 종료 시 post-commit hook이 자동 갱신합니다)

## 2026-09-07T14:55:44.950Z — 8dd52c3 feat(migrate): 템플릿 refresh를 스킬·규칙까지 확장 + doctor stale 경고 (D8)
commands/harness-init.md                           |  13 +-
 .../template-refresh-policy-artifact.md            |  84 ++++++++++
 .../template-refresh-policy-context.md             |  36 +++++
 .../template-refresh-policy-handoff.md             |   3 +
 .../template-refresh-policy-meta.json              |   8 +
 .../template-refresh-policy-plan.md                |  30 ++++
 .../template-refresh-policy-spec.md                |  93 +++++++++++
 docs/decisions.md                                  |  30 ++++
 src/commands/doctor.mjs                            |  20 ++-
 src/commands/migrate.mjs                           | 153 ++++++++++++++++---
 src/commands/rules.mjs                             |   6 +-
 templates/docs/decisions.md                        |  30 ++++
 tests/doctor.test.mjs                              |   8 +-
 .../.claude/rules/navigation.md                    |  67 ++++++++
 .../.claude/rules/state-management.md              |  75 +++++++++
 .../2026-04-16-6948aa73/.claude/rules/styling.md   |  48 ++++++
 .../2026-04-16-6948aa73/.claude/rules/testing.md   |  52 +++++++
 .../.claude/skills/fix-bug/SKILL.md                |  38 +++++
 .../.claude/skills/new-feature/SKILL.md            |  41 +++++
 .../.claude/skills/verify/SKILL.md                 |  37 +++++
 .../.claude/skills/fix-bug/SKILL.md                |  38 +++++
 .../.claude/skills/new-feature/SKILL.md            |  41 +++++
 .../.claude/skills/fix-bug/SKILL.md                |  38 +++++
 .../.claude/skills/new-feature/SKILL.md            |  41 +++++
 .../.claude/skills/fix-bug/SKILL.md                |  38 +++++
 .../.claude/skills/new-feature/SKILL.md            |  38 +++++
 .../.claude/skills/fix-bug/SKILL.md                |  51 +++++++
 .../.claude/skills/fix-bug/SKILL.md                |  55 +++++++
 .../.claude/skills/new-feature/SKILL.md            |  41 +++++
 .../2026-09-03-58b22848/.claude/rules/styling.md   |  48 ++++++
 .../2026-09-03-58b22848/.claude/rules/testing.md   |  50 ++++++
 .../.claude/skills/new-feature/SKILL.md            |  43 ++++++
 .../.claude/skills/new-feature/SKILL.md            |  45 ++++++
 tests/fixtures/stock-templates/README.md           |  26 ++++
 tests/migrate-templates.test.mjs                   | 170 +++++++++++++++++++++
 35 files changed, 1606 insertions(+), 29 deletions(-)

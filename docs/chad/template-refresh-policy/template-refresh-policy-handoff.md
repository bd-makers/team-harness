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

## 2026-09-07T14:55:51.896Z — 209577e chore(docs): post-commit handoff 갱신
docs/chad/chad-handoff.md                          |  9 +++--
 .../template-refresh-policy-handoff.md             | 38 ++++++++++++++++++++++
 2 files changed, 42 insertions(+), 5 deletions(-)

## 2026-09-07T15:08:40.023Z — b4a8d69 test(doctor): stale 경고·stock 유래 억제 테스트 + migrate 명령 문서 갱신
commands/harness-migrate.md                        |  17 ++-
 docs/chad/chad-handoff.md                          |   2 +-
 .../template-refresh-policy-handoff.md             |   5 +
 docs/harness-overview.html                         | 114 ++++++++++++++++++++-
 tests/doctor.test.mjs                              |  49 +++++++++
 tests/rules.test.mjs                               |  43 ++++++++
 6 files changed, 225 insertions(+), 5 deletions(-)

## 2026-09-07T15:08:58.037Z — 49da9d8 chore(docs): post-commit handoff 갱신
docs/chad/chad-handoff.md                                        | 2 +-
 .../template-refresh-policy/template-refresh-policy-handoff.md   | 9 +++++++++
 2 files changed, 10 insertions(+), 1 deletion(-)

## 2026-09-07T15:18:39.618Z — d26d96c fix(migrate): codex 리뷰 MAJOR 2건 반영 — cursor 미러 재생성 + 쓰기 직전 재검증
docs/chad/chad-handoff.md                          |   2 +-
 .../template-refresh-policy-artifact.md            |  30 +++++++
 .../template-refresh-policy-handoff.md             |   5 ++
 src/commands/migrate.mjs                           |  47 ++++++++--
 tests/migrate-templates.test.mjs                   | 100 +++++++++++++++++++++
 5 files changed, 174 insertions(+), 10 deletions(-)

## 2026-09-08T06:11:59.506Z — 완료

태스크 종료.

## 2026-09-08T07:22:22.223Z — 완료

태스크 종료.

## 2026-09-08T09:40:17.752Z — 완료

태스크 종료.

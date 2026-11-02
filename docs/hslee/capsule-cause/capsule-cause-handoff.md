# capsule-cause — Handoff

(세션 종료 시 post-commit hook이 자동 갱신합니다)

## 2026-11-02T16:39:23.601Z — 63d7024 feat(task): TCC failure capsule에 원인 범주 Cause 줄(권장)
AGENTS.md                                          |   3 +
 CHANGELOG.md                                       |   1 +
 docs/harness-overview.html                         |  10 +++
 docs/hslee/capsule-cause/capsule-cause-artifact.md |  13 +++
 docs/hslee/capsule-cause/capsule-cause-context.md  |  27 ++++++
 docs/hslee/capsule-cause/capsule-cause-handoff.md  |   3 +
 docs/hslee/capsule-cause/capsule-cause-meta.json   |  11 +++
 docs/hslee/capsule-cause/capsule-cause-plan.md     |  22 +++++
 docs/hslee/capsule-cause/capsule-cause-spec.md     | 100 +++++++++++++++++++++
 src/commands/migrate.mjs                           |   2 +
 src/commands/task.mjs                              |   1 +
 templates/.claude/skills/fix-bug/SKILL.md          |   2 +-
 templates/.claude/skills/new-feature/SKILL.md      |   2 +-
 templates/AGENTS.md.hbs                            |   3 +
 tests/context.test.mjs                             |   8 ++
 .../.claude/skills/fix-bug/SKILL.md                |  55 ++++++++++++
 .../.claude/skills/new-feature/SKILL.md            |  53 +++++++++++
 tests/fixtures/stock-templates/README.md           |   5 +-
 tests/fixtures/task-paths-golden/expected.txt      |   7 +-
 tests/migrate-templates.test.mjs                   |   2 +-
 20 files changed, 323 insertions(+), 7 deletions(-)

## 2026-11-02T16:40:47.315Z — 8586247 fix(task): capsule 원인 범주 안내를 AGENTS.md에서 스킬로 옮김
AGENTS.md                                         |  3 ---
 CHANGELOG.md                                      |  2 +-
 docs/hslee/capsule-cause/capsule-cause-handoff.md | 23 +++++++++++++++++++++++
 docs/hslee/capsule-cause/capsule-cause-plan.md    |  4 ++--
 docs/hslee/capsule-cause/capsule-cause-spec.md    | 14 ++++++++------
 templates/.claude/skills/fix-bug/SKILL.md         |  2 +-
 templates/.claude/skills/new-feature/SKILL.md     |  2 +-
 templates/AGENTS.md.hbs                           |  3 ---
 8 files changed, 36 insertions(+), 17 deletions(-)

## 2026-11-02T16:42:10.025Z — 4f260b9 feat(task): TCC failure capsule에 원인 범주 Cause 줄(권장)
CHANGELOG.md                                       |   1 +
 docs/harness-overview.html                         |  10 ++
 docs/hslee/capsule-cause/capsule-cause-artifact.md |  42 +++++++++
 docs/hslee/capsule-cause/capsule-cause-context.md  |  27 ++++++
 docs/hslee/capsule-cause/capsule-cause-handoff.md  |  58 ++++++++++++
 docs/hslee/capsule-cause/capsule-cause-meta.json   |  23 +++++
 docs/hslee/capsule-cause/capsule-cause-plan.md     |  22 +++++
 docs/hslee/capsule-cause/capsule-cause-spec.md     | 102 +++++++++++++++++++++
 src/commands/migrate.mjs                           |   2 +
 src/commands/task.mjs                              |   1 +
 templates/.claude/skills/fix-bug/SKILL.md          |   2 +-
 templates/.claude/skills/new-feature/SKILL.md      |   2 +-
 tests/context.test.mjs                             |   8 ++
 .../.claude/skills/fix-bug/SKILL.md                |  55 +++++++++++
 .../.claude/skills/new-feature/SKILL.md            |  53 +++++++++++
 tests/fixtures/stock-templates/README.md           |   7 +-
 tests/fixtures/task-paths-golden/expected.txt      |   7 +-
 tests/migrate-templates.test.mjs                   |   2 +-
 18 files changed, 416 insertions(+), 8 deletions(-)

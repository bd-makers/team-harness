# spec-writing-skill — Handoff

(세션 종료 시 post-commit hook이 자동 갱신합니다)

## 2026-08-21T06:15:07.536Z — 8c570d2 feat(commands): /harness-spec 스펙 초안 생성 커맨드 추가 — Confluence·Figma·인터뷰 3소스
.claude-plugin/plugin.json                         |  1 +
 CHANGELOG.md                                       | 12 ++++
 CLAUDE.md                                          |  1 +
 README.md                                          | 13 +++-
 commands/harness-interview.md                      |  4 +-
 commands/harness-spec.md                           | 69 ++++++++++++++++++++++
 .../spec-writing-skill-artifact.md                 | 55 +++++++++++++++++
 .../spec-writing-skill-context.md                  | 26 ++++++++
 .../spec-writing-skill-handoff.md                  |  3 +
 .../spec-writing-skill-meta.json                   |  7 +++
 .../spec-writing-skill/spec-writing-skill-plan.md  | 24 ++++++++
 .../spec-writing-skill/spec-writing-skill-spec.md  | 45 ++++++++++++++
 docs/harness-overview.html                         | 21 +++++++
 skills/harness-spec/SKILL.md                       | 19 ++++++
 skills/harness-spec/agents/openai.yaml             |  4 ++
 src/commands/task.mjs                              |  4 +-
 templates/CLAUDE.md.hbs                            |  1 +
 tests/task-templates.test.mjs                      |  2 +-
 18 files changed, 303 insertions(+), 8 deletions(-)


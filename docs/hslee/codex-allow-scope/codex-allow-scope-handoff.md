# codex-allow-scope — Handoff

(세션 종료 시 post-commit hook이 자동 갱신합니다)

## 2026-11-03T15:45:47.412Z — 798bc1f fix(settings): 리뷰어 allow Bash(codex:*) 제거 + migrate 정리 단계
AGENTS.md                                          |  2 +-
 CHANGELOG.md                                       |  3 ++
 .../codex-allow-scope-artifact.md                  | 17 ++++++
 .../codex-allow-scope/codex-allow-scope-context.md | 28 ++++++++++
 .../codex-allow-scope/codex-allow-scope-handoff.md |  3 ++
 .../codex-allow-scope/codex-allow-scope-meta.json  | 11 ++++
 .../codex-allow-scope/codex-allow-scope-plan.md    | 19 +++++++
 .../codex-allow-scope/codex-allow-scope-spec.md    | 63 ++++++++++++++++++++++
 src/commands/migrate.mjs                           | 34 +++++++++++-
 templates/.claude/settings.json                    |  3 +-
 templates/AGENTS.md.hbs                            |  2 +-
 tests/migrate-session-hook.test.mjs                | 25 ++++++++-
 tests/settings-permissions.test.mjs                |  5 +-
 13 files changed, 207 insertions(+), 8 deletions(-)

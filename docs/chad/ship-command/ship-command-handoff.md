# ship-command — Handoff

(세션 종료 시 post-commit hook이 자동 갱신합니다)

## 2026-08-20T10:03:48.450Z — 2ba91f2 feat(commands): PR/MR 직전 최종 갱신 커맨드 /harness-ship 추가
.claude-plugin/plugin.json                      |  1 +
 AGENTS.md                                       |  2 +
 CHANGELOG.md                                    | 18 +++++
 README.md                                       | 24 ++++++-
 commands/harness-ship.md                        | 96 +++++++++++++++++++++++++
 docs/chad/ship-command/ship-command-artifact.md | 13 ++++
 docs/chad/ship-command/ship-command-context.md  | 28 ++++++++
 docs/chad/ship-command/ship-command-handoff.md  |  3 +
 docs/chad/ship-command/ship-command-meta.json   |  7 ++
 docs/chad/ship-command/ship-command-plan.md     | 28 ++++++++
 docs/chad/ship-command/ship-command-spec.md     | 78 ++++++++++++++++++++
 docs/harness-overview.html                      | 16 +++++
 skills/harness-ship/SKILL.md                    | 30 ++++++++
 templates/AGENTS.md.hbs                         |  2 +
 14 files changed, 343 insertions(+), 3 deletions(-)


## 2026-08-20T10:06:45.419Z — 39def79 docs(task): ship-command plan 완료 체크 + artifact에 결과·학습 기록
docs/chad/chad-handoff.md                       |  6 +--
 docs/chad/ship-command/ship-command-artifact.md | 59 ++++++++++++++++++++++++-
 docs/chad/ship-command/ship-command-handoff.md  | 18 ++++++++
 docs/chad/ship-command/ship-command-plan.md     |  4 +-
 4 files changed, 81 insertions(+), 6 deletions(-)


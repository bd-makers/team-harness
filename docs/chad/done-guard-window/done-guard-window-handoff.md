# done-guard-window — Handoff

(세션 종료 시 post-commit hook이 자동 갱신합니다)

## 2026-08-26T00:16:23.268Z — db7afa4 fix(done): 판정 창을 switchedAt → meta.firstActivatedAt 으로 교체
AGENTS.md                                          |   5 +-
 CHANGELOG.md                                       |  16 +++
 .../done-guard-window-artifact.md                  |  49 ++++++++-
 .../done-guard-window/done-guard-window-plan.md    |  14 ++-
 .../done-guard-window/done-guard-window-spec.md    |  48 ++++++--
 src/commands/summary.mjs                           |   7 +-
 src/commands/task.mjs                              |  38 +++++--
 templates/AGENTS.md.hbs                            |   5 +-
 tests/done-guard.test.mjs                          | 121 +++++++++++++++++++--
 tests/summary.test.mjs                             |  23 ++++
 10 files changed, 282 insertions(+), 44 deletions(-)

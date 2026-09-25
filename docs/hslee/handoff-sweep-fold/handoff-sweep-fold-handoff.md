# handoff-sweep-fold — Handoff

(세션 종료 시 post-commit hook이 자동 갱신합니다)

## 2026-09-25T15:08:53.655Z — 685b744 docs(task): post-commit handoff 변경은 단독 커밋 말고 다음 커밋에 담는다
AGENTS.md                                          |  2 +-
 CHANGELOG.md                                       |  6 +++
 commands/harness-ship.md                           |  3 +-
 commands/harness-task.md                           | 10 +++-
 .../handoff-sweep-fold-artifact.md                 | 46 ++++++++++++++++
 .../handoff-sweep-fold-context.md                  | 27 ++++++++++
 .../handoff-sweep-fold-handoff.md                  |  3 ++
 .../handoff-sweep-fold-meta.json                   | 21 ++++++++
 .../handoff-sweep-fold/handoff-sweep-fold-plan.md  | 22 ++++++++
 .../handoff-sweep-fold/handoff-sweep-fold-spec.md  | 62 ++++++++++++++++++++++
 templates/AGENTS.md.hbs                            |  2 +-
 11 files changed, 199 insertions(+), 5 deletions(-)

# pocock-merge — Handoff

(세션 종료 시 post-commit hook이 자동 갱신합니다)

## 2026-07-02T09:20:57.187Z — c12adc5 feat(harness): Matt Pocock git-guardrails hook + diagnosing-bugs 흡수
docs/chad/chad-task.md                          |   1 +
 docs/chad/pocock-merge/pocock-merge-artifact.md |  44 +++
 docs/chad/pocock-merge/pocock-merge-handoff.md  |   3 +
 docs/chad/pocock-merge/pocock-merge-plan.md     |  26 ++
 docs/chad/pocock-merge/pocock-merge-spec.md     |  46 +++
 docs/harness-overview.html                      | 478 +++---------------------
 docs/harness-workflow-simulation.html           | 193 ++--------
 docs/task_summary.md                            |   1 +
 templates/.claude/hooks/block-dangerous-git.sh  |  47 +++
 templates/.claude/settings.json                 |   5 +
 templates/.claude/skills/fix-bug/SKILL.md       |  29 +-
 11 files changed, 270 insertions(+), 603 deletions(-)


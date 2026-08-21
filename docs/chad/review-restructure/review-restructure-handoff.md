# review-restructure — Handoff

(세션 종료 시 post-commit hook이 자동 갱신합니다)

## 2026-08-21T11:15:30.787Z — d6add52 feat(review): 리뷰 커맨드를 엔진 중립 /harness-review·/harness-adversarial-review로 재편
.claude-plugin/plugin.json                         |   2 +
 CHANGELOG.md                                       |  19 +++
 README.md                                          |   6 +-
 commands/harness-adversarial-review.md             |  42 ++++++
 commands/harness-codex-adversarial-review.md       |  48 ++-----
 commands/harness-codex-review.md                   |  73 ++---------
 commands/harness-review.md                         | 144 +++++++++++++++++++++
 commands/harness-task.md                           |   2 +-
 .../review-restructure-artifact.md                 |  53 ++++++++
 .../review-restructure-context.md                  |  28 ++++
 .../review-restructure-handoff.md                  |   3 +
 .../review-restructure-meta.json                   |   7 +
 .../review-restructure/review-restructure-plan.md  |  25 ++++
 .../review-restructure/review-restructure-spec.md  |  79 +++++++++++
 docs/harness-overview.html                         |  40 +++++-
 skills/harness-adversarial-review/SKILL.md         |  18 +++
 skills/harness-codex-adversarial-review/SKILL.md   |  21 +--
 skills/harness-codex-review/SKILL.md               |  22 ++--
 skills/harness-review/SKILL.md                     |  22 ++++
 19 files changed, 520 insertions(+), 134 deletions(-)


## 2026-08-21T15:18:35.635Z — 완료

태스크 종료.

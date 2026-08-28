# deprecated-review-carryover — Handoff

(세션 종료 시 post-commit hook이 자동 갱신합니다)

## 2026-08-28T14:15:04.291Z — 4bb5b44 docs(changelog): 0.20.0 이월 기록 누락을 Unreleased Notes로 정정
CHANGELOG.md | 18 ++++++++++++++++++
 1 file changed, 18 insertions(+)

## 2026-08-28T14:15:13.752Z — de2890b docs(task): deprecated-review-carryover spec·plan·artifact·context 기록
docs/chad/chad-handoff.md                          |  6 +-
 .../deprecated-review-carryover-artifact.md        | 25 ++++++++
 .../deprecated-review-carryover-context.md         | 25 ++++++++
 .../deprecated-review-carryover-handoff.md         |  7 +++
 .../deprecated-review-carryover-meta.json          |  8 +++
 .../deprecated-review-carryover-plan.md            | 35 +++++++++++
 .../deprecated-review-carryover-spec.md            | 72 ++++++++++++++++++++++
 7 files changed, 175 insertions(+), 3 deletions(-)

## 2026-08-28T14:44:23.387Z — 67425cd feat(review)!: deprecated 옛 리뷰 이름 4개 제거 — 3릴리스 이월 끝
.claude-plugin/plugin.json                         |  4 +--
 CHANGELOG.md                                       | 29 +++++++++++++++++--
 README.md                                          |  6 ++--
 commands/harness-codex-adversarial-review.md       | 18 ------------
 commands/harness-codex-review.md                   | 17 -----------
 commands/harness-diagram.md                        |  2 +-
 .../deprecated-review-carryover-artifact.md        | 30 ++++++++++++++++++++
 .../deprecated-review-carryover-plan.md            | 33 ++++++++++++++++------
 .../deprecated-review-carryover-spec.md            |  5 +++-
 docs/harness-fleet-guide.html                      |  4 +--
 docs/harness-overview.html                         | 32 ---------------------
 docs/harness-task-guide.html                       |  4 +--
 docs/harness-workflow-simulation.html              |  4 +--
 skills/harness-codex-adversarial-review/SKILL.md   | 17 -----------
 skills/harness-codex-review/SKILL.md               | 15 ----------
 15 files changed, 96 insertions(+), 124 deletions(-)

## 2026-08-28T14:44:42.102Z — 68e76c1 chore(task): post-commit 훅이 갱신한 handoff 반영
docs/chad/chad-handoff.md                              |  2 +-
 .../deprecated-review-carryover-handoff.md             | 18 ++++++++++++++++++
 2 files changed, 19 insertions(+), 1 deletion(-)

## 2026-08-28T14:48:13.024Z — 4c84819 docs(task): codex 외부 리뷰 결과 기록 — Approve, 발견 0건
docs/chad/chad-handoff.md                           |  2 +-
 .../deprecated-review-carryover-artifact.md         | 21 +++++++++++++++++++++
 .../deprecated-review-carryover-handoff.md          |  5 +++++
 3 files changed, 27 insertions(+), 1 deletion(-)

## 2026-08-28T22:24:18.890Z — 완료

태스크 종료.

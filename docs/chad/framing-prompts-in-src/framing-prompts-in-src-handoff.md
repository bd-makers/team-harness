# framing-prompts-in-src — Handoff

(세션 종료 시 post-commit hook이 자동 갱신합니다)

## 2026-09-11T19:31:08.389Z — d987287 feat(review): 프레이밍 프롬프트 정본을 src로 이관 — --framing만으로 실행, testcritic은 --rubric
CHANGELOG.md                                       |  14 ++
 commands/harness-adversarial-review.md             |  11 +-
 commands/harness-comptest.md                       |  31 ++--
 commands/harness-contrarian.md                     |  32 +++--
 commands/harness-inttest.md                        |  31 ++--
 commands/harness-review.md                         |  10 +-
 commands/harness-ship.md                           |  34 +++--
 commands/harness-simplifier.md                     |  31 ++--
 commands/harness-unittest.md                       |  31 ++--
 .../framing-prompts-in-src-artifact.md             |  64 +++++++++
 .../framing-prompts-in-src-context.md              |  25 ++++
 .../framing-prompts-in-src-handoff.md              |   3 +
 .../framing-prompts-in-src-meta.json               |  21 +++
 .../framing-prompts-in-src-plan.md                 |  42 ++++++
 .../framing-prompts-in-src-spec.md                 | 159 +++++++++++++++++++++
 docs/followups.md                                  |  23 +--
 docs/harness-overview.html                         |   5 +
 src/cli-args.mjs                                   |   6 +-
 src/commands/review-prompts.mjs                    | 151 +++++++++++++++++++
 src/commands/review.mjs                            |  99 ++++++++++---
 src/commands/task.mjs                              |   2 +-
 tests/review-command.test.mjs                      | 123 ++++++++++++++++
 22 files changed, 832 insertions(+), 116 deletions(-)

## 2026-09-11T19:31:27.495Z — 6240fe4 chore(docs): post-commit handoff 갱신 + plan 종결 단계 체크
docs/chad/chad-handoff.md                          |  9 ++++----
 .../framing-prompts-in-src-handoff.md              | 25 ++++++++++++++++++++++
 .../framing-prompts-in-src-plan.md                 |  2 +-
 3 files changed, 30 insertions(+), 6 deletions(-)

## 2026-09-11T19:31:27.612Z — 완료

태스크 종료.

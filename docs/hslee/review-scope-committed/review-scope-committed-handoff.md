# review-scope-committed — Handoff

(세션 종료 시 post-commit hook이 자동 갱신합니다)

## 2026-10-10T16:05:13.567Z — 550743e docs(task): review-scope-committed spec·plan — worktree scope 를 merge-base 이후 커밋 + 미커밋으로
docs/followups.md                                  |  10 +-
 .../review-scope-committed-artifact.md             |  13 ++
 .../review-scope-committed-context.md              |  27 +++
 .../review-scope-committed-handoff.md              |   3 +
 .../review-scope-committed-meta.json               |  11 +
 .../review-scope-committed-plan.md                 |  23 +++
 .../review-scope-committed-spec.md                 | 222 +++++++++++++++++++++
 7 files changed, 301 insertions(+), 8 deletions(-)

## 2026-10-10T16:15:09.922Z — f62f833 fix(review): worktree scope 가 base 와의 merge-base 이후 커밋까지 리뷰한다
CHANGELOG.md                                       | 10 +++
 commands/harness-review.md                         | 25 ++++++--
 commands/harness-ship.md                           | 19 +++---
 .../review-scope-committed-handoff.md              | 10 +++
 .../review-scope-committed-plan.md                 | 15 ++---
 .../review-scope-committed-spec.md                 | 42 +++++++------
 src/commands/review.mjs                            | 71 +++++++++++++++++-----
 src/commands/scope.mjs                             | 13 ++--
 src/commands/summary.mjs                           |  2 +-
 tests/review-command.test.mjs                      | 62 +++++++++++++++++++
 tests/scope-command.test.mjs                       |  8 ++-
 11 files changed, 216 insertions(+), 61 deletions(-)

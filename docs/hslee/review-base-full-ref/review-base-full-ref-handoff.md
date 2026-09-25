# review-base-full-ref — Handoff

(세션 종료 시 post-commit hook이 자동 갱신합니다)

## 2026-09-25T13:10:02.871Z — edf4845 fix(review): 추론 base 를 refs/remotes/origin/<branch> 전체 이름으로 쓴다
CHANGELOG.md                                       |  6 +++
 commands/harness-review.md                         |  2 +
 .../review-base-full-ref-artifact.md               | 13 ++++++
 .../review-base-full-ref-context.md                | 27 ++++++++++++
 .../review-base-full-ref-handoff.md                |  3 ++
 .../review-base-full-ref-meta.json                 | 11 +++++
 .../review-base-full-ref-plan.md                   | 20 +++++++++
 .../review-base-full-ref-spec.md                   | 51 ++++++++++++++++++++++
 src/commands/remote-task.mjs                       |  3 +-
 src/commands/review.mjs                            |  4 +-
 tests/scope-command.test.mjs                       | 33 ++++++++++++--
 11 files changed, 167 insertions(+), 6 deletions(-)

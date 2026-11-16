# notebooklm-review-followups — Handoff

(선택 문서 — 다음 세션에 넘길 메모를 직접 적습니다. 커밋 이력은 `git log`로 봅니다)

## 2026-11-16T13:49:10.336Z — 61c0765 feat(done): 보장 범위 줄에 리뷰 증거·커밋 게이트 정보를 보이고 규범 준수 eval 기준선을 추가한다
CHANGELOG.md                                       |  8 +++
 README.md                                          |  6 +-
 commands/harness-retro.md                          |  2 +
 .../notebooklm-review-followups-artifact.md        | 67 ++++++++++++++++++++++
 .../notebooklm-review-followups-handoff.md         |  3 +
 .../notebooklm-review-followups-meta.json          | 23 ++++++++
 .../notebooklm-review-followups-plan.md            | 19 ++++++
 .../notebooklm-review-followups-spec.md            | 47 +++++++++++++++
 evals/50-task-gate-question/case.yaml              |  4 ++
 evals/50-task-gate-question/fixture.sh             | 17 ++++++
 evals/50-task-gate-question/graders/task-gate.md   |  7 +++
 evals/50-task-gate-question/prompt.md              |  7 +++
 evals/51-plan-no-precheck/case.yaml                |  4 ++
 evals/51-plan-no-precheck/fixture.sh               | 27 +++++++++
 evals/51-plan-no-precheck/graders/no-precheck.md   |  7 +++
 evals/51-plan-no-precheck/prompt.md                |  7 +++
 evals/52-completion-report-4items/case.yaml        |  4 ++
 evals/52-completion-report-4items/fixture.sh       | 21 +++++++
 .../graders/four-items.md                          |  5 ++
 evals/52-completion-report-4items/prompt.md        |  7 +++
 evals/53-review-recorded-before-pr/case.yaml       |  4 ++
 evals/53-review-recorded-before-pr/fixture.sh      | 37 ++++++++++++
 .../graders/review-recorded.md                     |  5 ++
 evals/53-review-recorded-before-pr/prompt.md       |  7 +++
 evals/README.md                                    |  7 +++
 src/commands/task.mjs                              | 28 +++++----
 tests/done-guard.test.mjs                          | 36 +++++++++++-
 tests/fixtures/task-paths-golden/expected.txt      |  2 +-
 28 files changed, 400 insertions(+), 18 deletions(-)

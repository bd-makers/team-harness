# done-guard-evidence — Handoff

(세션 종료 시 post-commit hook이 자동 갱신합니다)

## 2026-08-21T17:38:32.138Z — 1eac180 feat(done-guard): 증거 기반 체크 2종 추가 (테스트 작성 / 리뷰 마커)
commands/harness-adversarial-review.md             |   4 +-
 commands/harness-review.md                         |  11 ++
 .../done-guard-evidence-artifact.md                |  60 ++++++
 .../done-guard-evidence-context.md                 |  35 ++++
 .../done-guard-evidence-handoff.md                 |   3 +
 .../done-guard-evidence-meta.json                  |   7 +
 .../done-guard-evidence-plan.md                    |  39 ++++
 .../done-guard-evidence-spec.md                    | 103 ++++++++++
 src/commands/task.mjs                              | 153 ++++++++++++++-
 tests/done-guard.test.mjs                          | 217 ++++++++++++++++++++-
 10 files changed, 629 insertions(+), 3 deletions(-)

## 2026-08-21T17:41:02.282Z — 완료

태스크 종료.

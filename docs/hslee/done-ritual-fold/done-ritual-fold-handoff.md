# done-ritual-fold — Handoff

(세션 종료 시 post-commit hook이 자동 갱신합니다)

## 2026-09-25T23:57:48.689Z — c8871c5 feat(done-ritual-fold): done 가드가 체크박스만 켠 plan.md를 미커밋 작업으로 세지 않는다
commands/harness-task.md                           | 11 +++
 .../done-ritual-fold/done-ritual-fold-artifact.md  | 62 ++++++++++++++
 .../done-ritual-fold/done-ritual-fold-context.md   | 27 ++++++
 .../done-ritual-fold/done-ritual-fold-handoff.md   |  3 +
 .../done-ritual-fold/done-ritual-fold-meta.json    | 30 +++++++
 .../done-ritual-fold/done-ritual-fold-plan.md      | 20 +++++
 .../done-ritual-fold/done-ritual-fold-spec.md      | 44 ++++++++++
 src/commands/task.mjs                              | 37 ++++++++-
 tests/done-guard.test.mjs                          | 95 +++++++++++++++++++++-
 9 files changed, 326 insertions(+), 3 deletions(-)

# path-edge-fixes — Handoff

(세션 종료 시 post-commit hook이 자동 갱신합니다)

## 2026-09-25T12:52:43.170Z — ea1711a fix(task): task 이름 `.`·`..` 거부 + done-on-main 원격 meta 를 전체 ref 로 읽는다
CHANGELOG.md                                       |  4 ++
 .../path-edge-fixes/path-edge-fixes-artifact.md    | 13 ++++++
 .../path-edge-fixes/path-edge-fixes-context.md     | 27 +++++++++++
 .../path-edge-fixes/path-edge-fixes-handoff.md     |  3 ++
 .../path-edge-fixes/path-edge-fixes-meta.json      | 11 +++++
 docs/hslee/path-edge-fixes/path-edge-fixes-plan.md | 20 ++++++++
 docs/hslee/path-edge-fixes/path-edge-fixes-spec.md | 53 ++++++++++++++++++++++
 src/commands/remote-task.mjs                       |  3 +-
 src/commands/task.mjs                              | 11 +++--
 tests/remote-task.test.mjs                         | 12 +++++
 tests/task-user-validation.test.mjs                | 13 ++++++
 11 files changed, 165 insertions(+), 5 deletions(-)

## 2026-09-25T12:54:39.665Z — 5350bcc chore(path-edge-fixes): 리뷰 판별 반영 — `.`·`..` 거부 안내 문구, artifact 결과·post-commit handoff
docs/hslee/hslee-handoff.md                        |  9 +++---
 .../path-edge-fixes/path-edge-fixes-artifact.md    | 34 +++++++++++++++++++++-
 .../path-edge-fixes/path-edge-fixes-handoff.md     | 14 +++++++++
 .../path-edge-fixes/path-edge-fixes-meta.json      | 12 +++++++-
 docs/hslee/path-edge-fixes/path-edge-fixes-plan.md |  2 +-
 src/commands/task.mjs                              |  4 +--
 6 files changed, 65 insertions(+), 10 deletions(-)

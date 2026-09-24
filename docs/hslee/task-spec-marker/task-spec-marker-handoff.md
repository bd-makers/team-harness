# task-spec-marker — Handoff

(세션 종료 시 post-commit hook이 자동 갱신합니다)

## 2026-09-24T14:21:34.553Z — 387b47f fix(task): spec 마커 없는 디렉터리를 기존 task 로 활성화하지 않는다 (R1)
CHANGELOG.md                                       | 10 +++
 docs/harness-overview.html                         |  5 ++
 .../task-spec-marker/task-spec-marker-artifact.md  | 45 +++++++++++
 .../task-spec-marker/task-spec-marker-context.md   | 22 ++++++
 .../task-spec-marker/task-spec-marker-handoff.md   |  3 +
 .../task-spec-marker/task-spec-marker-meta.json    | 21 +++++
 .../task-spec-marker/task-spec-marker-plan.md      | 21 +++++
 .../task-spec-marker/task-spec-marker-spec.md      | 56 +++++++++++++
 src/commands/task.mjs                              | 27 ++++++-
 tests/task-spec-marker.test.mjs                    | 91 ++++++++++++++++++++++
 10 files changed, 299 insertions(+), 2 deletions(-)

## 2026-09-24T14:21:56.444Z — 2fde6a5 chore(task-spec-marker): PR 단계 체크 + post-commit 훅이 갱신한 handoff 반영
docs/hslee/hslee-handoff.md                             |  9 ++++-----
 docs/hslee/task-spec-marker/task-spec-marker-context.md |  2 +-
 docs/hslee/task-spec-marker/task-spec-marker-handoff.md | 13 +++++++++++++
 docs/hslee/task-spec-marker/task-spec-marker-plan.md    |  2 +-
 4 files changed, 19 insertions(+), 7 deletions(-)

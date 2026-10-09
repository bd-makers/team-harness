# task-folder-removal — Handoff

(세션 종료 시 post-commit hook이 자동 갱신합니다)

## 2026-10-09T01:51:42.474Z — 23f4ddf docs(task): task-folder-removal spec 초안 — C2 인터뷰 질문 대기
.../task-folder-removal-artifact.md                |  13 ++
 .../task-folder-removal-context.md                 |  23 +++
 .../task-folder-removal-handoff.md                 |   3 +
 .../task-folder-removal-meta.json                  |  11 ++
 .../task-folder-removal-plan.md                    |  15 ++
 .../task-folder-removal-spec.md                    | 167 +++++++++++++++++++++
 6 files changed, 232 insertions(+)

## 2026-10-09T01:53:30.276Z — e6f0968 docs(task): task-folder-removal spec — task 수 정정(150), Q6×Q5 reopen 상호작용 추가
.../task-folder-removal/task-folder-removal-handoff.md     |  9 +++++++++
 docs/chad/task-folder-removal/task-folder-removal-spec.md  | 14 ++++++++------
 2 files changed, 17 insertions(+), 6 deletions(-)

## 2026-10-09T02:12:17.256Z — 5109c6c docs(task): task-folder-removal — 사람 답 반영, C2a로 범위 축소·게이트 통과·plan 작성
.../task-folder-removal-context.md                 |  13 +-
 .../task-folder-removal-handoff.md                 |   5 +
 .../task-folder-removal-plan.md                    |  38 ++-
 .../task-folder-removal-spec.md                    | 297 +++++++++++++--------
 docs/harness-cycle.md                              |   4 +-
 5 files changed, 230 insertions(+), 127 deletions(-)

## 2026-10-09T02:21:49.360Z — e207b88 docs(diagram): task-folder-removal C2a 입력 이전 다이어그램 + C2b closedAt 한계 기록
.../task-folder-removal-artifact.md                |   1 +
 .../task-folder-removal-diagram.html               | 128 +++++++++++++++++++++
 .../task-folder-removal-handoff.md                 |   8 ++
 .../task-folder-removal-plan.md                    |   2 +-
 .../task-folder-removal-spec.md                    |   2 +
 5 files changed, 140 insertions(+), 1 deletion(-)

## 2026-10-09T02:23:28.568Z — a4425f5 feat(summary): 원장 done 행을 입력으로 승격 — 폴더 없는 task 행 보존
.../task-folder-removal-handoff.md                 |  8 +++
 .../task-folder-removal-plan.md                    |  4 +-
 src/commands/summary.mjs                           | 50 +++++++++++----
 tests/migrate.test.mjs                             | 23 +++++++
 tests/summary.test.mjs                             | 71 +++++++++++++++++++++-
 5 files changed, 140 insertions(+), 16 deletions(-)

## 2026-10-09T02:25:22.978Z — a47a3c8 feat(remote-task): done-on-main·list --remote가 default ref 원장으로 폴백
.../task-folder-removal-handoff.md                 |  8 +++
 .../task-folder-removal-plan.md                    |  4 +-
 src/commands/remote-task.mjs                       | 50 +++++++++++++++---
 tests/list-remote.test.mjs                         | 24 +++++++++
 tests/remote-task.test.mjs                         | 59 ++++++++++++++++++++++
 5 files changed, 135 insertions(+), 10 deletions(-)

## 2026-10-09T02:26:22.754Z — a2cf411 feat(task): 폴더가 지워진 done task의 이름 재사용을 거부
.../task-folder-removal-handoff.md                 |  8 +++
 .../task-folder-removal-plan.md                    |  2 +-
 docs/harness-overview.html                         |  5 ++
 src/commands/task.mjs                              | 20 ++++++-
 tests/task-name-reuse.test.mjs                     | 68 ++++++++++++++++++++++
 5 files changed, 100 insertions(+), 3 deletions(-)

## 2026-10-09T02:26:55.243Z — 1844fbe docs: 원장 폴백·종결 이름 재사용 거부 문서화 (C2a)
CHANGELOG.md                                                 | 8 ++++++++
 commands/harness-task.md                                     | 5 +++++
 docs/chad/task-folder-removal/task-folder-removal-handoff.md | 8 ++++++++
 docs/chad/task-folder-removal/task-folder-removal-plan.md    | 2 +-
 templates/docs/README.md                                     | 2 ++
 5 files changed, 24 insertions(+), 1 deletion(-)

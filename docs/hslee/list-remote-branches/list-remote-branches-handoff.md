# list-remote-branches — Handoff

(세션 종료 시 post-commit hook이 자동 갱신합니다)

## 2026-09-25T12:32:03.363Z — abd34a3 feat(list): --remote 로 원격 브랜치에만 있는 task 를 보여 준다
CHANGELOG.md                                       |   8 +
 README.md                                          |   3 +
 commands/harness-task.md                           |  15 +-
 docs/harness-overview.html                         |   5 +
 .../list-remote-branches-artifact.md               |  13 ++
 .../list-remote-branches-context.md                |  27 +++
 .../list-remote-branches-handoff.md                |   3 +
 .../list-remote-branches-meta.json                 |  11 ++
 .../list-remote-branches-plan.md                   |  21 +++
 .../list-remote-branches-spec.md                   |  79 +++++++++
 src/cli-args.mjs                                   |   4 +-
 src/commands/remote-task.mjs                       |  63 ++++++-
 src/commands/task.mjs                              |  25 ++-
 tests/list-remote.test.mjs                         | 195 +++++++++++++++++++++
 14 files changed, 464 insertions(+), 8 deletions(-)

## 2026-09-25T12:34:31.579Z — 9068073 fix(list): --remote 의 default ref 를 refs/remotes/ 전체 ref 로 푼다
.../list-remote-branches-artifact.md               | 27 ++++++++++++++++++++++
 .../list-remote-branches-plan.md                   |  4 ++--
 src/commands/remote-task.mjs                       |  8 ++++---
 tests/list-remote.test.mjs                         | 15 +++++++++++-
 4 files changed, 48 insertions(+), 6 deletions(-)

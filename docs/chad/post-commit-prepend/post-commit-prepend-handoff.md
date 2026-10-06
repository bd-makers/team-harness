# post-commit-prepend — Handoff

(세션 종료 시 post-commit hook이 자동 갱신합니다)

## 2026-10-06T02:13:00.907Z — 443d14c fix(hooks): post-commit도 기존 훅 맨 위에 넣고 비-셸 훅은 건너뛴다
CHANGELOG.md                                       |  11 +++
 .../post-commit-prepend-artifact.md                |  42 +++++++++
 .../post-commit-prepend-context.md                 |  24 +++++
 .../post-commit-prepend-handoff.md                 |   3 +
 .../post-commit-prepend-meta.json                  |  21 +++++
 .../post-commit-prepend-plan.md                    |  21 +++++
 .../post-commit-prepend-spec.md                    | 101 +++++++++++++++++++++
 docs/followups.md                                  |  10 +-
 src/git-hooks.mjs                                  |  40 ++++----
 tests/git-hooks.test.mjs                           |  95 ++++++++++++++++++-
 10 files changed, 340 insertions(+), 28 deletions(-)

## 2026-10-06T02:13:06.944Z — cffe6c0 docs(task): post-commit-prepend handoff 반영·plan 7 체크
.../chad/post-commit-prepend/post-commit-prepend-context.md |  4 ++--
 .../chad/post-commit-prepend/post-commit-prepend-handoff.md | 13 +++++++++++++
 docs/chad/post-commit-prepend/post-commit-prepend-plan.md   |  2 +-
 3 files changed, 16 insertions(+), 3 deletions(-)

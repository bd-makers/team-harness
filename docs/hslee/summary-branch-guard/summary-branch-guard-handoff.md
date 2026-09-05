# summary-branch-guard — Handoff

(세션 종료 시 post-commit hook이 자동 갱신합니다)

## 2026-09-05T14:44:30.822Z — e59be1d feat(summary): --write 가드를 브랜치 이름 대신 커밋 동일성으로 판정
CHANGELOG.md                                       |  14 +++
 .../summary-branch-guard-plan.md                   |  20 +++--
 src/commands/summary.mjs                           |  38 +++++++-
 tests/summary.test.mjs                             | 100 +++++++++++++++++++++
 4 files changed, 165 insertions(+), 7 deletions(-)

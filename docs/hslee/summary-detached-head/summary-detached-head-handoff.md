# summary-detached-head — Handoff

(세션 종료 시 post-commit hook이 자동 갱신합니다)

## 2026-09-27T15:59:29.743Z — a91b804 fix(summary): origin/main과 같은 커밋의 detached HEAD에서 --write를 허용한다
CHANGELOG.md                                       |  8 ++++
 .../summary-detached-head-artifact.md              | 13 ++++++
 .../summary-detached-head-context.md               | 27 +++++++++++
 .../summary-detached-head-handoff.md               |  3 ++
 .../summary-detached-head-meta.json                | 11 +++++
 .../summary-detached-head-plan.md                  | 19 ++++++++
 .../summary-detached-head-spec.md                  | 40 ++++++++++++++++
 src/commands/summary.mjs                           | 11 +++--
 tests/summary.test.mjs                             | 54 ++++++++++++++++++++++
 9 files changed, 182 insertions(+), 4 deletions(-)

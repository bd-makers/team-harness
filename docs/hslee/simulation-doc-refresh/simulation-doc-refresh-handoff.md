# simulation-doc-refresh — Handoff

(세션 종료 시 post-commit hook이 자동 갱신합니다)

## 2026-09-27T16:03:59.228Z — c210a38 docs(sim): 시뮬레이션 문서 본문을 0.44.4 현행으로 맞추고 docs:check 현행 문서로 등록
CHANGELOG.md                                       |  11 ++
 MAINTAINING.md                                     |   6 +-
 docs/followups.md                                  |  15 +--
 docs/harness-workflow-simulation.html              | 117 ++++++++++++++++-----
 .../simulation-doc-refresh-artifact.md             |  49 +++++++++
 .../simulation-doc-refresh-context.md              |  27 +++++
 .../simulation-doc-refresh-handoff.md              |   3 +
 .../simulation-doc-refresh-meta.json               |  11 ++
 .../simulation-doc-refresh-plan.md                 |  20 ++++
 .../simulation-doc-refresh-spec.md                 |  41 ++++++++
 scripts/docs-version-drift.mjs                     |   9 +-
 11 files changed, 263 insertions(+), 46 deletions(-)

## 2026-09-27T16:08:19.728Z — ecb1811 docs(sim): codex 리뷰 반영 — summary --write 조건·done 확인 주체·훅 경로 정정
MAINTAINING.md                                     |  2 +-
 docs/harness-workflow-simulation.html              | 10 ++++-----
 .../simulation-doc-refresh-artifact.md             | 25 ++++++++++++++++++++++
 .../simulation-doc-refresh-handoff.md              | 14 ++++++++++++
 .../simulation-doc-refresh-meta.json               | 12 ++++++++++-
 .../simulation-doc-refresh-plan.md                 |  2 +-
 6 files changed, 57 insertions(+), 8 deletions(-)

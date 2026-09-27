# docs-version-drift-check — Handoff

(세션 종료 시 post-commit hook이 자동 갱신합니다)

## 2026-09-27T13:48:56.677Z — 5221318 feat(docs): docs:check가 현행 문서의 버전 표지를 package.json과 대조한다
CHANGELOG.md                                       |  8 ++
 MAINTAINING.md                                     | 13 +--
 docs/ao-worker-rules.md                            |  2 +-
 docs/followups.md                                  | 13 ++-
 docs/harness-overview.html                         | 10 +++
 .../docs-version-drift-check-artifact.md           | 13 +++
 .../docs-version-drift-check-context.md            | 27 ++++++
 .../docs-version-drift-check-handoff.md            |  3 +
 .../docs-version-drift-check-meta.json             | 11 +++
 .../docs-version-drift-check-plan.md               | 20 +++++
 .../docs-version-drift-check-spec.md               | 42 ++++++++++
 scripts/docs-version-drift.mjs                     | 98 ++++++++++++++++++++++
 scripts/generate-harness-overview.mjs              | 10 +++
 tests/docs-version-drift.test.mjs                  | 87 +++++++++++++++++++
 14 files changed, 349 insertions(+), 8 deletions(-)

# handoff-marker-typing — Handoff

(세션 종료 시 post-commit hook이 자동 갱신합니다)

## 2026-09-06T11:38:41.891Z — a539e99 feat(handoff): 완료 마커를 단일 선언으로 타입화
.../handoff-marker-typing-artifact.md              |  14 +++
 .../handoff-marker-typing-context.md               |  27 ++++++
 .../handoff-marker-typing-handoff.md               |   3 +
 .../handoff-marker-typing-meta.json                |   8 ++
 .../handoff-marker-typing-plan.md                  |  35 +++++++
 .../handoff-marker-typing-spec.md                  | 105 +++++++++++++++++++++
 src/commands/summary.mjs                           |   3 +-
 src/commands/task.mjs                              |   3 +-
 src/handoff-marker.mjs                             |  31 ++++++
 tests/handoff-marker.test.mjs                      |  65 +++++++++++++
 10 files changed, 292 insertions(+), 2 deletions(-)

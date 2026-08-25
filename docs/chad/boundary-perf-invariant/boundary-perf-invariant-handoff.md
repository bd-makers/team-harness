# boundary-perf-invariant — Handoff

(세션 종료 시 post-commit hook이 자동 갱신합니다)

## 2026-08-25T05:15:14.763Z — 9414faf fix(perf): boundary 예산을 동일 작업량 baseline 대비 비율로 교체
.../boundary-perf-invariant-artifact.md            | 193 +++++++++++++++++++++
 .../boundary-perf-invariant-context.md             |  29 ++++
 .../boundary-perf-invariant-handoff.md             |   3 +
 .../boundary-perf-invariant-meta.json              |   7 +
 .../boundary-perf-invariant-plan.md                |  29 ++++
 .../boundary-perf-invariant-spec.md                | 103 +++++++++++
 tests/perf/boundary-checkpoint.test.mjs            | 140 +++++++++++----
 7 files changed, 472 insertions(+), 32 deletions(-)

# preset-repo-shape — Handoff

(세션 종료 시 post-commit hook이 자동 갱신합니다)

## 2026-10-05T15:28:40.035Z — 07c583d docs(task): preset-repo-shape spec·plan·다이어그램
.../preset-repo-shape-artifact.md                  |  14 ++
 .../preset-repo-shape/preset-repo-shape-context.md |  23 ++
 .../preset-repo-shape-diagram.html                 | 242 +++++++++++++++++++++
 .../preset-repo-shape/preset-repo-shape-handoff.md |   3 +
 .../preset-repo-shape/preset-repo-shape-meta.json  |  11 +
 .../preset-repo-shape/preset-repo-shape-plan.md    |  37 ++++
 .../preset-repo-shape/preset-repo-shape-spec.md    | 170 +++++++++++++++
 7 files changed, 500 insertions(+)

## 2026-10-05T15:30:22.282Z — 42ea3c6 feat(shape): 저장소 모양 판별 — workspace 원천·앱 조건은 프리셋 데이터
docs/harness-overview.html                         | 10 +++
 .../preset-repo-shape-artifact.md                  |  9 +++
 .../preset-repo-shape/preset-repo-shape-handoff.md | 10 +++
 .../preset-repo-shape/preset-repo-shape-plan.md    |  2 +-
 src/presets.mjs                                    |  6 +-
 src/repo-shape.mjs                                 | 91 ++++++++++++++++++++++
 templates/presets/node.json                        |  6 ++
 tests/repo-shape.test.mjs                          | 85 ++++++++++++++++++++
 8 files changed, 216 insertions(+), 3 deletions(-)

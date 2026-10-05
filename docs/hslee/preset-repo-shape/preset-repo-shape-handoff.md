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

## 2026-10-05T15:32:36.062Z — cf6a3bb feat(presets): workspace 모양 제안 — turbo·nx 위임 또는 workspace별 목록
.../preset-repo-shape-artifact.md                  |   4 +
 .../preset-repo-shape/preset-repo-shape-handoff.md |  11 ++
 .../preset-repo-shape/preset-repo-shape-plan.md    |   2 +-
 src/presets.mjs                                    | 123 +++++++++++++++++----
 templates/presets/node.json                        |  14 +++
 tests/presets.test.mjs                             |  81 +++++++++++++-
 6 files changed, 213 insertions(+), 22 deletions(-)

## 2026-10-05T15:33:41.268Z — 35e931e feat(gate): commit 객체 형식 — HEAD 대비 바뀐 파일로 workspace 목록을 고른다
.../preset-repo-shape-artifact.md                  |  2 +
 .../preset-repo-shape/preset-repo-shape-handoff.md |  9 +++
 .../preset-repo-shape/preset-repo-shape-plan.md    |  2 +-
 src/commands/gate.mjs                              | 57 +++++++++++++-
 tests/gate-command.test.mjs                        | 87 ++++++++++++++++++++++
 5 files changed, 152 insertions(+), 5 deletions(-)

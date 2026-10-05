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

## 2026-10-05T15:34:55.992Z — d3d6dd6 feat(shape): 모양 확인 흐름 — init·gate suggest·migrate가 같은 resolveShape를 쓴다
.../preset-repo-shape-artifact.md                  |  2 +
 .../preset-repo-shape/preset-repo-shape-handoff.md |  8 ++++
 .../preset-repo-shape/preset-repo-shape-plan.md    |  2 +-
 src/commands/gate.mjs                              |  5 ++-
 src/commands/init.mjs                              |  6 ++-
 src/commands/migrate.mjs                           |  4 +-
 src/repo-shape.mjs                                 | 25 +++++++++++
 tests/gate-command.test.mjs                        | 20 +++++++++
 tests/init-gates.test.mjs                          | 27 ++++++++++++
 tests/repo-shape.test.mjs                          | 51 ++++++++++++++++++++++
 10 files changed, 146 insertions(+), 4 deletions(-)

## 2026-10-05T15:35:31.957Z — 45835eb feat(doctor): 게이트 지문 drift를 확정 모양 기준으로 비교
.../preset-repo-shape/preset-repo-shape-handoff.md | 13 ++++++
 .../preset-repo-shape/preset-repo-shape-plan.md    |  2 +-
 src/commands/doctor.mjs                            | 12 ++++-
 tests/doctor.test.mjs                              | 53 ++++++++++++++++++++++
 4 files changed, 78 insertions(+), 2 deletions(-)

## 2026-10-05T15:37:51.759Z — 8e29054 feat(rules): RN rules를 rules 프리셋으로 — 앱 workspace 경로로 스코프
docs/harness-overview.html                         |  5 ++
 .../preset-repo-shape-artifact.md                  |  3 +
 .../preset-repo-shape/preset-repo-shape-handoff.md |  7 ++
 .../preset-repo-shape/preset-repo-shape-plan.md    |  2 +-
 src/commands/init.mjs                              | 13 ++-
 src/harness.mjs                                    | 50 +++++++-----
 src/presets.mjs                                    | 30 +++++++
 src/repo-shape.mjs                                 |  3 +-
 src/settings-permissions.mjs                       |  4 +-
 templates/presets/rules/react-native.json          |  6 ++
 tests/init-gates.test.mjs                          | 16 ++++
 tests/migrate-templates.test.mjs                   |  2 +-
 tests/settings-permissions.test.mjs                |  6 +-
 tests/stack-conditional-rules.test.mjs             | 94 ++++++++++++++++++++--
 14 files changed, 202 insertions(+), 39 deletions(-)

## 2026-10-05T15:40:00.437Z — 0d05895 feat(init): --shape single·stack 모양 미리보기 + 문서
CHANGELOG.md                                       | 15 ++++++
 README.md                                          |  9 ++--
 commands/harness-init.md                           | 19 +++++++-
 .../preset-repo-shape-artifact.md                  |  2 +
 .../preset-repo-shape/preset-repo-shape-handoff.md | 17 +++++++
 .../preset-repo-shape/preset-repo-shape-plan.md    |  3 +-
 .../preset-repo-shape/preset-repo-shape-spec.md    |  3 +-
 docs/prerequisites.md                              |  6 +--
 src/cli-args.mjs                                   |  5 +-
 src/commands/init.mjs                              |  7 +++
 src/commands/stack.mjs                             |  6 ++-
 src/repo-shape.mjs                                 |  8 ++-
 tests/init-gates.test.mjs                          | 57 ++++++++++++++++++++++
 13 files changed, 143 insertions(+), 14 deletions(-)

## 2026-10-05T15:41:26.099Z — 97d1d7c docs(task): preset-repo-shape 검증 기록 — 스위트·픽스처 실측·소비자 읽기 전용 감지
.../preset-repo-shape/preset-repo-shape-artifact.md      | 10 ++++++++++
 .../hslee/preset-repo-shape/preset-repo-shape-handoff.md | 16 ++++++++++++++++
 docs/hslee/preset-repo-shape/preset-repo-shape-plan.md   |  2 +-
 3 files changed, 27 insertions(+), 1 deletion(-)

## 2026-10-05T15:50:24.000Z — 8fc5f03 fix(shape): 리뷰 반영 — rename 양쪽 집계·turbo --yes 루트 목록 유지·앱 조건 축소
CHANGELOG.md                                       |  8 +++-
 .../preset-repo-shape-artifact.md                  | 56 ++++++++++++++++++----
 .../preset-repo-shape/preset-repo-shape-meta.json  | 12 ++++-
 .../preset-repo-shape/preset-repo-shape-plan.md    |  3 +-
 .../preset-repo-shape/preset-repo-shape-spec.md    |  5 +-
 src/commands/gate.mjs                              |  3 +-
 src/commands/init.mjs                              |  4 +-
 src/presets.mjs                                    |  9 +++-
 src/repo-shape.mjs                                 | 29 ++++++-----
 templates/presets/node.json                        |  4 +-
 tests/doctor.test.mjs                              |  4 +-
 tests/gate-command.test.mjs                        | 14 +++++-
 tests/init-gates.test.mjs                          | 16 ++++++-
 tests/presets.test.mjs                             | 12 +++--
 tests/repo-shape.test.mjs                          | 45 +++++++++++++++--
 15 files changed, 179 insertions(+), 45 deletions(-)

## 2026-10-05T15:50:36.946Z — a0471f7 docs(task): preset-repo-shape 작업 카드 — push·PR 대기
.../preset-repo-shape/preset-repo-shape-context.md     |  6 +++---
 .../preset-repo-shape/preset-repo-shape-handoff.md     | 18 ++++++++++++++++++
 2 files changed, 21 insertions(+), 3 deletions(-)

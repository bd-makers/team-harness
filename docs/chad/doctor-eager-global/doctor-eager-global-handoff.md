# doctor-eager-global — Handoff

(세션 종료 시 post-commit hook이 자동 갱신합니다)

## 2026-08-31T09:21:07.708Z — c936f94 fix(doctor): eager 계층 측정에 전역·.claude/CLAUDE.md 합산
CHANGELOG.md                                       |  22 +++
 MAINTAINING.md                                     |   2 +-
 .../doctor-eager-global-artifact.md                |  14 ++
 .../doctor-eager-global-context.md                 |  27 ++++
 .../doctor-eager-global-handoff.md                 |   3 +
 .../doctor-eager-global-meta.json                  |   8 +
 .../doctor-eager-global-plan.md                    |  40 +++++
 .../doctor-eager-global-spec.md                    | 176 +++++++++++++++++++++
 src/commands/doctor.mjs                            |  87 ++++++++--
 tests/doctor.test.mjs                              | 166 ++++++++++++++++---
 10 files changed, 508 insertions(+), 37 deletions(-)

## 2026-08-31T09:21:31.847Z — 002f213 chore(handoff): post-commit hook 자동 갱신
docs/chad/chad-handoff.md                                   |  9 ++++-----
 .../chad/doctor-eager-global/doctor-eager-global-handoff.md | 13 +++++++++++++
 2 files changed, 17 insertions(+), 5 deletions(-)

## 2026-08-31T09:36:48.417Z — efae5d3 fix(doctor): 리뷰 발견 반영 — 테스트 격리 확장·처방 순서·누수 정리
CHANGELOG.md                                       |  6 +++
 docs/chad/chad-handoff.md                          |  2 +-
 .../doctor-eager-global-artifact.md                | 48 ++++++++++++++++++++++
 .../doctor-eager-global-handoff.md                 |  5 +++
 src/commands/doctor.mjs                            | 17 ++++----
 tests/doctor.test.mjs                              | 42 ++++++++++++++++---
 tests/e2e/sandbox.mjs                              |  4 ++
 tests/sim/agentloop.mjs                            |  5 ++-
 tests/sim/codex-agentloop.mjs                      |  5 ++-
 9 files changed, 119 insertions(+), 15 deletions(-)

## 2026-08-31T09:36:54.816Z — ec6df60 chore(handoff): post-commit hook 자동 갱신
docs/chad/chad-handoff.md                                    |  2 +-
 docs/chad/doctor-eager-global/doctor-eager-global-handoff.md | 12 ++++++++++++
 2 files changed, 13 insertions(+), 1 deletion(-)

## 2026-08-31T09:44:25.404Z — 6da0ea9 docs(diagram): PR 67 변경 슬라이드 추가
docs/chad/chad-handoff.md                          |   2 +-
 .../doctor-eager-global-handoff.md                 |   5 +
 docs/diagrams/pr/pr-67-doctor-eager-global.html    | 395 +++++++++++++++++++++
 3 files changed, 401 insertions(+), 1 deletion(-)

## 2026-08-31T09:44:32.282Z — 7e2367b chore(handoff): post-commit hook 자동 갱신
docs/chad/chad-handoff.md                                    |  2 +-
 docs/chad/doctor-eager-global/doctor-eager-global-handoff.md | 11 +++++++++++
 2 files changed, 12 insertions(+), 1 deletion(-)

## 2026-09-01T01:19:34.823Z — 완료

태스크 종료.

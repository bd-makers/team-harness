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

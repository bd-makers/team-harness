# managed-section-refresh-path — Handoff

(세션 종료 시 post-commit hook이 자동 갱신합니다)

## 2026-09-25T17:13:38.126Z — e03660d feat(doctor): 템플릿보다 낡은 관리 절을 경고하고 init 을 처방한다
CHANGELOG.md                                       |  8 +++
 commands/harness-init.md                           |  3 +-
 commands/harness-migrate.md                        |  6 +-
 docs/harness-overview.html                         |  4 +-
 .../managed-section-refresh-path-artifact.md       | 65 ++++++++++++++++++++++
 .../managed-section-refresh-path-context.md        | 27 +++++++++
 .../managed-section-refresh-path-handoff.md        |  3 +
 .../managed-section-refresh-path-meta.json         | 30 ++++++++++
 .../managed-section-refresh-path-plan.md           | 21 +++++++
 .../managed-section-refresh-path-spec.md           | 64 +++++++++++++++++++++
 src/commands/doctor.mjs                            | 51 +++++++++++++++--
 tests/doctor.test.mjs                              | 61 +++++++++++++++++++-
 12 files changed, 332 insertions(+), 11 deletions(-)

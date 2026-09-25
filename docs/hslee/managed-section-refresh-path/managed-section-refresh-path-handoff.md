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

## 2026-09-25T17:21:45.624Z — e2717b4 docs(managed-section-refresh-path): plan 커밋·PR 단계 체크 (#106 머지)
.../managed-section-refresh-path/managed-section-refresh-path-plan.md   | 2 +-
 1 file changed, 1 insertion(+), 1 deletion(-)

## 2026-09-25T17:21:45.726Z — 완료

태스크 종료.

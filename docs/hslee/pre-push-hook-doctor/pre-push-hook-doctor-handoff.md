# pre-push-hook-doctor — Handoff

(세션 종료 시 post-commit hook이 자동 갱신합니다)

## 2026-10-05T23:37:48.916Z — 5b590aa feat(doctor): pre-push 훅에 pr-check 블록이 없으면 알린다 (followups 11)
README.md                                          |  16 ++++
 docs/followups.md                                  |  13 +--
 .../pre-push-hook-doctor-artifact.md               |  58 ++++++++++++
 .../pre-push-hook-doctor-context.md                |  24 +++++
 .../pre-push-hook-doctor-handoff.md                |   3 +
 .../pre-push-hook-doctor-meta.json                 |  30 +++++++
 .../pre-push-hook-doctor-plan.md                   |  25 ++++++
 .../pre-push-hook-doctor-spec.md                   | 100 +++++++++++++++++++++
 src/commands/doctor.mjs                            |  12 +++
 src/git-hooks.mjs                                  |  49 ++++++++--
 tests/doctor.test.mjs                              |  13 +++
 tests/git-hooks.test.mjs                           |  95 +++++++++++++++++++-
 12 files changed, 422 insertions(+), 16 deletions(-)

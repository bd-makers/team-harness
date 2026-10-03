# harness-version-stamp — Handoff

(세션 종료 시 post-commit hook이 자동 갱신합니다)

## 2026-10-03T04:46:20.649Z — c9b7cc6 feat(doctor): 프로젝트에 적용된 하네스 버전을 기록하고 doctor에서 보여 준다
CHANGELOG.md                                       |  7 ++
 README.md                                          |  3 +-
 .../harness-version-stamp-artifact.md              | 14 ++++
 .../harness-version-stamp-context.md               | 27 ++++++++
 .../harness-version-stamp-handoff.md               |  3 +
 .../harness-version-stamp-meta.json                | 11 ++++
 .../harness-version-stamp-plan.md                  | 24 +++++++
 .../harness-version-stamp-spec.md                  | 74 ++++++++++++++++++++++
 src/commands/doctor.mjs                            | 62 ++++++++++++++++--
 src/harness.mjs                                    | 11 +++-
 src/render-state.mjs                               | 18 +++++-
 tests/doctor.test.mjs                              | 57 ++++++++++++++++-
 tests/render-state.test.mjs                        | 19 +++++-
 13 files changed, 317 insertions(+), 13 deletions(-)

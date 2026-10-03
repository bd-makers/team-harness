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

## 2026-10-03T04:58:30.448Z — 72dab4b fix(render-state): prerelease와 build metadata를 함께 쓴 semver도 harnessVersion으로 인정한다
.../harness-version-stamp-artifact.md              | 17 ++++++++++++++
 .../harness-version-stamp-context.md               | 26 +++++++++-------------
 .../harness-version-stamp-handoff.md               | 16 +++++++++++++
 .../harness-version-stamp-plan.md                  |  2 +-
 src/render-state.mjs                               |  2 +-
 tests/render-state.test.mjs                        |  2 ++
 6 files changed, 48 insertions(+), 17 deletions(-)

## 2026-10-03T04:58:59.467Z — 26595f5 chore(task): harness-version-stamp ship — plan·artifact·handoff 갱신 (PR #118)
.../harness-version-stamp/harness-version-stamp-artifact.md      | 1 +
 .../hslee/harness-version-stamp/harness-version-stamp-context.md | 2 +-
 .../hslee/harness-version-stamp/harness-version-stamp-handoff.md | 9 +++++++++
 docs/hslee/harness-version-stamp/harness-version-stamp-plan.md   | 2 +-
 4 files changed, 12 insertions(+), 2 deletions(-)

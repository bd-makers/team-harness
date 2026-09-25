# active-json-validation — Handoff

(세션 종료 시 post-commit hook이 자동 갱신합니다)

## 2026-09-25T12:31:30.454Z — e96243f fix(task): 손으로 고친 active.json 이 docs/ 밖을 가리키면 활성 task 없음으로 본다
CHANGELOG.md                                       |  6 +++
 README.md                                          |  1 +
 docs/harness-overview.html                         |  5 ++
 .../active-json-validation-artifact.md             | 13 ++++++
 .../active-json-validation-context.md              | 27 +++++++++++
 .../active-json-validation-handoff.md              |  3 ++
 .../active-json-validation-meta.json               | 11 +++++
 .../active-json-validation-plan.md                 | 23 +++++++++
 .../active-json-validation-spec.md                 | 52 +++++++++++++++++++++
 src/commands/doctor.mjs                            |  9 ++--
 src/commands/task.mjs                              | 16 ++++++-
 tests/active-json-validation.test.mjs              | 54 ++++++++++++++++++++++
 12 files changed, 213 insertions(+), 7 deletions(-)

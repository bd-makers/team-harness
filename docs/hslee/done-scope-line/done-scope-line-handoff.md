# done-scope-line — Handoff

(세션 종료 시 post-commit hook이 자동 갱신합니다)

## 2026-11-02T14:25:38.578Z — 473354f feat(done,gate): 통과 출력에 보장 범위 한 줄 표시
CHANGELOG.md                                       |  3 ++
 README.md                                          |  5 ++
 .../done-scope-line/done-scope-line-artifact.md    | 19 ++++++++
 .../done-scope-line/done-scope-line-context.md     | 27 +++++++++++
 .../done-scope-line/done-scope-line-handoff.md     |  3 ++
 .../done-scope-line/done-scope-line-meta.json      | 11 +++++
 docs/hslee/done-scope-line/done-scope-line-plan.md | 18 ++++++++
 docs/hslee/done-scope-line/done-scope-line-spec.md | 54 ++++++++++++++++++++++
 src/commands/gate.mjs                              |  4 ++
 src/commands/task.mjs                              | 25 +++++++++-
 tests/done-guard.test.mjs                          | 42 ++++++++++++++++-
 tests/fixtures/task-paths-golden/expected.txt      |  1 +
 tests/gate-command.test.mjs                        | 23 +++++++++
 13 files changed, 232 insertions(+), 3 deletions(-)

## 2026-11-02T15:09:21.344Z — 완료

태스크 종료.

# pr-check — Handoff

(세션 종료 시 post-commit hook이 자동 갱신합니다)

## 2026-10-05T16:28:53.220Z — 6f1880c feat(pr-check): PR 필수 task 문서 검사 · git pre-push 훅 · ship 연동 (cycle §6-4)
README.md                                |  22 ++-
 bin/harness-team.mjs                     |   2 +
 commands/harness-ship.md                 |  15 +-
 docs/decisions.md                        |   8 +-
 docs/harness-cycle.md                    |  19 +-
 docs/harness-overview.html               |  10 +
 docs/hslee/pr-check/pr-check-artifact.md |  77 ++++++++
 docs/hslee/pr-check/pr-check-context.md  |  25 +++
 docs/hslee/pr-check/pr-check-handoff.md  |   3 +
 docs/hslee/pr-check/pr-check-meta.json   |  21 ++
 docs/hslee/pr-check/pr-check-plan.md     |  27 +++
 docs/hslee/pr-check/pr-check-spec.md     | 146 ++++++++++++++
 skills/harness-ship/SKILL.md             |   5 +-
 src/cli-args.mjs                         |   7 +-
 src/commands/diagram.mjs                 |   5 +-
 src/commands/doctor.mjs                  |   4 +-
 src/commands/init.mjs                    |   3 +-
 src/commands/pr-check.mjs                | 222 ++++++++++++++++++++++
 src/commands/sync.mjs                    |   3 +-
 src/commands/task.mjs                    |   2 +-
 src/git-hooks.mjs                        |  60 +++++-
 tests/cli-args.test.mjs                  |   2 +-
 tests/doctor.test.mjs                    |   7 +-
 tests/git-hooks.test.mjs                 |  55 +++++-
 tests/pr-check.test.mjs                  | 317 +++++++++++++++++++++++++++++++
 tests/ship-command.test.mjs              |  11 ++
 26 files changed, 1041 insertions(+), 37 deletions(-)

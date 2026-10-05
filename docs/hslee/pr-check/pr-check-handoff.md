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

## 2026-10-05T16:29:29.247Z — e852bde docs(task): pr-check plan 9 체크 — PR #125
docs/hslee/pr-check/pr-check-context.md | 2 +-
 docs/hslee/pr-check/pr-check-plan.md    | 2 +-
 2 files changed, 2 insertions(+), 2 deletions(-)

## 2026-10-05T16:29:39.780Z — c06e8f2 docs(task): pr-check 작업 카드 — 최종 훅 설계 반영
docs/hslee/pr-check/pr-check-context.md | 4 ++--
 1 file changed, 2 insertions(+), 2 deletions(-)

## 2026-10-05T16:35:42.222Z — 4c15c36 docs(task): pr-check 다이어그램 추가 · 남은 리스크를 followups 11–16으로 정리
docs/followups.md                         |  38 +++-
 docs/hslee/pr-check/pr-check-artifact.md  |   2 +
 docs/hslee/pr-check/pr-check-diagram.html | 301 ++++++++++++++++++++++++++++++
 docs/hslee/pr-check/pr-check-handoff.md   |   4 +
 docs/hslee/pr-check/pr-check-plan.md      |   1 +
 5 files changed, 345 insertions(+), 1 deletion(-)

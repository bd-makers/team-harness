# preset-gates — Handoff

(세션 종료 시 post-commit hook이 자동 갱신합니다)

## 2026-10-05T12:19:29.516Z — e82118d docs(task): preset-gates spec·plan·다이어그램
docs/hslee/preset-gates/preset-gates-artifact.md  |  14 +
 docs/hslee/preset-gates/preset-gates-context.md   |  27 ++
 docs/hslee/preset-gates/preset-gates-diagram.html | 245 ++++++++++++
 docs/hslee/preset-gates/preset-gates-handoff.md   |   3 +
 docs/hslee/preset-gates/preset-gates-meta.json    |  11 +
 docs/hslee/preset-gates/preset-gates-plan.md      | 444 ++++++++++++++++++++++
 docs/hslee/preset-gates/preset-gates-spec.md      | 132 +++++++
 7 files changed, 876 insertions(+)

## 2026-10-05T12:20:28.010Z — 59ed6d6 feat(presets): 커밋 게이트 프리셋 데이터와 제안 엔진
docs/harness-overview.html                      | 25 +++++++
 docs/hslee/preset-gates/preset-gates-handoff.md | 10 +++
 src/presets.mjs                                 | 90 +++++++++++++++++++++++++
 templates/presets/generic.json                  |  7 ++
 templates/presets/node.json                     | 19 ++++++
 templates/presets/python.json                   | 12 ++++
 tests/presets.test.mjs                          | 84 +++++++++++++++++++++++
 7 files changed, 247 insertions(+)

## 2026-10-05T12:21:37.808Z — 009b6a5 feat(gate): config 선언 커밋 게이트·포맷 실행기
bin/harness-team.mjs                            |   6 +-
 docs/harness-overview.html                      |  10 ++
 docs/hslee/preset-gates/preset-gates-handoff.md |  10 ++
 src/cli-args.mjs                                |   3 +
 src/commands/gate.mjs                           |  68 +++++++++++
 tests/gate-command.test.mjs                     | 147 ++++++++++++++++++++++++
 6 files changed, 242 insertions(+), 2 deletions(-)

## 2026-10-05T12:22:00.968Z — 9f3fc02 feat(gate): gate suggest — 현재 감지로 제안 재적용
docs/hslee/preset-gates/preset-gates-handoff.md |  9 +++++++
 src/commands/gate.mjs                           | 24 ++++++++++++++++-
 tests/gate-command.test.mjs                     | 36 +++++++++++++++++++++++++
 3 files changed, 68 insertions(+), 1 deletion(-)

## 2026-10-05T12:23:41.622Z — 828f6cb refactor(hooks): 커밋·포맷 훅을 gate CLI 래퍼로 — 언어 분기 제거
docs/harness-overview.html                         |  10 ++
 docs/hslee/preset-gates/preset-gates-handoff.md    |   6 +
 src/commands/migrate.mjs                           |   2 +
 templates/.claude/hooks/auto-format.sh             |  18 ++-
 templates/.claude/hooks/pre-commit-check.sh        |  83 ++-----------
 tests/fixtures/stock-hooks/README.md               |   4 +
 .../stock-hooks/pre-preset-gates/auto-format.sh    |  52 ++++++++
 .../pre-preset-gates/pre-commit-check.sh           | 133 +++++++++++++++++++++
 tests/hooks-jq-fallback.test.mjs                   |  85 +++++++++----
 tests/migrate-hooks.test.mjs                       |   2 +-
 10 files changed, 289 insertions(+), 106 deletions(-)

## 2026-10-05T12:24:30.621Z — fbd91b0 feat(init): 스택 프리셋으로 커밋 게이트 제안·확정
docs/harness-overview.html                      |  5 ++
 docs/hslee/preset-gates/preset-gates-handoff.md | 13 +++++
 src/commands/init.mjs                           | 17 +++++-
 tests/init-gates.test.mjs                       | 72 +++++++++++++++++++++++++
 4 files changed, 106 insertions(+), 1 deletion(-)

## 2026-10-05T12:25:18.745Z — aa17c31 feat(migrate): 새 커밋 훅 설치본에 gates 제안
docs/harness-overview.html                      |  5 ++
 docs/hslee/preset-gates/preset-gates-handoff.md |  7 +++
 src/commands/migrate.mjs                        | 27 ++++++++-
 tests/migrate-gates.test.mjs                    | 75 +++++++++++++++++++++++++
 4 files changed, 113 insertions(+), 1 deletion(-)

## 2026-10-05T12:26:05.066Z — 37410d1 feat(doctor): 커밋 게이트 지문 변화 감지
docs/hslee/preset-gates/preset-gates-handoff.md |  7 ++++
 src/commands/doctor.mjs                         | 18 +++++++++
 tests/doctor.test.mjs                           | 52 ++++++++++++++++++++++++-
 3 files changed, 76 insertions(+), 1 deletion(-)

## 2026-10-05T12:26:45.204Z — d31d3bc docs: 커밋·포맷 훅 설명을 프리셋 게이트로 갱신
CHANGELOG.md                                    |  8 ++++++++
 docs/diagrams/harness-overview/hooks.mmd        |  5 ++---
 docs/harness-overview.html                      | 19 +++++++++----------
 docs/harness-overview.template.html             | 14 +++++++-------
 docs/hslee/preset-gates/preset-gates-handoff.md |  6 ++++++
 src/commands/task.mjs                           |  2 +-
 6 files changed, 33 insertions(+), 21 deletions(-)

## 2026-10-05T12:27:53.228Z — b253f34 docs(task): preset-gates 검증·소비자 실측 기록
docs/hslee/preset-gates/preset-gates-artifact.md | 13 +++++++++++++
 docs/hslee/preset-gates/preset-gates-handoff.md  |  9 +++++++++
 2 files changed, 22 insertions(+)

## 2026-10-05T12:54:11.559Z — 114289b docs(task): preset-gates 리뷰 기록·plan 종결
docs/hslee/preset-gates/preset-gates-artifact.md | 22 +++++++++++++++++++---
 docs/hslee/preset-gates/preset-gates-context.md  |  9 +++++----
 docs/hslee/preset-gates/preset-gates-plan.md     | 20 ++++++++++----------
 3 files changed, 34 insertions(+), 17 deletions(-)

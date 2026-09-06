# done-status-expiry — Handoff

(세션 종료 시 post-commit hook이 자동 갱신합니다)

## 2026-09-06T09:59:36.123Z — 5b126ac feat(task): 완료 task 상태 만료 — reopen 전이로 meta.status를 정본화
AGENTS.md                                          | 14 +++-
 CHANGELOG.md                                       | 19 +++++
 README.md                                          |  3 +-
 .../done-status-expiry-artifact.md                 | 14 ++++
 .../done-status-expiry-context.md                  | 27 ++++++
 .../done-status-expiry-handoff.md                  |  3 +
 .../done-status-expiry-meta.json                   |  8 ++
 .../done-status-expiry/done-status-expiry-plan.md  | 34 ++++++++
 .../done-status-expiry/done-status-expiry-spec.md  | 98 ++++++++++++++++++++++
 src/commands/session-context.mjs                   |  9 +-
 src/commands/task.mjs                              | 31 +++++--
 templates/AGENTS.md.hbs                            | 14 +++-
 tests/done-guard.test.mjs                          | 41 ++++++++-
 tests/session-context.test.mjs                     | 47 +++++++++++
 tests/summary.test.mjs                             | 73 ++++++++++++++++
 15 files changed, 421 insertions(+), 14 deletions(-)

## 2026-09-06T10:03:15.539Z — d8b3fef test(task): reopen 전이의 미검증 표면 3곳 보강 + 명령 문서에 reopened 분기 추가
commands/harness-task.md                           |  3 +++
 .../done-status-expiry-handoff.md                  | 18 ++++++++++++++++++
 docs/hslee/hslee-handoff.md                        |  9 ++++-----
 tests/agent-files.test.mjs                         |  7 +++++++
 tests/done-guard.test.mjs                          | 22 ++++++++++++++++++++++
 tests/observation-commands.test.mjs                | 16 +++++++++++++++-
 6 files changed, 69 insertions(+), 6 deletions(-)

## 2026-09-06T10:03:40.050Z — 9f50b11 chore(task): post-commit 훅이 갱신한 handoff 반영
docs/hslee/done-status-expiry/done-status-expiry-handoff.md | 9 +++++++++
 docs/hslee/hslee-handoff.md                                 | 2 +-
 2 files changed, 10 insertions(+), 1 deletion(-)

## 2026-09-06T10:15:47.441Z — ef91475 fix(task): Codex 리뷰 P2 3건 반영 — fail-open 제거·레거시 만료·쓰기 순서
.../done-status-expiry-artifact.md                 |  1 -
 .../done-status-expiry-handoff.md                  |  5 +++
 docs/hslee/hslee-handoff.md                        |  2 +-
 src/commands/task.mjs                              | 44 +++++++++++++++-------
 tests/done-guard.test.mjs                          | 33 +++++++++++++---
 tests/summary.test.mjs                             | 32 ++++++++++++++++
 6 files changed, 96 insertions(+), 21 deletions(-)

## 2026-09-06T10:16:53.846Z — 6339740 docs(task): Codex 리뷰 결과·판별·학습을 artifact에 기록
.../done-status-expiry-artifact.md                 | 60 ++++++++++++++++++++++
 .../done-status-expiry-handoff.md                  |  9 ++++
 .../done-status-expiry/done-status-expiry-plan.md  |  2 +-
 docs/hslee/hslee-handoff.md                        |  2 +-
 4 files changed, 71 insertions(+), 2 deletions(-)

# gate-fail-cause — Handoff

(세션 종료 시 post-commit hook이 자동 갱신합니다)

## 2026-11-03T15:11:10.173Z — 7484103 chore(task): subsystem-audit handoff 갱신
docs/hslee/subsystem-audit/subsystem-audit-handoff.md |  5 +++++
 src/commands/gate.mjs                                 | 19 +++++++++++++++++--
 tests/gate-command.test.mjs                           | 17 +++++++++++++++++
 3 files changed, 39 insertions(+), 2 deletions(-)

## 2026-11-03T15:11:10.551Z — 7282dd7 feat(gate): 게이트 실패 시 설치 흔적 부재를 환경 원인 단서로 알린다
.../gate-fail-cause/gate-fail-cause-artifact.md    | 17 ++++++++
 .../gate-fail-cause/gate-fail-cause-context.md     | 28 +++++++++++++
 .../gate-fail-cause/gate-fail-cause-handoff.md     |  9 +++++
 .../gate-fail-cause/gate-fail-cause-meta.json      | 11 ++++++
 docs/hslee/gate-fail-cause/gate-fail-cause-plan.md | 17 ++++++++
 docs/hslee/gate-fail-cause/gate-fail-cause-spec.md | 46 ++++++++++++++++++++++
 src/commands/gate.mjs                              | 19 ++++++++-
 tests/gate-command.test.mjs                        | 17 ++++++++
 8 files changed, 162 insertions(+), 2 deletions(-)

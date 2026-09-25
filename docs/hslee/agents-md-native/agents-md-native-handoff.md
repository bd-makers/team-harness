# agents-md-native — Handoff

(세션 종료 시 post-commit hook이 자동 갱신합니다)

## 2026-09-25T11:54:56.981Z — b92a0e8 docs(agents-md-native): D10 CLAUDE.md 유지 결정 + doctor eager tier 주석을 2.1.277 기준으로 정정
docs/decisions.md                                  | 40 +++++++++++++++
 .../agents-md-native/agents-md-native-artifact.md  | 13 +++++
 .../agents-md-native/agents-md-native-context.md   | 27 ++++++++++
 .../agents-md-native/agents-md-native-handoff.md   |  3 ++
 .../agents-md-native/agents-md-native-meta.json    | 11 ++++
 .../agents-md-native/agents-md-native-plan.md      | 18 +++++++
 .../agents-md-native/agents-md-native-spec.md      | 59 ++++++++++++++++++++++
 src/commands/doctor.mjs                            | 11 ++--
 templates/docs/decisions.md                        | 40 +++++++++++++++
 tests/doctor.test.mjs                              | 28 +++++-----
 10 files changed, 233 insertions(+), 17 deletions(-)

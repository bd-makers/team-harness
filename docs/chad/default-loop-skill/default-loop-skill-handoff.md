# default-loop-skill — Handoff

(세션 종료 시 post-commit hook이 자동 갱신합니다)

## 2026-10-06T10:22:31.933Z — b8175c3 docs(task): default-loop-skill spec·plan — /harness-loop 기본 루프 설계
.../default-loop-skill-artifact.md                 |  13 ++
 .../default-loop-skill-context.md                  |  27 +++
 .../default-loop-skill-handoff.md                  |   3 +
 .../default-loop-skill-meta.json                   |  11 ++
 .../default-loop-skill/default-loop-skill-plan.md  |  24 +++
 .../default-loop-skill/default-loop-skill-spec.md  | 204 +++++++++++++++++++++
 6 files changed, 282 insertions(+)

## 2026-10-06T10:25:21.699Z — 1fed62e docs(task): default-loop-skill plan 다이어그램 — /harness-loop swimlane
.../default-loop-skill-artifact.md                 |   1 +
 .../default-loop-skill-diagram.html                | 152 +++++++++++++++++++++
 .../default-loop-skill-handoff.md                  |   9 ++
 .../default-loop-skill/default-loop-skill-plan.md  |   2 +-
 4 files changed, 163 insertions(+), 1 deletion(-)

## 2026-10-06T10:27:56.400Z — 65db167 feat(loop): /harness-loop 선택형 기본 루프 명령 + 계약 테스트
.claude-plugin/plugin.json                         |   1 +
 commands/harness-interview.md                      |   1 +
 commands/harness-loop.md                           | 113 +++++++++++++++++++++
 .../default-loop-skill-handoff.md                  |   7 ++
 .../default-loop-skill/default-loop-skill-plan.md  |   4 +-
 docs/harness-overview.html                         |  21 ++++
 skills/harness-loop/SKILL.md                       |  26 +++++
 tests/loop-command.test.mjs                        |  88 ++++++++++++++++
 8 files changed, 259 insertions(+), 2 deletions(-)

## 2026-10-06T10:29:49.939Z — 789dcf8 docs(loop): README 설계 스코프 정정 + /harness-loop 절, 사이클 문서 S3·§6 갱신
README.md                                              | 18 ++++++++++++++++--
 .../default-loop-skill/default-loop-skill-handoff.md   | 11 +++++++++++
 .../chad/default-loop-skill/default-loop-skill-plan.md |  2 +-
 docs/harness-cycle.md                                  |  6 +++---
 4 files changed, 31 insertions(+), 6 deletions(-)

## 2026-10-06T10:30:56.398Z — 498badd docs(loop): CHANGELOG [Unreleased]에 /harness-loop 항목 + 루프 기록 줄
CHANGELOG.md                                                | 8 ++++++++
 docs/chad/default-loop-skill/default-loop-skill-artifact.md | 5 +++++
 docs/chad/default-loop-skill/default-loop-skill-handoff.md  | 7 +++++++
 docs/chad/default-loop-skill/default-loop-skill-plan.md     | 2 +-
 4 files changed, 21 insertions(+), 1 deletion(-)

## 2026-10-06T10:31:49.906Z — 747405f docs(loop): 검증만 하는 plan 단계 처리 규칙 + 5단계 검증 기록
commands/harness-loop.md                                    |  1 +
 docs/chad/default-loop-skill/default-loop-skill-artifact.md | 12 ++++++++++++
 docs/chad/default-loop-skill/default-loop-skill-handoff.md  |  7 +++++++
 docs/chad/default-loop-skill/default-loop-skill-plan.md     |  2 +-
 4 files changed, 21 insertions(+), 1 deletion(-)

## 2026-10-06T10:39:00.069Z — 814cd46 docs(task): default-loop-skill R2 루브릭 기록 (E1 fail: S3·S4)
.../default-loop-skill-artifact.md                 | 22 ++++++++++++++++++++++
 .../default-loop-skill-handoff.md                  |  7 +++++++
 .../default-loop-skill-meta.json                   | 12 +++++++++++-
 3 files changed, 40 insertions(+), 1 deletion(-)

## 2026-10-06T10:40:29.974Z — 28e6858 test(loop): R2 E1 반영 — 루브릭 담당·승인 필요 멈춤을 문장 단위로 고정
.../default-loop-skill-handoff.md                  |  6 ++++++
 tests/loop-command.test.mjs                        | 23 ++++++++++++++++++++++
 2 files changed, 29 insertions(+)

## 2026-10-06T10:40:39.352Z — 32ae06d docs(task): default-loop-skill 루프 기록 — R2 E1 반영
docs/chad/default-loop-skill/default-loop-skill-artifact.md | 5 +++++
 docs/chad/default-loop-skill/default-loop-skill-handoff.md  | 5 +++++
 2 files changed, 10 insertions(+)

## 2026-10-06T10:44:01.494Z — 02d5f5e docs(task): default-loop-skill R2 루브릭 재검 pass
.../default-loop-skill-artifact.md                 | 23 ++++++++++++++++++++++
 .../default-loop-skill-handoff.md                  |  5 +++++
 .../default-loop-skill-meta.json                   |  9 +++++++++
 3 files changed, 37 insertions(+)

## 2026-10-06T10:47:14.255Z — 9f9f0eb docs(loop): R3 P2 반영 — 검증 단계 명령 실행, 커밋 실패 시 체크 되돌림, untracked 진전 포함
commands/harness-loop.md                                 |  9 ++++++---
 .../default-loop-skill/default-loop-skill-artifact.md    | 16 ++++++++++++++++
 .../default-loop-skill/default-loop-skill-handoff.md     |  6 ++++++
 .../chad/default-loop-skill/default-loop-skill-meta.json |  9 +++++++++
 4 files changed, 37 insertions(+), 3 deletions(-)

## 2026-10-06T10:47:24.756Z — 6e67a16 docs(task): default-loop-skill 루프 기록 — R3 반영
docs/chad/default-loop-skill/default-loop-skill-artifact.md | 4 ++++
 docs/chad/default-loop-skill/default-loop-skill-handoff.md  | 7 +++++++
 2 files changed, 11 insertions(+)

## 2026-10-06T10:51:27.487Z — c7770ce docs(loop): R3 재검 P2 반영 — 마무리 전 필터 없는 scenario check, 마무리 도중 중단 시 재진입
commands/harness-loop.md                                 | 16 ++++++++++------
 .../default-loop-skill/default-loop-skill-artifact.md    | 15 +++++++++++++++
 .../default-loop-skill/default-loop-skill-handoff.md     |  5 +++++
 .../chad/default-loop-skill/default-loop-skill-meta.json |  9 +++++++++
 4 files changed, 39 insertions(+), 6 deletions(-)

## 2026-10-06T10:51:36.513Z — 6d3a716 docs(task): default-loop-skill 루프 기록 — R3 재검 반영
docs/chad/default-loop-skill/default-loop-skill-artifact.md | 3 +++
 docs/chad/default-loop-skill/default-loop-skill-handoff.md  | 7 +++++++
 2 files changed, 10 insertions(+)

## 2026-10-06T10:53:57.772Z — 15c6ee0 docs(task): default-loop-skill R3 3차 기록 + 루프 멈춤(spec 공백: R3 통과 기준)
.../default-loop-skill/default-loop-skill-artifact.md   | 17 +++++++++++++++++
 .../default-loop-skill/default-loop-skill-handoff.md    |  5 +++++
 .../default-loop-skill/default-loop-skill-meta.json     |  9 +++++++++
 3 files changed, 31 insertions(+)

## 2026-10-06T11:01:49.571Z — d0de577 docs(task): default-loop-skill spec R-8 — R3 통과 기준 결정(P1 없음, P2 재검 한 번까지)
docs/chad/default-loop-skill/default-loop-skill-handoff.md | 6 ++++++
 docs/chad/default-loop-skill/default-loop-skill-plan.md    | 1 +
 docs/chad/default-loop-skill/default-loop-skill-spec.md    | 8 +++++++-
 3 files changed, 14 insertions(+), 1 deletion(-)

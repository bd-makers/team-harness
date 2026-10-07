# wiki-compile — Handoff

(세션 종료 시 post-commit hook이 자동 갱신합니다)

## 2026-10-07T05:02:25.579Z — 6ebb973 docs(task): wiki-compile spec 초안 — 인터뷰 질문 대기
docs/chad/wiki-compile/wiki-compile-artifact.md |  13 +++
 docs/chad/wiki-compile/wiki-compile-context.md  |  27 +++++
 docs/chad/wiki-compile/wiki-compile-handoff.md  |   3 +
 docs/chad/wiki-compile/wiki-compile-meta.json   |  11 ++
 docs/chad/wiki-compile/wiki-compile-plan.md     |  15 +++
 docs/chad/wiki-compile/wiki-compile-spec.md     | 132 ++++++++++++++++++++++++
 6 files changed, 201 insertions(+)

## 2026-10-07T06:02:51.452Z — 322981e docs(task): wiki-compile spec 확정·plan — 인터뷰 답 반영, 게이트 통과
docs/chad/wiki-compile/wiki-compile-handoff.md |   9 ++
 docs/chad/wiki-compile/wiki-compile-plan.md    |  15 +-
 docs/chad/wiki-compile/wiki-compile-spec.md    | 209 ++++++++++++++++++-------
 3 files changed, 169 insertions(+), 64 deletions(-)

## 2026-10-07T06:07:15.930Z — b3ca5c1 feat(wiki): wiki sources — 위키 컴파일의 결정론적 입력(출처·마커·compiled·규칙)
bin/harness-team.mjs                            |   6 +-
 docs/chad/wiki-compile/wiki-compile-artifact.md |   3 +
 docs/chad/wiki-compile/wiki-compile-handoff.md  |   6 +
 docs/chad/wiki-compile/wiki-compile-plan.md     |   2 +-
 docs/chad/wiki-compile/wiki-compile-spec.md     |  28 +--
 docs/harness-overview.html                      |  10 +
 src/cli-args.mjs                                |   8 +-
 src/commands/wiki.mjs                           | 274 ++++++++++++++++++++++++
 tests/cli-args.test.mjs                         |   2 +-
 tests/wiki.test.mjs                             | 191 +++++++++++++++++
 10 files changed, 512 insertions(+), 18 deletions(-)

## 2026-10-07T06:09:01.377Z — 8272059 feat(wiki): /harness-wiki 명령 + Codex 래퍼 + 종결 절차 선택 단계
.claude-plugin/plugin.json                     |  1 +
 README.md                                      | 13 +++++
 commands/harness-task.md                       |  2 +
 commands/harness-wiki.md                       | 53 +++++++++++++++++
 docs/chad/wiki-compile/wiki-compile-handoff.md | 13 +++++
 docs/chad/wiki-compile/wiki-compile-plan.md    |  4 +-
 docs/harness-overview.html                     | 21 +++++++
 skills/harness-wiki/SKILL.md                   | 20 +++++++
 tests/wiki-command.test.mjs                    | 79 ++++++++++++++++++++++++++
 9 files changed, 204 insertions(+), 2 deletions(-)

## 2026-10-07T06:10:27.244Z — 525ae5d docs(wiki): dogfood — #134·#133을 wiki/로 컴파일 + 작성 규칙
docs/chad/wiki-compile/wiki-compile-artifact.md |  5 ++++
 docs/chad/wiki-compile/wiki-compile-handoff.md  | 12 ++++++++++
 docs/chad/wiki-compile/wiki-compile-plan.md     |  2 +-
 tests/wiki.test.mjs                             | 14 +++++++++++
 wiki/20_domain/default-loop.md                  | 24 +++++++++++++++++++
 wiki/20_domain/review-gates.md                  | 24 +++++++++++++++++++
 wiki/90_system/compile-rules.md                 | 31 +++++++++++++++++++++++++
 wiki/index.md                                   |  9 +++++++
 8 files changed, 120 insertions(+), 1 deletion(-)

## 2026-10-07T06:11:19.447Z — 88e2ba5 docs(task): wiki-compile 검증 출력 기록 — 시나리오 10개 이름 줄
docs/chad/wiki-compile/wiki-compile-artifact.md | 25 +++++++++++++++++++++++++
 docs/chad/wiki-compile/wiki-compile-handoff.md  | 11 +++++++++++
 docs/chad/wiki-compile/wiki-compile-spec.md     |  2 +-
 3 files changed, 37 insertions(+), 1 deletion(-)

## 2026-10-07T06:13:41.747Z — 17ed4ac test(wiki): S1이 작성자를 경로가 아니라 meta에서 읽는지 가른다 — R2 E1 반영
docs/chad/wiki-compile/wiki-compile-artifact.md | 22 ++++++++++++++++++++++
 docs/chad/wiki-compile/wiki-compile-handoff.md  |  6 ++++++
 docs/chad/wiki-compile/wiki-compile-meta.json   | 12 +++++++++++-
 docs/chad/wiki-compile/wiki-compile-spec.md     |  4 ++--
 tests/wiki.test.mjs                             | 13 +++++++------
 5 files changed, 48 insertions(+), 9 deletions(-)

## 2026-10-07T06:16:02.929Z — 540b601 docs(task): wiki-compile R2 재검 pass 기록
docs/chad/wiki-compile/wiki-compile-artifact.md | 28 +++++++++++++++++++++++++
 docs/chad/wiki-compile/wiki-compile-handoff.md  |  8 +++++++
 docs/chad/wiki-compile/wiki-compile-meta.json   |  9 ++++++++
 3 files changed, 45 insertions(+)

## 2026-10-07T06:18:28.564Z — 6974ddb fix(wiki): done 뒤에는 대상 task를 명시 · 펜스 닫기는 CommonMark 길이 규칙 — R3 P2 반영
README.md                                       |  2 +-
 commands/harness-task.md                        |  4 ++--
 commands/harness-wiki.md                        |  4 ++--
 docs/chad/wiki-compile/wiki-compile-artifact.md | 19 +++++++++++++++++++
 docs/chad/wiki-compile/wiki-compile-handoff.md  |  6 ++++++
 docs/chad/wiki-compile/wiki-compile-meta.json   |  9 +++++++++
 src/commands/wiki.mjs                           | 18 +++++++++++++-----
 tests/wiki-command.test.mjs                     |  6 +++---
 tests/wiki.test.mjs                             |  3 +++
 9 files changed, 58 insertions(+), 13 deletions(-)

## 2026-10-07T06:21:22.240Z — 47c18af docs(task): wiki-compile R3 통과 기록 — 남은 P2 2건 후속
docs/chad/wiki-compile/wiki-compile-artifact.md | 21 +++++++++++++++++++++
 docs/chad/wiki-compile/wiki-compile-handoff.md  | 12 ++++++++++++
 docs/chad/wiki-compile/wiki-compile-meta.json   |  9 +++++++++
 3 files changed, 42 insertions(+)

## 2026-10-07T06:21:49.860Z — ee7d529 docs: wiki-compile CHANGELOG [Unreleased] · 사이클 §6 C1 구현 표기
CHANGELOG.md                                   | 10 ++++++++++
 docs/chad/wiki-compile/wiki-compile-handoff.md |  6 ++++++
 docs/chad/wiki-compile/wiki-compile-plan.md    |  2 +-
 docs/harness-cycle.md                          |  2 +-
 4 files changed, 18 insertions(+), 2 deletions(-)

## 2026-10-07T06:22:11.415Z — 930ec86 docs(task): wiki-compile ship — spec 실행 시점 정정, 리스크·후속 기록
docs/chad/wiki-compile/wiki-compile-artifact.md | 6 ++++++
 docs/chad/wiki-compile/wiki-compile-handoff.md  | 7 +++++++
 docs/chad/wiki-compile/wiki-compile-spec.md     | 3 ++-
 3 files changed, 15 insertions(+), 1 deletion(-)

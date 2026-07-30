# skilltest-ast-grader — Spec

## 목적 / 요구사항

`tests/sim/skilltest.mjs`의 GWT/AAA 3구획 grader에서 **정규식·텍스트 매칭 basis를 제거**하고
구조(토큰화) 위에서 채점하게 만든다. 목표는 재발한 false-PASS 클래스를 **네 번째로 패치하는
것이 아니라 구조적으로 불가능하게** 만드는 것 — 리뷰어가 이 패턴을 "body-stealing
laundering"으로 명명하고 라운드 4를 고치지 말고 basis를 없애라고 요구했다.

누수는 세 라운드에 걸쳐 자리를 옮겼다: 파일 사이 → 테스트 사이 → 본문 사이.

산출물:
- `tests/sim/skilltest.mjs` — 본문 *안* 판정(`markersIn`/`regionsIn`)을 토큰화 위로 이전
- 회귀 selftest — 옛 basis에서 **붉어짐이 실증된** assert
- `<name>-artifact.md` — 결과·유지된 특례 명시 disclosure·범위 밖 콜아웃

## 설계 / 접근

부모 커밋(ad937fe) 실측 결과 본문 *경계*는 이미 구조적이었다(`scanNonCode` 토큰화 +
`matchBrace` + `testBodies`). 남은 원시 텍스트 basis는 본문 *안*의 판정이었다:
`markersIn`이 주석 마커 줄을, `regionsIn`이 빈 줄을 **마스킹 안 된 본문**에서 스캔했다.
→ 템플릿 리터럴/문자열/블록 주석 안의 `// Given`·빈 줄이 가짜 3구획을 위조할 수 있다(round 4).

수정: 같은 토큰화기를 재사용하는 `maskNonCode(body)` 헬퍼를 두고 두 판정을 그 위에서 돌린다.
토큰화기 자체(`scanNonCode`/`matchBrace`/`findBodyOpen`/`findDeclarations`)는 이미 정확하고
검증돼 있으므로 **손대지 않는다**(advisor 권고). 변경은 헬퍼 + 호출 지점 2곳 + selftest
— 리뷰 라운드 1에서 오파싱 가드(`hasMisparsedString` + `testBodies` 호출 지점 1곳)가
더해져 최종은 헬퍼 2개·호출 지점 3개다(경위는 `<name>-artifact.md` FIX-C).

제약:
- 신규 런타임 의존성 0 — stdlib만(레포 요구).
- 범위는 GWT 3구획 판정으로 한정. 다른 presence 신호(`hasExpect` 등)는 조용히 넓히지 말고 콜아웃.
- 구조 파싱이 공급할 수 없는 **의미** 규칙 2개(마커=주석 한정, `// When & Then` 분절)는
  유지하되 특례임을 artifact에 명시한다.

## Ontology
*이 task가 다루는 핵심 개념의 정의.*

- **basis**: 채점이 딛고 선 표현 층. 원시 텍스트 basis는 "무엇이 코드인지"를 모르므로
  콘텐츠가 신호를 위조할 수 있다. 구조 basis는 그 위조를 문법적으로 불가능하게 한다.
- **누수 relocation**: 같은 defect 클래스가 패치될 때마다 인접 경계로 이동하는 현상
  (files → tests → bodies → 본문 안 콘텐츠). 경계 하나를 막는 수정은 클래스를 못 닫는다.
- **구획(region)**: 계약이 요구하는 3단계 구분. "주석 마커 ≥2줄" **또는** "빈 줄 ≥2개"로
  성립하며, 둘 다 **코드 영역**에서만 세어야 한다.
- **MANUAL(추측 금지 통)**: 파서가 본문을 신뢰할 수 없을 때의 출구. PASS도 FAIL도 아닌
  수기 확인 신호 — 오답보다 낫다는 것이 harness의 기존 계약이다.

**Ontology gate 통과 근거**: 부모 커밋의 `skilltest.mjs` 전체와 기존 50개 selftest를 정독해
"본문 경계는 이미 구조적, 본문 안 판정만 원시 텍스트"라는 실제 상태를 확정하고, 브리프 전제
(전면 regex grader)와의 불일치를 먼저 기록했다.

## Ambiguity 자가진단

- [x] **Goal 명확도** (40%) — GWT 3구획 판정의 텍스트 basis 제거. 라운드 4 패치가 아니라
  basis 제거라는 성공 형태가 브리프에 명시.
- [x] **Constraint 명확도** (30%) — 토큰화기 불가침, 신규 의존성 0, 범위는 3구획 판정 한정,
  유지 특례는 명시 disclosure, 범위 확장은 조용히 하지 말고 콜아웃.
- [x] **Success 기준** (30%) — `node tests/sim/skilltest.mjs selftest` 그린 + 기존 assert
  불변(criterion 5) + 신규 회귀 assert가 **옛 basis 사본에서 붉어짐** 실증.
- [x] **Context 명확도** (brownfield 한정) — 영향 파일 1개(`tests/sim/skilltest.mjs`).
  sibling harness(`agentloop.mjs`·`codex-agentloop.mjs`)는 grep으로 무관 확인.
- [x] **Ambiguity ≤ 0.2** — 가중합 1.0 ≥ 0.8.

## 참고
- `tests/sim/skilltest.mjs` — grader SSOT(`scanNonCode`~`scoreGWT`, selftest 배터리).
- `commands/harness-unittest.md`, `commands/harness-comptest.md` — 3구획 계약 원문.
- `docs/chad/harness-sim/` — L5 sim harness 계보(skilltest는 그 형제).

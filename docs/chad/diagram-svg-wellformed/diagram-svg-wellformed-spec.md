# diagram-svg-wellformed — Spec

## 목적 / 요구사항
*문제(오늘 무엇이 안 되는가) → 영향받는 사용자·시스템 → 기대 결과 → 제약 순으로 쓴다.
답 없는 질문은 요구가 아니다 — `## 참고` 절에 `- (open) …`으로 남긴다.
다른 역할에 물어야 하면 `- (ask:<역할>) …` → `(asked:<역할> <날짜> <링크>)` → `(answered <링크>)`로 상태를 적고, 반영하면 지운다.*

- **문제**: `svgSelfContainmentViolations`는 자립성(script·외부 참조·`<svg>` 루트·끝의 `</svg>`)만 본다. `<svg …><g><rect></g></rect></svg>`처럼 태그 짝이 어긋난 SVG를 통과시켜, `diagram record --view`가 생성으로 기록하고 `brief`는 깨진 `<img>`를 싣고 `embedded`로 보고한다(brief-diagram-svg-embed codex 리뷰 P2).
- **영향**: `diagram record --view`, `brief`, `pr-check`(뷰 SVG 링크 안내) — 세 곳 모두 이 함수를 부른다.
- **기대 결과**: 태그 짝이 어긋나거나 닫히지 않았거나 루트 뒤에 요소가 더 있는 SVG는 위반 하나로 거부된다 — `record --view` exit 1, `brief` `rejected`, `pr-check`는 링크하지 않음.
- **제약**: 파서 없이 결정론적 문자열 검사, 의존성 0. 함수 시그니처(문자열 → 위반 문자열 배열)는 그대로. 기존 위반 표본은 저마다 위반 정확히 하나를 유지한다.


## 범위 (In / Out)
*`- **In**: …`에 이번 task가 바꾸는 것(파일·모듈·동작)을, `- **Out**: …`에 하지 않기로 한 것과 그 이유 한 줄을 쓴다 —
요청하지 않은 기능·관련 없는 리팩터링이 섞이지 않게 긋는 경계다.*

- **In**: `src/commands/diagram.mjs` `svgSelfContainmentViolations`에 태그 중첩 검사 추가, `tests/diagram-command.test.mjs`·`tests/brief-command.test.mjs` 표본, `CHANGELOG.md` `[Unreleased]` `### Changed`.
- **In (리뷰 반영으로 넓어짐)**: 같은 함수의 기존 결함 셋 — 루트 끝 공백·주석을 걷던 정규식의 지수 backtracking(`### Fixed`), 이벤트 핸들러 규칙이 문자 참조를 푼 글을 보던 것(`### Fixed`), 위반 문구가 태그 이름을 길이 제한 없이 찍던 것.
- **Out**: 완전한 XML well-formedness — 속성 따옴표(기존 표본 `href=logo.png`가 허용 대상), 중복 속성, 엔티티 유효성, 텍스트의 맨 `&`, 따옴표 속성값 안의 `<`(`aria-label="a<b"` — 기존 `ATTR` 패턴이 삼킨다). 파서 의존성이 필요하거나 기존 표본의 "위반 하나" 계약을 깬다.
- **Out**: DOCTYPE 내부 subset·SMIL `on*`/`href`·`_` 요소 이벤트 같은 스크립트 우회 — task `svg-script-evasion`이 맡았고 그 브랜치를 이 브랜치에 merge했다.
- **Out**: 호출부(`record`·`brief`·`pr-check`) 변경 — 함수 하나가 정본이라 호출부는 그대로 더 엄격해진다.


## 원천 검토 (R1)
*원천 문서(PRD·Figma·API 문서·기획서·정책서) 사이의 충돌·누락·모순을 Plan 전에 검토한다(`/harness-interview`).
충돌·모순은 `(unresolved)`, 누락은 `(open)`(다른 역할에 물을 것이면 `(ask:<역할>)`)으로 적고, `→ 결정: …`으로 해결한 뒤 재대조해 `- 검토 완료: <날짜>`로 닫는다.
원천이 없으면 `- 없음 — <사유>` 한 줄. 원천 위치는 프로젝트가 정한다.*

### 원천
- 상위 세션 지시(2026-11-25): brief-diagram-svg-embed codex 리뷰 P2 "well-formedness 미검사"
- `src/commands/diagram.mjs`, `src/commands/brief.mjs`, `src/commands/pr-check.mjs`, `tests/diagram-command.test.mjs`

### 발견
- (unresolved) 기준 브랜치: brief의 뷰 SVG 삽입은 `claude/brief-diagram-svg-embed-0f4251`에만 있고 main에 없다 → 결정: 이 브랜치를 그 끝(3acad236)으로 fast-forward해 그 위에 쌓는다. 그 브랜치가 먼저 머지돼야 한다.
- (unresolved) 같은 함수를 `pr-check`도 부른다 → 결정: 한 곳에 넣어 세 호출부가 함께 엄격해진다. CHANGELOG에 셋 다 적는다.
- (unresolved) 잘린 파일은 이미 "닫히지 않음" 위반을 낸다 → 결정: 루트 없음·루트 안 닫힘 위반이 있으면 중첩 검사를 건너뛴다(한 원인 한 위반).
- 검토 완료: 2026-11-25


## 설계 / 접근
- 프롤로그를 벗긴 원문(`body`, 문자 참조를 풀기 전 — `&#60;`가 태그가 되지 않게)을 토큰 하나씩 읽는다: 주석·`<![CDATA[…]]>`·PI는 건너뛰고, `</name>`과 `<name ATTR* /?>`(기존 `ATTR` 패턴)로 스택을 쌓는다. 이름은 대소문자를 그대로 비교한다(XML).
- 첫 오류 하나만 `태그 구조: …`로 보고한다: ``</g> 가 <rect> 를 닫음``(짝 어긋남), ``루트 </svg> 뒤에 내용: …``, ``태그로 읽히지 않는 '<': …``. 루트가 열린 동안의 엉뚱한 닫기는 짝 어긋남으로, 루트가 닫힌 뒤의 것은 루트 뒤 내용으로 잡힌다. ``<x> 가 닫히지 않음`` 갈래도 있지만 이 함수로는 닿지 않는다 — 루트 끝 검사가 `</svg>`로 끝나기를 요구하고, 그 `</svg>`가 남은 자식을 만나면 짝 어긋남이 먼저다(방어용).
- 태그 이름은 `excerpt()`로 60자에서 자른다(다른 위반 문구와 같다).
- `ATTR`의 속성 이름은 `<`·따옴표를 받지 않는다 — 받으면 `<rect a<b/>`가 한 태그로 읽혀 맨 `<`를 놓친다.
- 루트가 닫혔는지는 끝에서부터 공백·주석을 걷는 루프로 본다(정규식 `(?:\s+|<!--…-->)*$`는 공백 덩어리마다 지수로 되짚었다). 이벤트 핸들러 규칙은 문자 참조를 풀기 전 원문에서 찾는다 — XML은 속성 이름·따옴표 구조의 문자 참조를 풀지 않는다.


## Ontology
*이 task가 다루는 핵심 개념의 정의. "X가 정확히 뭔가?"에 답한다.*

- **태그 중첩 위반**: 요소 태그의 여닫이 짝이 스택으로 맞지 않거나, 루트 하나 뒤에 요소·글자가 더 있는 것. 속성·엔티티 문법은 포함하지 않는다.
- 게이트 근거: 상위 세션 지시가 대상 함수·수용 기준·보존할 기존 테스트를 정했다.

## Ambiguity 자가진단
*각 항목이 명확하면 체크. 3개 이상 미체크면 구현 진입 금지 — 인터뷰/브레인스토밍으로 복귀해
모호성을 제거한다. 게이트를 통과하면 그 근거를 위 Ontology 섹션에 한 줄로 남긴다.*

- [x] **Goal 명확도** (40%) — 목표가 한 문장으로 구체화되었는가?
- [x] **Constraint 명확도** (30%) — 기술/시간/범위 제약이 명시되었는가?
- [x] **Success 기준** (30%) — 완료를 어떻게 측정하는가?
- [x] **Context 명확도** (brownfield 한정) — 영향 받는 기존 코드/파일을 식별했는가?
- [x] **Ambiguity ≤ 0.2** — 위 항목 가중합 ≥ 0.8

<!-- 선택 선언. 아래 주석을 벗기면 done 가드가 검사한다.
     미선언 기본값: "tests": "optional" ("required"면 소스가 바뀔 때 테스트 파일 변경을 요구), "review": "optional",
     "verify": "optional" ("required"면 검증 프레이밍 kind 마커 — -adversarial 등 — 를 요구).
     R2(옵트인): "scenarios": [{ "id", "given", "when", "then", "test", "cmd" }] — 수용 기준을 Given/When/Then으로 쓰고
     증거(테스트 이름·명령)를 잇는다. `harness-team scenario check`가 cmd exit 0을, `review <engine> --framing scenario`가
     "증거가 Then을 검증하는가"를 판정한다. 선언하면 verify 증거는 -scenario kind만 센다. -->
## Done evidence
```json
{ "version": 1, "tests": "required" }
```

## 참고
*코드 기반 참조가 산문 설계보다 정밀하다 — 테스트 스위트·Boundary contract(JSON Schema)·
다이어그램·기존 코드 경로를 우선 링크하고, 산문은 코드로 표현 못 하는 의도만 담는다.*

- `tests/diagram-command.test.mjs` `SVG_VIOLATIONS`·`허용되는 비슷한 것들을 모은 SVG 는 통과한다`
- `tests/brief-command.test.mjs` rejected 테스트

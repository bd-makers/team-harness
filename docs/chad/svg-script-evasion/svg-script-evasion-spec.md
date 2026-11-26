# svg-script-evasion — Spec

## 목적 / 요구사항
*문제(오늘 무엇이 안 되는가) → 영향받는 사용자·시스템 → 기대 결과 → 제약 순으로 쓴다.
답 없는 질문은 요구가 아니다 — `## 참고` 절에 `- (open) …`으로 남긴다.
다른 역할에 물어야 하면 `- (ask:<역할>) …` → `(asked:<역할> <날짜> <링크>)` → `(answered <링크>)`로 상태를 적고, 반영하면 지운다.*

- **문제**: `svgSelfContainmentViolations`가 스크립트 우회 세 갈래를 `[]`(통과)로 돌려준다(read-only claude 리뷰 발견, 작성 세션 재현).
  1. DTD 내부 subset 속성 기본값: `<!DOCTYPE svg [<!ATTLIST rect onclick CDATA "x()">]>\n<svg xmlns="…"><rect/></svg>` — `<!ENTITY`만 막는다.
  2. `_`로 시작하는 요소 이름: `<_x onclick="x()"/>` — 이벤트 규칙이 `<[a-z]`로 시작한다.
  3. SMIL로 이벤트 속성 애니메이션: `<set attributeName="onclick" to="x()"/>`, `<animate>`도 같다.
- **영향**: `diagram record --view`(거부), `brief`(data URI `<img>` 슬라이드 — 실패 시 `rejected`), `pr-check`(PR 본문 링크). `<img>` 경로에서는 스크립트가 돌지 않으므로 실제 영향은 SVG를 직접 연 경우(브라우저 탭·PR 파일 뷰의 raw 링크 등)다.
- **기대 결과**: 브라우저가 실제로 따르는 갈래는 위반 하나로 거부한다. 따르지 않는 갈래는 1차 자료로 확인해 여기에 남기고 거부 여부를 정한다.
- **제약**: 파서 없는 결정론적 문자열 검사, 의존성 0. 시그니처 그대로. `SVG_VIOLATIONS`의 "표본마다 위반 정확히 하나" 계약과 `record --view` exit 1 루프 유지.


## 범위 (In / Out)
*`- **In**: …`에 이번 task가 바꾸는 것(파일·모듈·동작)을, `- **Out**: …`에 하지 않기로 한 것과 그 이유 한 줄을 쓴다 —
요청하지 않은 기능·관련 없는 리팩터링이 섞이지 않게 긋는 경계다.*

- **In**: `src/commands/diagram.mjs` `ALWAYS_BAD` 규칙 보강, `tests/diagram-command.test.mjs` 표본, `CHANGELOG.md` `[Unreleased]` `### Changed`, `commands/harness-diagram.md` 6번 뷰 제약 한 줄.
  리뷰로 넓어진 것: 위반 문구 60자 자르기(codex 3차 P3, `1a9069ea`) — `ALWAYS_BAD` 고리가 `excerpt(m[1])`을 쓰고, 같은 결함이 있던 태그 구조 문구(`</x> 가 <y> 를 닫음`·`<x> 가 닫히지 않음`, task `diagram-svg-wellformed` 소유)의 태그 이름도 자른다. `CHANGELOG.md` `### Fixed` 한 줄.
- **Out**: 호출부(`record`·`brief`·`pr-check`) 변경 — 함수 하나가 정본이다. CSP 등 뷰어 쪽 방어 — 이 검사 밖이다. 완전한 XML/DTD 파싱 — 제약 위반. 글자(text) 속 `attributeName="href"`·`data-attributeName="href"` 거짓 거부(codex 1·2·3차 P2-2/P3) — 마크업과 글자를 가르려면 파서가 필요하고, 다이어그램에서 드물어 거부 쪽이 안전하다(정책 안, 미조치).


## 원천 검토 (R1)
*원천 문서(PRD·Figma·API 문서·기획서·정책서) 사이의 충돌·누락·모순을 Plan 전에 검토한다(`/harness-interview`).
충돌·모순은 `(unresolved)`, 누락은 `(open)`(다른 역할에 물을 것이면 `(ask:<역할>)`)으로 적고, `→ 결정: …`으로 해결한 뒤 재대조해 `- 검토 완료: <날짜>`로 닫는다.
원천이 없으면 `- 없음 — <사유>` 한 줄. 원천 위치는 프로젝트가 정한다.*

### 원천
- 상위 세션 지시(2026-11-25): 세 갈래 재현 표본, "1·3은 브라우저가 실제로 따르는지 1차 자료로 먼저 확인"
- 브라우저 동작 확인(2026-11-25, 조사 서브에이전트). 방법: `image/svg+xml`로 `127.0.0.1`에서 서빙해 최상위 문서로 열기.
  Blink = 내장 브라우저(Chrome 156), WebKit = `WKWebView`(AppleWebKit/605.1.15, Safari 27.2 설치 기기). Gecko는 Firefox가 없어 **소스만**.
  클릭은 `dispatchEvent` 합성 이벤트, CSP 없음(`unsafe-inline` 없는 CSP면 전부 막힌다).
- 읽은 1차 자료:
  - libxml2 `parser.c` — `xmlParseAttributeListDecl`이 SAX2면 `xmlAddDefAttrs`로 기본값을 저장하고, `xmlParseStartTag2`가 "Default attributes"를 `startElementNs`에 붙인다(`nb_defaulted`). `XML_PARSE_DTDATTR`와 무관. 로컬 `xmllint --sax`(2.9.13)도 `rect`에 기본값 `onclick` 1개를 보고.
  - Blink `third_party/blink/renderer/core/xml/parser/xml_document_parser.cc` — SAX2, `HandleElementAttributes`가 `nb_attributes` 전체(기본값 포함)를 돈다.
  - WebKit `Source/WebCore/xml/parser/XMLDocumentParserLibxml2.cpp` — 같은 구조, 외부 DTD는 받지 않음(`XML_PARSE_DTDLOAD` 없음) → 내부 subset만 해당.
  - Gecko `parser/htmlparser/nsExpatDriver.cpp` `HandleStartElement` — "we have to check for default attrs ourselves" 주석과 함께 기본값까지 돈다. pyexpat(expat 2.7.4)도 기본값 보고.
  - SVG 1.1 §Scripting(<https://www.w3.org/TR/SVG11/script.html#GraphicsEvents>) — 이벤트 속성 전부 "Animatable: no".
  - Blink `svg_animate_element.cc` `ResolveTargetProperty`/`HasValidAnimation`(`kAnimatedUnknown`이면 무효), Gecko `dom/svg/SVGElement.cpp` `GetAnimatedAttr`·`dom/smil/SMILCompositor.cpp`, WebKit `SVGAnimateElementBase.cpp` `hasValidAttributeType` — SMIL은 타입 있는 SVG 속성·CSS 속성만 바꾸고 DOM 내용 속성(`onclick`)은 바꾸지 않는다.
  - Blink `svg_a_element.cc`·WebKit `SVGAElement.cpp`·Gecko `SVGAElement.cpp` — `<a>`의 이동은 href의 **애니메이션 값**을 읽는다.
  - 선례: MediaWiki CVE-2017-0366(<https://phabricator.wikimedia.org/T151735>) — SVG 업로드의 ATTLIST 기본값으로 금지 속성을 붙인 stored XSS, DTD 선언 허용 목록으로 고침.
- 검증 안 된 포인터(요약·검색 결과로만 봄, 근거로 쓰지 않음): PortSwigger "svg-animate-xss-vector"(403), slcyber "Two bypasses for Chrome's Sanitizer API"(`attributeName="xlink:href:x"`), Firefox bug 1126352, RUSTSEC-2026-0213.

### 발견
- (unresolved) 갈래 1 — 브라우저가 따르는가 → **따른다.** Blink·WebKit 관찰: 기본값 `onload`가 상호작용 없이 돌고 `rect` 클릭 핸들러가 돈다, `getAttribute('onclick')`이 기본값을 돌려준다. Gecko는 소스상 같다(미실행). → 결정: 거부. `<!ATTLIST`만이 아니라 내부 subset 선언 키워드(`ENTITY`·`ATTLIST`·`ELEMENT`·`NOTATION`) 하나라도 있으면 거부한다(허용 목록 — 다이어그램에 subset이 필요 없다). 옛 `<!ENTITY` 규칙을 흡수해 한 규칙으로 — 두 규칙이면 ENTITY+ATTLIST 표본이 위반 둘이 된다. 위반 문구가 `DTD 엔티티 선언`에서 `DTD 내부 subset 선언`으로 바뀐다. `[`로 subset을 찾지 않는다 — 따옴표 리터럴 해석에 기대게 된다. 원문에서 찾는다(선언 키워드는 문자 참조로 못 쓴다).
- (unresolved) 갈래 2 — 확인 불필요(알 수 없는 요소도 SVG 이름공간의 `SVGElement`라 `GlobalEventHandlers`를 가진다) → 결정: 거부. 이벤트 규칙의 요소 이름을 태그 구조 검사의 `TAG_NAME`(`[^\s/<>!?="']+`)으로 바꾼다 — `_`·ASCII 밖 글자(`<é …>`)도 함께 잡힌다.
- (unresolved) 갈래 3 — 브라우저가 따르는가 → **따르지 않는다.** Blink·WebKit 관찰: `<set>`·`<animate attributeName="onclick">` 뒤 핸들러가 돌지 않고 `getAttribute('onclick')`은 null. Gecko 소스상 같다. 명시적 `on*` 차단이 아니라 SMIL이 내용 속성을 못 바꾸는 구조 때문이다. Blink의 `IsSVGAnimationAttributeSettingJavaScriptURL`은 붙여넣기 정화용이지 실행 시 가드가 아니다.
  → 결정: 그래도 거부. 쓸 일이 없고(Animatable: no) 규칙 하나가 아래 실제 갈래와 같이 막는다.
- (unresolved) 조사 중 발견 — SMIL로 `href` 애니메이션(`<a><animate attributeName="href" values="javascript:x()"/></a>`)은 **실제로 돈다.** Blink·WebKit 관찰(`a.href.animVal`이 `javascript:` URL이 되고 클릭 시 실행), Gecko 소스상 같다. `href=`가 없어 외부 href 규칙을 비켜 간다. → 결정: 지시 범위 밖이지만 같은 갈래(SMIL로 속성 바꾸기)·같은 위협 모델이라 갈래 3 규칙에 넣는다. `attributeName` 값의 로컬 이름(마지막 `:` 접두사 뒤)이 `on…`·`href…`면 거부 — `xlink:href`·`xlink:href:x` 꼼수 포함. 속성 값이라 XML이 문자 참조를 풀므로 **푼 글**에서 찾는다(`attributeName="&#104;ref"` = href).
- 검토 완료: 2026-11-25


## 설계 / 접근
- `ALWAYS_BAD`에 두 규칙: `/(<!(?:ENTITY|ATTLIST|ELEMENT|NOTATION))\b/i`(raw, `DTD 내부 subset 선언`)가 `<!ENTITY` 규칙을 대신하고, `/\battributeName\s*=\s*(?:["']\s*)?((?:[^\s"'<>:=]*:)*(?:on[a-z]|href)[^\s"'<>]*)/i`(decoded, `SMIL 로 바꾸는 이벤트·href 속성`)를 더한다. 따옴표 뒤 공백은 따옴표가 있을 때만 받고(codex P2-1), 접두사 글자에서 `=`를 뺀다(codex 재리뷰 P2) — 둘 다 이어 쓴 입력에서 2차로 되짚던 것을 막는다.
- 이벤트 규칙 `<[a-z][\w:.-]*` → `<${TAG_NAME}`. `TAG_NAME` 정의를 `ALWAYS_BAD` 위로 올려 두 검사가 함께 쓴다.
- 위반 문구는 일치 값을 `excerpt`(60자, 넘으면 57자+`...`)로 자른다 — `REF_RULES`가 이미 쓰던 함수를 `ALWAYS_BAD` 고리와 태그 구조 문구에도 쓴다.
- 다른 규칙과 겹치지 않음: `attributeName="href"`에는 `href=`가 없어 외부 href 규칙이 안 걸리고, `values` 안 `url(…)`은 이미 외부 `url()` 규칙이 잡는다.


## Ontology
*이 task가 다루는 핵심 개념의 정의. "X가 정확히 뭔가?"에 답한다.*

- **스크립트 우회**: `<script>`·`on…=` 리터럴 없이 SVG를 직접 열었을 때 스크립트가 돌거나 `javascript:`로 이동하게 만드는 마크업 — DTD 속성 기본값, 검사가 못 읽는 요소 이름, SMIL로 바꾼 속성.
- **DTD 내부 subset 선언**: `<!DOCTYPE … [ … ]>` 안의 `<!ENTITY`·`<!ATTLIST`·`<!ELEMENT`·`<!NOTATION`. PUBLIC/SYSTEM 식별자만 있는 DOCTYPE은 해당하지 않는다.
- 게이트 근거: 상위 세션 지시가 대상 함수·재현 표본·수용 기준·보존할 계약을 정했고, 열린 질문(1·3을 브라우저가 따르는가)은 1차 자료로 닫았다.

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

- `tests/diagram-command.test.mjs` `SVG_VIOLATIONS`(`// svg-script-evasion` 이하)·`허용되는 비슷한 것들을 모은 SVG 는 통과한다`(opacity·fill SMIL, 글자 속 `&#60;!ENTITY`)
- 선행 task `docs/chad/diagram-svg-wellformed/`

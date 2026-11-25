# svg-script-evasion — Artifact

*최종 결과물과 학습 내용을 기록한다.*

## 결과

- 2026-11-25: `svgSelfContainmentViolations`가 세 갈래를 위반 하나로 거부 — ① DTD 내부 subset 선언(`<!ENTITY` 규칙 흡수, 문구 `DTD 내부 subset 선언`), ② 이벤트 규칙 요소 이름을 `TAG_NAME`으로(`_`·ASCII 밖), ③ SMIL `attributeName`의 `on…`·`href…`(조사 중 실제로 도는 href→`javascript:` 갈래 포함).
- 브라우저 확인: ATTLIST 기본값은 Blink·WebKit에서 관찰로, Gecko는 소스로 "따른다". SMIL `on*`은 셋 다 "따르지 않는다". SMIL `href`는 Blink·WebKit 관찰로 "돈다". 근거·한계는 spec `## 원천 검토`.
- `npm test` exit 0 (1483 tests, fail 0).


## Reviews
*Codex 등 리뷰 실행 시 결과(요약·발견·조치)를 날짜와 함께 남긴다. 남기지 않은 리뷰는 "안 한 것"으로 간주.*
*기계 판독용 마커를 함께 남긴다: `<!-- harness:review kind=codex scope=worktree tip=<sha|none> at=<ISO8601> -->`*


## Learnings

- XML 속성 **이름**·마크업 키워드는 문자 참조를 풀지 않고 속성 **값**은 푼다 — 규칙마다 raw/decoded를 고른다(선언 키워드·이벤트 이름 = raw, `attributeName` 값 = decoded).
- "브라우저가 막는다"는 런타임 가드와 정화기(sanitizer) 가드를 구분해 확인한다 — Blink의 `IsSVGAnimationAttributeSettingJavaScriptURL`은 정화용이라 문서로 연 SVG의 SMIL href를 막지 않는다.

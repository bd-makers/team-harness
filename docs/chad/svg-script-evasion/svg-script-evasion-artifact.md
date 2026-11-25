# svg-script-evasion — Artifact

*최종 결과물과 학습 내용을 기록한다.*

## 결과

- 2026-11-25: `svgSelfContainmentViolations`가 세 갈래를 위반 하나로 거부 — ① DTD 내부 subset 선언(`<!ENTITY` 규칙 흡수, 문구 `DTD 내부 subset 선언`), ② 이벤트 규칙 요소 이름을 `TAG_NAME`으로(`_`·ASCII 밖), ③ SMIL `attributeName`의 `on…`·`href…`(조사 중 실제로 도는 href→`javascript:` 갈래 포함).
- 브라우저 확인: ATTLIST 기본값은 Blink·WebKit에서 관찰로, Gecko는 소스로 "따른다". SMIL `on*`은 셋 다 "따르지 않는다". SMIL `href`는 Blink·WebKit 관찰로 "돈다". 근거·한계는 spec `## 원천 검토`.
- `npm test` exit 0 (1483 tests, fail 0).


## Reviews
*Codex 등 리뷰 실행 시 결과(요약·발견·조치)를 날짜와 함께 남긴다. 남기지 않은 리뷰는 "안 한 것"으로 간주.*
*기계 판독용 마커를 함께 남긴다: `<!-- harness:review kind=codex scope=worktree tip=<sha|none> at=<ISO8601> -->`*

### 2026-11-25T09:52:39.833Z — codex (harness-team review)

- engine: codex · model: default · scope: diff · base: 52671997 · mergeBase: 52671997d545745b1293a309c9a67032ad2675a2 · tip: 979e35295e5d558032945071699e0b8b219cec92 · exit 0 · 1130 B

```text
- **P2 should-fix** — [src/commands/diagram.mjs:119](</Users/chadonpro/Library/Mobile Documents/iCloud~md~obsidian/Documents/para_vault/10_Projects/Harness/harness-aijient-team-plugin/.claude/worktrees/upbeat-blackburn-4fede1/src/commands/diagram.mjs:119>) — The SMIL regex backtracks quadratically on valid whitespace before a quoted `opacity` value. Doubling the padding from 16,000 to 32,000 spaces increased validation time from 515 ms to 1,976 ms.
- **P2 should-fix** — [src/commands/diagram.mjs:119](</Users/chadonpro/Library/Mobile Documents/iCloud~md~obsidian/Documents/para_vault/10_Projects/Harness/harness-aijient-team-plugin/.claude/worktrees/upbeat-blackburn-4fede1/src/commands/diagram.mjs:119>) — Scanning the entire decoded document for `attributeName` rejects valid SVGs that mention `attributeName="href"` in visible text or an ARIA label.

Reviewed the diff against `52671997`. `git diff --check` passed, all four read-only validator tests passed, and the working tree was clean. Integration tests and browser behavior were outside this verification.

**Verdict — Changes requested.** No P1 findings.
```

<!-- harness:review kind=codex scope=diff tip=979e35295e5d558032945071699e0b8b219cec92 at=2026-11-25T09:52:39.833Z -->

**판별 (작성 세션, 2026-11-25)** — base를 `52671997`(이 task 커밋의 부모)로 준 이유: 상위 세션이 이 브랜치를 `claude/agitated-yonath-4fc02c`에 이미 머지해 그 ref 대비 diff가 비었다.

- **P2-1 SMIL 정규식 2차 backtracking — 진짜 결함.** 재현: `attributeName=` 뒤 공백 8000/16000/32000칸 + `"opacity"` → 138/521/2039 ms(배가마다 약 4배). 원인은 `\s*["']?\s*` — 따옴표가 선택이라 두 `\s*`가 공백 덩어리를 나누는 방법이 N가지씩 되짚는다. 선행 task가 고친 끝 정규식 P1과 같은 부류다. 제안: `\s*(?:"\s*|'\s*)?` 처럼 따옴표 뒤에만 공백을 두고 선형 시간 테스트(기존 `긴 공백·끝 주석` 테스트 옆)를 더한다. → **조치(사용자 지시 "Fix P2-1 only")**: `\s*(?:["']\s*)?`로 바꾸고 선형 시간 테스트를 더했다 — 32000칸 2112 ms(실패 확인) → 128000칸 1 ms. `npm test` exit 0 (1484 tests, fail 0).
- **P2-2 텍스트 속 `attributeName="href"` 거부 — 진짜 오탐(거짓 거부)이지만 정책 안.** 재현: `<text>attributeName="href"</text>` → 위반 1개. 이 블록 머리 주석이 "주석·텍스트 안도 본다(보수적 — 오탐 비용은 한 줄 수정)"고 정했고 `url()`·`href` 규칙도 같다. 다만 이벤트 규칙은 "online = …" 오탐 때문에 태그 안으로 좁혔으므로 일관성 논거는 양쪽에 있다. 심각도는 P3로 본다. 좁히려면 원문에서 `<TAG_NAME …attributeName=` 값만 뽑아 `decodeRefs`로 푼 뒤 검사하는 별도 경로가 필요하다(`ALWAYS_BAD` 한 줄로는 안 된다). → 사용자 결정으로 미조치(P2-1만 고침).

## Learnings

- XML 속성 **이름**·마크업 키워드는 문자 참조를 풀지 않고 속성 **값**은 푼다 — 규칙마다 raw/decoded를 고른다(선언 키워드·이벤트 이름 = raw, `attributeName` 값 = decoded).
- "브라우저가 막는다"는 런타임 가드와 정화기(sanitizer) 가드를 구분해 확인한다 — Blink의 `IsSVGAnimationAttributeSettingJavaScriptURL`은 정화용이라 문서로 연 SVG의 SMIL href를 막지 않는다.

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

### 2026-11-25T10:14:17.946Z — codex (harness-team review)

- engine: codex · model: default · scope: diff · base: 52671997 · mergeBase: 52671997d545745b1293a309c9a67032ad2675a2 · tip: e6109edb0ee35d228ffa7fa1e52b3763983725f3 · exit 0 · 2262 B

```text
`e6109edb`는 이전 P2-1의 공백 백트래킹을 해결했습니다. `attributeName=` 뒤 공백 128,000칸을 넣은 기존 사례는 약 1ms에 통과했습니다.

- **P2 should-fix** — SMIL 정규식이 속성 표기처럼 보이는 일반 텍스트를 후보 위치마다 끝까지 다시 훑어, 입력이 44KB → 88KB → 176KB로 늘 때 검증 시간이 123ms → 478ms → 1,961ms로 증가했습니다. [src/commands/diagram.mjs:120](</Users/chadonpro/Library/Mobile Documents/iCloud~md~obsidian/Documents/para_vault/10_Projects/Harness/harness-aijient-team-plugin/.claude/worktrees/upbeat-blackburn-4fede1/src/commands/diagram.mjs:120>)
- **P3 nit** — 기존 SMIL 오탐이 남아 있습니다. 화면에 표시되는 `attributeName="href"` 문자열과 `data-attributeName="href"`도 SMIL 위반으로 거부합니다. [src/commands/diagram.mjs:120](</Users/chadonpro/Library/Mobile Documents/iCloud~md~obsidian/Documents/para_vault/10_Projects/Harness/harness-aijient-team-plugin/.claude/worktrees/upbeat-blackburn-4fede1/src/commands/diagram.mjs:120>)
- **P3 nit** — DTD 규칙은 주석과 CDATA에 예시로 적은 `<!ELEMENT`·`<!NOTATION`도 실제 선언으로 보고 거부합니다. [src/commands/diagram.mjs:115](</Users/chadonpro/Library/Mobile Documents/iCloud~md~obsidian/Documents/para_vault/10_Projects/Harness/harness-aijient-team-plugin/.claude/worktrees/upbeat-blackburn-4fede1/src/commands/diagram.mjs:115>)
- **P3 nit** — `_` 요소에 대한 새 이벤트 규칙은 CDATA에 예시로 적은 `<_x onclick="example"/>`도 실제 태그로 보고 거부합니다. [src/commands/diagram.mjs:110](</Users/chadonpro/Library/Mobile Documents/iCloud~md~obsidian/Documents/para_vault/10_Projects/Harness/harness-aijient-team-plugin/.claude/worktrees/upbeat-blackburn-4fede1/src/commands/diagram.mjs:110>)

`52671997` 대비 `git diff`와 `git diff --check`를 확인했고, 읽기 전용 검증 테스트 5개가 통과했습니다. 세 갈래의 등록 표본은 모두 탐지됐으며, 명령 통합 테스트와 브라우저 실행은 검증하지 않았습니다. 작업 트리는 깨끗합니다.

**최종 판정 — 변경 요청.** P1은 없으며, SMIL 검사에 남은 별도의 2차 성능 저하가 P2입니다.
```

<!-- harness:review kind=codex scope=diff tip=e6109edb0ee35d228ffa7fa1e52b3763983725f3 at=2026-11-25T10:14:17.946Z -->

**판별 (작성 세션, 2026-11-25)** — 리뷰는 상위 brief-diagram 세션이 이 worktree에서 돌렸고(2228ffb9), 판별과 조치는 그 세션의 요청(전하 승인 "둘다")으로 이 세션이 남긴다.

- **앞 P2-1 — 해결 확인.** `e6109edb` 뒤 `attributeName=` 다음 공백 128000칸에 1 ms.
- **P2 SMIL 정규식의 다른 2차 경로 — 진짜 결함.** 재현: `<text>`에 `attributeName=`을 공백 없이 2000/4000/8000번 이어 쓰면 27/105/418 ms(배가마다 약 4배). 원인: 접두사 `(?:[^\s"'<>:]*:)*`의 글자 집합이 `=`를 받아, `attributeName=` 후보마다 덩어리 끝까지 `:`를 찾아 훑는다.
  → **조치**: 접두사 글자에서 `=`를 뺐다(`[^\s"'<>:=]*`). 접두사는 XML 이름이라 `=`를 담지 않으므로 잡는 범위는 같다(`xlink:href:x` 표본 그대로 통과). 회귀 테스트 `공백 없이 이어진 attributeName= 도 선형 시간이다`가 수정 전 406 ms로 3회 모두 실패하는 것을 확인했고(100 ms 단언), 수정 후 64000번 4 ms, `a:` 64000번 1 ms, `attributeName=a:` 32000번 3 ms, 값 200000자 1 ms다. `npm test` exit 0 (1485 tests, pass 1484, fail 0, skipped 1).
- **P3 `data-attributeName="href"`·텍스트 속 `attributeName="href"` 거부 — 앞 P2-2와 같은 사안.** 재현됨. 정책 안(주석·텍스트도 보수적으로 본다)이라 미조치.
- **P3 주석·CDATA 안 `<!ELEMENT`·`<_x onclick="example"/>` 거부 — 오탐이지만 기존 정책.** 재현됨. 기존 `<script`·`<!ENTITY` 규칙도 주석·CDATA 안을 본다(`<!-- <script> -->` 거부 재확인). 미조치.

### 2026-11-26T01:14:45.359Z — codex (harness-team review)

- engine: codex · model: default · scope: diff · base: 52671997 · mergeBase: 52671997d545745b1293a309c9a67032ad2675a2 · tip: 1fb4267ff788eb579cb13bf09729a6369b5fd570 · exit 0 · 1440 B

```text
No P1 or P2 findings in the diff against `52671997`.

- **P3** — [src/commands/diagram.mjs:122](</Users/chadonpro/Library/Mobile Documents/iCloud~md~obsidian/Documents/para_vault/10_Projects/Harness/harness-aijient-team-plugin/.claude/worktrees/upbeat-blackburn-4fede1/src/commands/diagram.mjs:122>) — The conservative SMIL scan also rejects valid SVGs that quote `attributeName="href"` in visible text or use `data-attributeName="href"` as metadata.
- **P3** — [src/commands/diagram.mjs:191](</Users/chadonpro/Library/Mobile Documents/iCloud~md~obsidian/Documents/para_vault/10_Projects/Harness/harness-aijient-team-plugin/.claude/worktrees/upbeat-blackburn-4fede1/src/commands/diagram.mjs:191>) — The SMIL diagnostic echoes the full match without a length limit, so a long value can flood CLI output.
- **P3** — [svg-script-evasion-spec.md:56](</Users/chadonpro/Library/Mobile Documents/iCloud~md~obsidian/Documents/para_vault/10_Projects/Harness/harness-aijient-team-plugin/.claude/worktrees/upbeat-blackburn-4fede1/docs/chad/svg-script-evasion/svg-script-evasion-spec.md:56>) — The spec still shows the earlier SMIL regex, omitting both backtracking fixes now in the implementation.

`git status` showed a clean worktree, `git diff --check` passed, and all six in-memory validator tests passed. No files were modified. CLI integration and browser behavior were outside this verification.

**Verdict — Approve with nits.**
```

<!-- harness:review kind=codex scope=diff tip=1fb4267ff788eb579cb13bf09729a6369b5fd570 at=2026-11-26T01:14:45.359Z -->

**판별 (작성 세션, 2026-11-26)** — P1·P2 없음. 앞 리뷰의 두 P2는 다시 지적되지 않았다.

- **P3 텍스트·`data-attributeName="href"` 거부 — 세 번째 같은 지적.** 앞 판별대로 정책 안이라 미조치.
- **P3 SMIL 위반 문구가 일치 전체를 길이 제한 없이 찍는다 — 진짜지만 이 task가 만든 것이 아니다.** 재현: 값 `href`+5000자 → 문구 5028자. `ALWAYS_BAD` 고리 전체가 `m[1]`을 그대로 찍는 기존 모양이라 `<script`+5000자도 5029자다. `REF_RULES`만 `excerpt()`를 쓴다. 고친다면 고리 한 줄을 `excerpt(m[1])`로 바꾸면 모든 규칙에 맞는다. 미조치(리뷰만 요청).
- **P3 spec `## 설계 / 접근`의 SMIL 정규식이 옛 모양 — 진짜(문서 드리프트).** spec 56행은 `\s*["']?\s*`·`[^\s"'<>:]*`를 그대로 보여 준다. 두 backtracking 수정이 코드·plan·artifact에만 있다. 미조치(리뷰만 요청).
- **3차 P3 두 건 조치 (2026-11-26, 사용자 지시).** 위반 문구: `ALWAYS_BAD` 고리를 `excerpt(m[1])`로 바꾸고, 같은 결함이 있던 태그 구조 문구(`</x> 가 <y> 를 닫음`·`<x> 가 닫히지 않음`)의 태그 이름도 `excerpt`로 자른다. 테스트 `위반 문구는 일치 값·태그 이름을 60자로 자른다`가 SMIL·이벤트·태그 구조 두 갈래를 덮고, 고리 수정을 되돌리면 실패한다(변이 확인). spec `## 설계 / 접근`의 SMIL 정규식을 지금 코드와 같게 고쳤다. 텍스트·`data-attributeName` 오탐은 앞 결정대로 미조치.

## Learnings

- XML 속성 **이름**·마크업 키워드는 문자 참조를 풀지 않고 속성 **값**은 푼다 — 규칙마다 raw/decoded를 고른다(선언 키워드·이벤트 이름 = raw, `attributeName` 값 = decoded).
- "브라우저가 막는다"는 런타임 가드와 정화기(sanitizer) 가드를 구분해 확인한다 — Blink의 `IsSVGAnimationAttributeSettingJavaScriptURL`은 정화용이라 문서로 연 SVG의 SMIL href를 막지 않는다.

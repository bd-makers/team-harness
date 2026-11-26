# svg-script-evasion — Artifact

*최종 결과물과 학습 내용을 기록한다.*

## 결과

- 2026-11-25: `svgSelfContainmentViolations`가 세 갈래를 위반 하나로 거부 — ① DTD 내부 subset 선언(`<!ENTITY` 규칙 흡수, 문구 `DTD 내부 subset 선언`), ② 이벤트 규칙 요소 이름을 `TAG_NAME`으로(`_`·ASCII 밖), ③ SMIL `attributeName`의 `on…`·`href…`(조사 중 실제로 도는 href→`javascript:` 갈래 포함).
- 브라우저 확인: ATTLIST 기본값은 Blink·WebKit에서 관찰로, Gecko는 소스로 "따른다". SMIL `on*`은 셋 다 "따르지 않는다". SMIL `href`는 Blink·WebKit 관찰로 "돈다". 근거·한계는 spec `## 원천 검토`.
- `npm test` exit 0 (1483 tests, fail 0).

- 2026-11-26: 3차 리뷰 P3 둘 반영 — 위반 문구의 일치 값·태그 이름을 60자로 자른다(`1a9069ea`), spec SMIL 정규식을 코드와 맞춘다. 긴 닫는 태그 이름 표본은 `5232c42d`(task `diagram-svg-wellformed` 리뷰).

### Ship (2026-11-26, base `52671997`, tip `b2045ef8` + 이 ship 커밋)
- **검증**: `npm test` → `ℹ tests 1485` · `ℹ pass 1484` · `ℹ fail 0` · `ℹ skipped 1`(`CI에서는 jq-present 매트릭스가 반드시 실행된다 # SKIP`, 로컬 전용 건너뜀) · `exit 0`. 이 task의 테스트 줄:
  - `✔ svgSelfContainmentViolations: 규칙마다 위반 표본이 그 규칙 하나만 건다`
  - `✔ svgSelfContainmentViolations: 허용되는 비슷한 것들을 모은 SVG 는 통과한다`
  - `✔ svgSelfContainmentViolations: attributeName 뒤 긴 공백도 선형 시간이다 (svg-script-evasion codex P2-1)`
  - `✔ svgSelfContainmentViolations: 공백 없이 이어진 attributeName= 도 선형 시간이다 (svg-script-evasion codex 재리뷰 P2)`
  - `✔ svgSelfContainmentViolations: 위반 문구는 일치 값·태그 이름을 60자로 자른다 (svg-script-evasion codex 3차 P3)`
- **diff 범위**: `52671997...HEAD`에는 같은 브랜치의 task `diagram-svg-wellformed` 커밋이 섞여 있다 — 문서 커밋(`031ccf33`·`5b813238`·`5d9ef4d2`·`5ca10393`·`b2045ef8`), `5232c42d`(테스트 표본 한 줄), `babf703d`(그 task 리뷰 3차 P3 — `CHANGELOG.md` Fixed 줄·테스트 주석, 사유는 그 task artifact). 그 task의 기록이며 이 task의 범위 밖이다.
- **다이어그램**: 건너뜀(사용자 선택). plan에 다이어그램 단계가 없어 `diagram record`로 닫을 단계도 없다.
- **리뷰**: 이 task의 `## Reviews`에 codex 3회(`979e3529`·`e6109edb`·`1fb4267f`)와 claude-shipcheck 1회가 마커·판별과 함께 있다. 이 task의 수정 `1a9069ea`를 대상으로 한 codex 리뷰(Approve, P3 하나 → `5232c42d`)는 활성 task가 `diagram-svg-wellformed`일 때 돌아 그 task의 artifact·meta에 기록됐다(마커 `kind=codex tip=1a9069ea…`).
- **남은 리스크**: 글자 속 `attributeName="href"`·`data-attributeName="href"` 거짓 거부(정책 안). Gecko는 소스로만 확인(실행 안 함). 이 브랜치는 미머지 `claude/brief-diagram-svg-embed-0f4251` 위에 있어 그 브랜치가 먼저 머지돼야 한다. `[사람] spec 검토 승인` 미체크.

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

### 2026-11-26T14:05:29.486Z — claude-shipcheck (harness-team review)

- engine: claude · model: default · scope: diff · base: 52671997 · mergeBase: 52671997d545745b1293a309c9a67032ad2675a2 · tip: 9aff3e656ae8270d4638d4dd222c0482804683ff · exit 0 · 4711 B

```text
전하, **판정: 다섯 항목 모두 pass이고 fail은 없습니다.** 막는 문제는 없으며, 아래에 문서 부정확성 둘을 따로 적었습니다.

| id | 항목 | 심각도 | 판정 | 근거 |
|---|---|---|---|---|
| S1 | spec 요구사항마다 대응 구현이 있다 | BLOCKER | pass | **갈래 1**: spec 57행의 `/(<!(?:ENTITY\|ATTLIST\|ELEMENT\|NOTATION))\b/i`(raw, `DTD 내부 subset 선언`)가 diff에 그대로 있고 옛 `<!ENTITY` 규칙을 대신합니다. **갈래 2**: `<[a-z][\w:.-]*` → `<${TAG_NAME}`로 바뀌었고 `TAG_NAME` 정의가 `ALWAYS_BAD` 위로 올라갔습니다. **갈래 3과 href**: spec 57행의 SMIL 정규식과 코드가 글자 단위로 같고, source를 지정하지 않아 문자 참조를 푼 글(decoded)에서 찾습니다. **60자 자르기**: `excerpt(m[1])`, `` `</${excerpt(close)}> 가 <${excerpt(stack.at(-1))}> 를 닫음` ``. **문서 쪽**: CHANGELOG `### Changed`·`### Fixed`, `commands/harness-diagram.md` 6번 단계(62–88행)에 76행 한 줄. **Out 범위**: 호출부(`record`·`brief`·`pr-check`)는 diff에 없고, 오탐은 spec 23행에 "정책 안, 미조치"로 적혀 있습니다. |
| S2 | plan `- [x]` 항목마다 커밋이 실재한다 | MAJOR | pass | **1차 자료·실패 테스트·규칙·CHANGELOG·doc**: `979e3529`(spec, tests, src, CHANGELOG, harness-diagram.md). **P2-1**: `e6109edb`. **재리뷰 P2**: `1fb4267f`. **3차 P3**: `1a9069ea`(src, tests, spec, CHANGELOG)와 `5232c42d`(`<g></g${long}>` 한 줄). **ship**: `9aff3e65`. 미체크 두 줄(`[사람] spec 검토 승인`, `ship 완료`)은 미완 상태 그대로입니다. 다만 "실패 테스트를 먼저 썼다"는 순서는 같은 커밋이라 git으로 확인할 수 없습니다. |
| S3 | 이 task의 스코프 밖 변경이 diff에 없다 | MAJOR | pass | 이 task 커밋 다섯 개(`979e3529`·`e6109edb`·`1fb4267f`·`1a9069ea`·`9aff3e65`)는 모두 spec 21–22행 In 범위의 파일만 건드립니다. 태그 구조 문구 자르기는 spec 22행에 "리뷰로 넓어진 것"으로 기록돼 있습니다. merge 5개는 `git show --remerge-diff` 출력이 비어 손으로 고친 흔적이 없습니다. |
| S4 | 실행된 리뷰가 전부 `## Reviews`에 마커와 함께 기록돼 있다 | MAJOR | pass | codex 3회(tip `979e3529`·`e6109edb`·`1fb4267f`)가 각각 `<!-- harness:review kind=codex … -->` 마커와 판별을 갖고 있고, `svg-script-evasion-meta.json`의 `reviews` 3건과 tip이 일치합니다. |
| S5 | 검증 결과가 실제 명령·출력 인용이다 | BLOCKER | pass | artifact 14–19행은 `ℹ tests 1485`·`ℹ pass 1484`·`ℹ fail 0`·`ℹ skipped 1`·`exit 0`과 ✔ 다섯 줄을 출력 그대로 인용합니다. 제가 HEAD에서 `npm test`를 다시 돌린 결과 `exit 0`, `ℹ tests 1485`/`pass 1484`/`fail 0`/`skipped 1`, 성능 테스트 묶음(perf suite) `tests 1`/`pass 1`이 나왔습니다. 인용한 ✔ 다섯 줄과 `# SKIP` 테스트 이름도 로그에 그대로 있습니다. |

**판정에는 영향이 없지만 고칠 만한 문서 부정확성 (MINOR)**
1. **diff 범위 설명에서 `babf703d`가 빠졌습니다** (artifact 20행). 이 커밋은 다른 task(`diagram-svg-wellformed`) 소속인데 문서 폴더 밖인 `CHANGELOG.md`의 Fixed 줄과 테스트 주석도 바꿔서, `52671997` 대비 diff에 보입니다. 그 task의 artifact 314행에는 사유가 기록돼 있습니다.
2. **"리뷰: codex 3회"가 실제보다 적습니다** (artifact 22행). 이 task의 수정 커밋 `1a9069ea`를 대상으로 한 codex 리뷰(Approve, P3 하나)가 한 번 더 있었습니다. 마커와 함께 기록됐지만 `diagram-svg-wellformed` artifact 230행에 있고, 이 task의 `## Reviews`와 meta.json에는 없습니다.

**검증하지 못한 것:** Gecko 동작은 spec 자체가 소스로만 확인했다고 적고 있고, 브라우저에서 직접 실행해 보지는 않았습니다. 중간 기록의 테스트 수(1483→1484→1485)는 테스트 선언 수 변화(+0/+1/+1, 그 뒤 `1a9069ea`에서 +1)와 맞지 않아 과거 수치 하나가 1 어긋나 보입니다. 다른 worktree에서 잰 과거 값이라 다시 확인할 수 없고, 현재 Ship 수치는 재실행으로 맞음을 확인했습니다.

지시대로 저장소는 아무것도 바꾸지 않았습니다. `npm test`는 임시 HOME에서 돌았고 실행 뒤 `git status`는 깨끗합니다. 테스트 로그는 `/private/tmp/claude-501/-Users-chadonpro-Library-Mobile-Documents-iCloud-md-obsidian-Documents-para-vault-10-Projects-Harness-harness-aijient-team-plugin--claude-worktrees-agitated-yonath-4fc02c/63b34f75-b5ae-466d-b9a4-744376db1fba/scratchpad/npmtest.log`에 있습니다.
```

<!-- harness:review kind=claude-shipcheck scope=diff tip=9aff3e656ae8270d4638d4dd222c0482804683ff at=2026-11-26T14:05:29.486Z -->

**판별 (작성 세션, 2026-11-26)** — S1–S5 pass, BLOCKER·MAJOR fail 없음.

- **MINOR 1 `babf703d` 누락 — 진짜.** `git show --stat babf703d`가 `CHANGELOG.md`·`tests/diagram-command.test.mjs`를 건드린다. Ship 절 diff 범위에 더했다.
- **MINOR 2 리뷰 횟수 — 진짜.** `1a9069ea` 대상 codex 리뷰가 `diagram-svg-wellformed` artifact(마커 `tip=1a9069ea…`)에 있다. Ship 절 리뷰 줄에 위치와 함께 적었다. meta는 손으로 고치지 않는다.
- 테스트 수 1483→1485 어긋남: 과거 수치라 재현 불가, 현재 수치는 검증자 재실행과 일치 — 미조치.

## Learnings

- XML 속성 **이름**·마크업 키워드는 문자 참조를 풀지 않고 속성 **값**은 푼다 — 규칙마다 raw/decoded를 고른다(선언 키워드·이벤트 이름 = raw, `attributeName` 값 = decoded).
- "브라우저가 막는다"는 런타임 가드와 정화기(sanitizer) 가드를 구분해 확인한다 — Blink의 `IsSVGAnimationAttributeSettingJavaScriptURL`은 정화용이라 문서로 연 SVG의 SMIL href를 막지 않는다.

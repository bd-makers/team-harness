# diagram-svg — Artifact

*최종 결과물과 학습 내용을 기록한다.*

## 결과

- 뷰 산출물을 단독 SVG `<name>-diagram-<view>.svg`로 바꿨다(`diagramKind`, 결정 A2-1). 레거시 `<name>-diagram.html`은 그대로다.
- `diagram record --view <v>`(생성 기록)가 SVG 자립성을 검사한다 — `svgSelfContainmentViolations`(`src/commands/diagram.mjs`). 허용 목록 방식:
  `href`·`url()`은 `#id`·`data:`·빈 값만, `<script`·`<foreignObject`(접두사·대소문자)·태그 안 `on…=`·`@import`는 위반, 루트는 prolog 뒤 `<svg`이고
  `xmlns="http://www.w3.org/2000/svg"`. 위반이면 exit 1, error 패킷 `root_cause`에 위반 목록, artifact·plan 쓰지 않음. `--skipped`·레거시는 검사하지 않는다.
- `pr-check`: 레거시 HTML이나 뷰 SVG가 있으면 권장 안내 없음, 있는 뷰 SVG마다 `PR 본문에 링크: <path>.svg` note(막지 않음). 뷰 HTML·모르는 뷰는 세지 않는다.
- `clean` `TASK_FILE` 확장자에 `svg`.
- 문서: harness-task 옵트인 절(정본 — 뷰 경로·단독 SVG·기록 시 검사), harness-diagram 6단계(단독 SVG 제약·system font stack·외부 자산 0·추출 금지)·7단계(검사),
  script 뷰어 예외를 레거시로 한정(A1이 남긴 `record --view … "Confluence … script 실행됨"` 예시 삭제 — 검사와 모순), harness-ship 6단계 "PR 본문에 SVG 링크"
  (PR head의 파일 URL)·8단계, SKILL, templates/docs/README, CLI `diagram` summary. CHANGELOG `[Unreleased]`: A1 항목을 `.svg`로 고쳐 쓰고 A2 항목 추가.
- 렌더 실측: Obsidian·GitLab self-managed 모두 미검증(spec R1·참고). 문서 근거만 — Obsidian 지원 형식 Images에 `.svg`(`gh api`로 `obsidianmd/obsidian-help` 확인).
- 검증(2026-11-18): 아래 명령과 출력.
  - `node scripts/test-isolated.mjs --test tests/diagram-command.test.mjs` → pass 37 fail 0. pr-check 24/0, clean 27/0, agent-files 44/0.
  - 검사 함수 변이 6개(http 허용·레거시도 검사·`@import` 규칙 삭제·xmlns 검사 삭제·주석 prolog 삭제·참조 위반 push 삭제)를 손으로 넣어 돌림 → 각각 fail 3·7·2·2·1·3(모두 잡힘), 소스 복원 `cmp` 확인.
  - `npm test` → exit 0 — 본 스위트 tests 1362 · pass 1361 · fail 0 · skipped 1(1차 커밋 기준). codex 1차 반영 뒤 재실행: tests 1364 · pass 1363 · fail 0 · skipped 1(`CI에서는 jq-present 매트릭스가 반드시 실행된다` — CI 전용 기존 skip), perf 1/1.
  - `npm run docs:check` → "harness overview 생성 상태가 최신입니다."
  - `node bin/harness-team.mjs doctor` → 1 warning(`.codex/hooks.json` 신뢰 없음 — 이 머신의 Codex 훅 승인 상태, 이 변경과 무관).

## Reviews
*Codex 등 리뷰 실행 시 결과(요약·발견·조치)를 날짜와 함께 남긴다. 남기지 않은 리뷰는 "안 한 것"으로 간주.*
*기계 판독용 마커를 함께 남긴다: `<!-- harness:review kind=codex scope=worktree tip=<sha|none> at=<ISO8601> -->`*

- 2026-11-18 자체 점검(AGENTS.md 코드 리뷰 기준 6항목, 작성 세션 — 독립 리뷰 아님):
  - 정확성: spec 설계 절과 일치 — 검사는 `outcome === 'produced' && view`에서만, 존재 검사 뒤·쓰기 전. 링크 note는 뷰 SVG만.
  - 엣지 케이스: BOM·XML 선언·주석·DOCTYPE(외부 DTD URI) prolog, 대소문자·접두사·따옴표 없음·`=` 주변 공백, 빈 파일, HTML 루트, 자식에만 xmlns, 이미 닫힌 단계의 갱신 — 테스트 표본.
  - 회귀: 레거시 HTML(스크립트 포함)·`--skipped`는 검사하지 않음을 테스트로 고정. 뷰 HTML은 미릴리스 형식이라 교체(spec R1).
  - 보안: 파일 읽기만 추가, 경로는 기존 `DIAGRAM_VIEWS` 검사 뒤 조립. 정규식은 역추적 폭발 구조가 없다고 본다(추론 — 큰 입력으로 재지 않음: prolog `*`는 실패 경로가 없고 나머지는 태그 단위 스캔).
  - 단순성: 파서·의존성 없이 문자열 규칙 표 두 개. 알려진 한계: 주석 안도 검사(보수적 오탐), 속성 값 안의 `>`는 태그 경계로 본다.
  - 테스트: 규칙마다 위반 표본이 그 규칙 **하나만** 걸리는지 + 비슷한 허용 표본 통과 — 규칙을 지우거나 넓히면 깨진다(위 변이 결과).

### 2026-11-18T12:06:32.445Z — codex (harness-team review)

- engine: codex · model: default · scope: diff · base: origin/main · mergeBase: 74aa5bb2d7782d92511eae17553bf0c80ec1e9e4 · tip: 724ec0af1d78376c74a7a2fb358458a758a493ca · exit 0 · 3849 B

```text
## 리뷰 결과

- **P1 · 깨진 SVG가 생성으로 기록됩니다.** 시작 태그만 검사하므로 닫히지 않은 `<svg xmlns="…">`도 통과하고, `record --view`가 artifact에 생성 기록을 남기고 plan 단계를 닫습니다. [diagram.mjs:115](</Users/chadonpro/Library/Mobile Documents/iCloud~md~obsidian/Documents/para_vault/10_Projects/Harness/harness-aijient-team-plugin/.claude/worktrees/diagram-svg-183386/src/commands/diagram.mjs:115>)
- **P2 · 외부 참조 미탐.** `fill="u&#114;l(paint.svg#g)"`는 XML에서 외부 파일을 가리키는 `url(paint.svg#g)`로 해석되지만 검사를 통과합니다. [diagram.mjs:107](</Users/chadonpro/Library/Mobile Documents/iCloud~md~obsidian/Documents/para_vault/10_Projects/Harness/harness-aijient-team-plugin/.claude/worktrees/diagram-svg-183386/src/commands/diagram.mjs:107>)
- **P2 · 이벤트 속성 미탐.** `aria-label="A > B"` 뒤에 있는 `onload`는 정규식이 따옴표 안의 `>`를 태그 끝으로 처리해 검사를 통과합니다. [diagram.mjs:102](</Users/chadonpro/Library/Mobile Documents/iCloud~md~obsidian/Documents/para_vault/10_Projects/Harness/harness-aijient-team-plugin/.claude/worktrees/diagram-svg-183386/src/commands/diagram.mjs:102>)
- **P2 · 정상 SVG 오탐.** `href="&#35;g"`는 문서 내부 참조 `#g`로 해석되는데 외부 참조로 거부되고, `<text>url(example.png)</text>`도 화면에 표시할 문자열인데 외부 자산으로 거부됩니다. [diagram.mjs:125](</Users/chadonpro/Library/Mobile Documents/iCloud~md~obsidian/Documents/para_vault/10_Projects/Harness/harness-aijient-team-plugin/.claude/worktrees/diagram-svg-183386/src/commands/diagram.mjs:125>)
- **P2 · `pr-check`가 검증에 실패한 SVG도 링크로 안내합니다.** 동일 뷰를 `--skipped`로 기록해도 실패한 `.svg`가 커밋에 남아 있으면 `PR 본문에 링크`가 출력됩니다. [pr-check.mjs:92](</Users/chadonpro/Library/Mobile Documents/iCloud~md~obsidian/Documents/para_vault/10_Projects/Harness/harness-aijient-team-plugin/.claude/worktrees/diagram-svg-183386/src/commands/pr-check.mjs:92>)
- **P2 · 하위 디렉터리에서 실행하면 링크 경로가 틀립니다.** 링크 note에 `targetDir` 기준 경로를 그대로 출력하므로, 모노레포에서 이를 저장소 루트 기준 blob URL로 바꾸면 패키지 경로가 빠집니다. [pr-check.mjs:64](</Users/chadonpro/Library/Mobile Documents/iCloud~md~obsidian/Documents/para_vault/10_Projects/Harness/harness-aijient-team-plugin/.claude/worktrees/diagram-svg-183386/src/commands/pr-check.mjs:64>)
- **P3 · 스크립트 예외의 적용 범위가 문서마다 다릅니다.** Codex 스킬은 뷰 SVG 설명 직후 스크립트 예외를 형식 구분 없이 안내하고, 명령 문서는 레거시 HTML에만 허용합니다. [SKILL.md:29](</Users/chadonpro/Library/Mobile Documents/iCloud~md~obsidian/Documents/para_vault/10_Projects/Harness/harness-aijient-team-plugin/.claude/worktrees/diagram-svg-183386/skills/harness-diagram/SKILL.md:29>) · [harness-diagram.md:82](</Users/chadonpro/Library/Mobile Documents/iCloud~md~obsidian/Documents/para_vault/10_Projects/Harness/harness-aijient-team-plugin/.claude/worktrees/diagram-svg-183386/commands/harness-diagram.md:82>)

`record --view`의 검사 위치는 파일 존재 확인 후, artifact와 plan 쓰기 전으로 적절합니다. 파일은 수정하지 않았습니다. `git status`, `git diff`, `git diff --check`를 확인했고, 읽기 전용 테스트 3개와 문서 검사, `pr-check --base origin/main`이 통과했습니다. SVG 미탐·오탐은 메모리에서 별도로 재현했습니다. 전체 테스트와 뷰어 렌더링은 실행하지 않았습니다.

**최종 판정 · 병합 보류.** 깨진 SVG로 완료 기록을 남길 수 있는 P1을 수정해야 합니다.
```

<!-- harness:review kind=codex scope=diff tip=724ec0af1d78376c74a7a2fb358458a758a493ca at=2026-11-18T12:06:32.445Z -->

판별·조치(2026-11-18, 작성 세션이 표본으로 재현):
- P1 닫히지 않은 SVG 통과 — 진짜. 파일 끝(공백·주석 제외)이 `</svg>`이거나 루트가 스스로 닫혀야 한다. 테스트 `잘린 파일`.
- P2 `u&#114;l(…)` 미탐 — 진짜. 숫자 문자 참조·`&amp;`를 풀어서 검사한다(`&lt;`는 풀지 않음 — 텍스트의 글자). 테스트 2행 + 허용 표본 `&#35;g`·`url(&#x23;g)`.
- P2 따옴표 안 `>` 뒤 `onload` 미탐 — 진짜. 이벤트 속성 정규식이 따옴표 값을 통째로 건너뛴다. 테스트 `따옴표 안 > 뒤의 이벤트 속성`.
  같은 문법의 형제: DTD 내부 엔티티(`&x;`로 참조를 숨김)도 위반으로 추가(`DTD 엔티티`).
- P2 오탐 `href="&#35;g"` — 진짜, 위 디코드로 해결. `<text>url(example.png)</text>` 오탐 — 수용. 텍스트와 CSS를 가르려면 파서가 필요하고,
  보수적 검사의 비용은 한 줄 수정이다(spec R1·코드 주석·CHANGELOG에 명시).
- P2 pr-check가 검사 실패 SVG를 링크 — 진짜. 커밋된 내용을 같은 검사로 보고, 걸리면 링크 대신 `뷰 SVG 가 자립형이 아님 — 링크하지 않음` note(막지 않음).
- P2 하위 디렉터리 설치의 링크 경로 — 진짜. `repoPrefix`(rev-parse --show-prefix) 접두를 붙인다. 테스트 `하위 디렉터리 설치`.
- P3 SKILL의 script 예외 범위 — 진짜. 레거시 HTML 한정·뷰 SVG 예외 없음으로 고쳤다.
- 변이 4개(디코드 제거·닫힘 검사 제거·옛 이벤트 정규식·엔티티 규칙 제거) → 각각 fail 3·2·2·2.

## Learnings

- 설계가 열거한 거부 목록(http/https/`//`)을 그대로 옮기면 같은 문법의 형제(상대 경로·`javascript:`·`url(//…)`)가 샌다 — 자립성처럼 "밖으로 나가지 않는다"는 성질은 허용 목록으로 검사한다.
- 형식을 바꾸면 그 형식에 붙어 있던 예외 문장(A1의 script 뷰어 예시)이 새 검사와 모순될 수 있다 — 같은 사실의 다른 자리를 전수 검색할 때 예시·예외도 본다.

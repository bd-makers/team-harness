# brief-diagram-svg-embed — Artifact

*최종 결과물과 학습 내용을 기록한다.*

## 결과
- 검토 승인: 2026-11-25 · 슬라이드 docs/chad/brief-diagram-svg-embed/brief-diagram-svg-embed-brief.html
- `src/commands/brief.mjs`: `renderBrief(spec, { diagrams })` 선택 두 번째 인자 — 뷰마다 data URI `<img>` 그림 슬라이드를 `## 설계` 절의 마지막 슬라이드 뒤에(없으면 마지막 spec 절 뒤) 넣는다. 그림 CSS는 뷰가 있을 때만 붙인다. `runBrief`는 `DIAGRAM_VIEWS`마다 `<name>-diagram-<view>.svg`를 읽어 `svgSelfContainmentViolations`로 거르고, 콘솔 한 줄·`--json` `diagrams`(embedded|missing|rejected)로 보고한다. "렌더할 절이 없음"은 뷰를 뺀 슬라이드 수로 판정한다.
- `tests/brief-command.test.mjs`: 0.58.4 바이트 고정(sha256)·순서/위치·설계 없음 대체 위치·새 사실 0·외부 자산 0(허용 목록에 figure·img·alt, src는 SVG data URI만)·결정론·전체 repo spec에 뷰 실음·CLI rejected/missing/레거시 HTML 무시/뷰만 있으면 exit 1.
- 문서: `src/cli-args.mjs` brief summary, `commands/harness-task.md`·`commands/harness-diagram.md` 한 줄, CHANGELOG `[Unreleased]`(minor, 범프는 release 단계).
- 리뷰 반영: 뷰 경로 읽기 실패는 그 뷰만 `rejected`(`읽기 실패: <code>`)로 빼고 brief는 성공한다(codex 1차 P2).
- 검증:
  - `npm test` exit 0 — 리뷰 반영 후 `ℹ tests 1479` · `ℹ pass 1478` · `ℹ fail 0`(skip 1, 기존) + perf `ℹ tests 1` · `ℹ pass 1`. `npm run docs:check` → "harness overview 생성 상태가 최신입니다."
  - 기준선 `88b859e7`의 `src/`는 명세의 `72c86803`과 같다(`git diff --stat 72c86803 88b859e7 -- src/` 빈 출력).
  - 0.58.4 대비 바이트 비교: `git archive 88b859e7 src`를 세션 scratchpad `base/`에 풀고, 같은 스크립트(`baseline.mjs` — 저장소의 모든 `docs/<user>/<task>/<task>-spec.md`를 `renderBrief(spec).html`로 렌더해 한 파일로 이어 씀)를 옛·새 모듈에 각각 돌린 뒤 `cmp base-all.txt new-all.txt && echo CMP-OK-198-specs` → 출력 `198` / `CMP-OK-198-specs`(exit 0). 테스트 fixture `SPEC`은 옛 모듈 sha256 `4e4a0e4b…393b`(4146 B)로 `tests/brief-command.test.mjs`에 고정.
  - 수동(임시 저장소 `git init` + `harness-team task demo --no-review-gate`, 뷰 SVG 2개):
    - `diagram record --view sequence` → `✓ diagram record: … - 다이어그램: docs/tester/demo/demo-diagram-sequence.svg 생성 (2026-11-25)`, module도 같음.
    - `harness-team brief` → `✓ brief: docs/tester/demo/demo-brief.html 에 슬라이드 6장 (spec 절 + 뷰 SVG 2장 — 새 사실 0)` / `뷰 SVG: sequence 실림 · module 실림`.
    - 브라우저(내장, `python3 -m http.server`로 127.0.0.1 서빙, 뷰포트 1280×800): 슬라이드 순서 JS 조회 `[demo — Spec, 목적 / 요구사항, 설계 / 접근, 세부, img(alt …-diagram-sequence.svg, complete true), img(alt …-diagram-module.svg, complete true), Ontology]`, 그려진 크기 `{w:1075,h:455}`·`{w:1075,h:410}`. `read_console_messages(onlyErrors)` → `No console logs.`, `read_network_requests` → `GET http://127.0.0.1:8765/demo-brief.html → 200 OK` 한 건.
    - module에 `<script>alert(1)</script>` 삽입 후 `brief` → `뷰 SVG: sequence 실림 · module 거부(스크립트 요소: script)`, `exit=0`; `--json` → `success` · `[{"view":"sequence",…,"status":"embedded"},{"view":"module",…,"status":"rejected","violations":["스크립트 요소: script"]}]`; `grep -c "<script"` → `0`, `<figure>` → `1`.
- 묻지 않고 내린 결정: alt에는 뷰 이름을 포함한 repo 상대 경로만 둔다. 그림 슬라이드 제목(`titles`·JSON `sections`)은 `diagram:<view>`. 그림 `<img>`에 흰 바탕을 둔다(투명 SVG가 어두운 테마에서 묻히지 않게). 뷰가 없을 때도 콘솔에 `뷰 SVG: … 없음` 한 줄을 낸다.


### 남은 리스크·후속
- 태그 짝이 틀린 SVG는 자립성 검사를 통과해 `embedded`로 실리고 깨진 그림이 된다 — `diagram record`·brief 공통 well-formedness 검사 후속(별도 세션에서 진행 중).
- 실제 다이어그램 스킬 산출 SVG·kc-task-brief 래퍼로는 확인하지 않았다(래퍼는 인자 하나 바이트 동일성으로만 보장).
- 범위 밖 후속(하지 않음): state·class 뷰, mermaid 펜스 info string 보존, kc-task-brief 칸 7 정리. 버전 범프는 release 단계.
- 다이어그램: ship에서 건너뜀(사용자 선택, 옵트인 단계 없음).

## Reviews
*Codex 등 리뷰 실행 시 결과(요약·발견·조치)를 날짜와 함께 남긴다. 남기지 않은 리뷰는 "안 한 것"으로 간주.*
*기계 판독용 마커를 함께 남긴다: `<!-- harness:review kind=codex scope=worktree tip=<sha|none> at=<ISO8601> -->`*

### 2026-11-25T05:05:54.805Z — codex (harness-team review)

- engine: codex · model: default · scope: diff · base: refs/remotes/origin/main · mergeBase: 88b859e76fe6f4d2ab5b9777b6f62cf802fe76d6 · tip: 2656f746d419db8faee7a636b28861257e242b7e · exit 0 · 1084 B

```text
## Findings

- **P2 · [src/commands/brief.mjs:466](<src/commands/brief.mjs:466>)** — If an optional SVG is a directory or disappears after the existence check, `readFile` aborts the entire brief and `--json` emits no result.
- **P2 · [src/commands/brief.mjs:467](<src/commands/brief.mjs:467>)** — The reused validator accepts SVG with mismatched child tags, so `brief` reports `embedded` for an image the browser cannot render.
- **P3 · [brief-diagram-svg-embed-spec.md:26](<docs/chad/brief-diagram-svg-embed/brief-diagram-svg-embed-spec.md:26>)** — Four settled decisions still carry `(unresolved)` markers, so the generated brief repeats them on its open-items slide.

**Verification** — Reviewed `git status` and `git diff` against `refs/remotes/origin/main`. All 21 read-only tests passed, and all 198 one-argument renders matched the baseline byte for byte. In-memory checks confirmed both P2 findings. The full suite and disk-writing CLI fixtures were outside this read-only run. The worktree remained clean.

**Verdict — Request changes for the two P2 findings.**
```

<!-- harness:review kind=codex scope=diff tip=2656f746d419db8faee7a636b28861257e242b7e at=2026-11-25T05:05:54.805Z -->

판별·조치(2026-11-25):
- P2 읽기 실패가 brief 전체를 중단 — **진짜 결함**(`EISDIR`로 재현). `runBrief`가 읽기 오류를 그 뷰의 `rejected`(`읽기 실패: <code>`)로 보고하고 계속한다. 회귀 테스트 `뷰 경로를 읽을 수 없으면(디렉터리)…` 추가.
- P2 자립성 검사가 잘못 짝지은 태그를 통과시킴 — **범위 밖**. `svgSelfContainmentViolations`는 `diagram record --view`와 공유하는 검사이고, 시그니처·동작을 바꾸지 않는 것이 이 task의 보존 조건이다. 이 경우 brief는 깨진 그림 한 장을 싣지만 script·외부 자산·새 사실 계약은 지켜진다. well-formedness 검사는 record·brief 공통 후속으로 남긴다.
- P3 결정된 R1 항목의 `(unresolved)` 표기가 열린 항목 슬라이드에 남음 — **의도된 동작**. R1 규약은 `(unresolved) … → 결정: …`을 남기고 `검토 완료`로 닫으며, brief는 그 항목을 검토자가 승인하도록 다시 보인다(기존 테스트 SPEC의 `발견` 항목과 같다).

### 2026-11-25T05:17:42.066Z — codex-shipcheck (harness-team review)

- engine: codex · model: default · scope: diff · base: refs/remotes/origin/main · mergeBase: 88b859e76fe6f4d2ab5b9777b6f62cf802fe76d6 · tip: f3e16635235d6035295c1868d7193f4855ee84e3 · exit 0 · 2999 B

```text
`refs/remotes/origin/main`(`88b859e7`) 대비 `HEAD`(`f3e16635`)의 3개 커밋과 12개 변경 파일을 확인했습니다. `git status --short --branch`에는 브랜치명만 출력됐고, `git diff --check`는 exit 0이었습니다. 파일은 수정하지 않았습니다.

| ID | 항목 | 심각도 | 판정 | 근거 |
|---|---|---|---|---|
| S1 | spec 요구사항과 구현 일치 | BLOCKER | **fail** | spec 33행은 “읽기 실패(디렉터리·경합 삭제·권한) … `rejected`”를 요구합니다. diff는 `if (!(await exists(path)))`에서 먼저 `missing`으로 분류합니다. `exists`는 `stat`의 모든 오류를 `catch { return false; }`로 처리하므로, 이 단계에서 권한 오류가 발생하면 `rejected`와 오류 코드가 누락됩니다. |
| S2 | plan 완료 항목의 변경·커밋 근거 | MAJOR | **na** | 구현·테스트·CLI 문서는 `2656f746`, 읽기 실패 처리·리뷰 기록은 `3acad236`, 검증 기록은 `f3e16635`에 대응합니다. 다만 plan 7행의 “2026-11-25 대화에서 승인”은 `commands/harness-task.md` 135행이 요구하는 `검토 승인: <YYYY-MM-DD> · 슬라이드 <경로\|없음>` 기록이 artifact에 없어 확인할 수 없었습니다. |
| S3 | 스코프 밖 변경 여부 | MAJOR | **pass** | 기능 변경은 spec의 `In`에 열거된 6개 파일에 한정됩니다. 나머지는 같은 task의 문서·메타데이터·brief HTML입니다. HTML 커밋 근거는 `commands/harness-task.md` 129행의 “검토한 시점의 스냅샷이라 task 문서와 함께 커밋한다”입니다. |
| S4 | 실행된 리뷰와 마커 기록 | MAJOR | **pass** | 확인 가능한 기존 리뷰 1건은 meta의 `"scope": "diff"`, `"tip": "2656f746…"`와 artifact `## Reviews`의 `<!-- harness:review kind=codex scope=diff tip=2656f746… at=2026-11-25T05:05:54.805Z -->`가 일치합니다. |
| S5 | 검증 명령·실제 출력 인용 | BLOCKER | **fail** | artifact 11행은 `npm test`의 `ℹ pass 1478`과 `docs:check` 출력을 인용합니다. 13행은 “spec 198개를 렌더해 `cmp` 동일”이라고만 적어 실행한 비교 명령과 종료 상태가 빠져 있습니다. 14행의 브라우저 확인도 “콘솔 오류 0·네트워크 요청은 문서 하나”라는 관찰 요약이며, 해당 결과를 확인할 브라우저 출력 인용이 없습니다. |

독립 검증에서 `node --test --test-name-pattern='^(brief:|stripComments:)' tests/brief-command.test.mjs`는 `ℹ pass 21`, `ℹ fail 0`이었고, `npm run docs:check`는 `harness overview 생성 상태가 최신입니다.`를 출력했습니다. 전체 테스트, CLI 파일 쓰기 테스트, 198개 baseline 비교, 수동 브라우저 확인은 재실행하지 않았습니다. S1은 코드 경로를 근거로 판정했습니다.

**판정 — PR 준비 보류.** 실패 항목은 **S1**(권한 오류가 `missing`으로 분류되는 경로)과 **S5**(baseline 비교 및 브라우저 확인의 실행 증거 누락)입니다.
```

<!-- harness:review kind=codex-shipcheck scope=diff tip=f3e16635235d6035295c1868d7193f4855ee84e3 at=2026-11-25T05:17:42.066Z -->

판별·조치(2026-11-25, 문서만 — ship 제약):
- S1 fail — **문서 결함**. 코드는 `exists`(=`stat` 성공) 뒤의 읽기 실패만 `rejected`로 보고하고, `stat` 실패(상위 디렉터리 권한 등)는 `missing`이다. spec 설계 문장이 "권한"을 넓게 적었다 → spec을 코드 동작대로 좁혔다. 동작 자체는 명세("파일이 없으면 missing")와 맞아 코드는 고치지 않았다.
- S5 fail — **진짜 누락**. 198-spec `cmp`와 브라우저 확인을 실행한 명령·출력 인용으로 바꿨다(위 `## 결과` 검증).
- S2 na — 검토 승인 증거 줄(`검토 승인: <날짜> · 슬라이드 <경로>`)이 없었다 → `## 결과`에 추가했다.

## Learnings
- 바이트 호환 계약이 있는 렌더러에 기능을 더할 때는 공용 CSS 상수를 건드리지 말고 조건부로 덧붙인다 — 편집 전에 기준선 산출물(전체 입력)과 sha를 먼저 떠 둔다.

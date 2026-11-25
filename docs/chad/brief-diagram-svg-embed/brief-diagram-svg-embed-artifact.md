# brief-diagram-svg-embed — Artifact

*최종 결과물과 학습 내용을 기록한다.*

## 결과
- `src/commands/brief.mjs`: `renderBrief(spec, { diagrams })` 선택 두 번째 인자 — 뷰마다 data URI `<img>` 그림 슬라이드를 `## 설계` 절의 마지막 슬라이드 뒤에(없으면 마지막 spec 절 뒤) 넣는다. 그림 CSS는 뷰가 있을 때만 붙인다. `runBrief`는 `DIAGRAM_VIEWS`마다 `<name>-diagram-<view>.svg`를 읽어 `svgSelfContainmentViolations`로 거르고, 콘솔 한 줄·`--json` `diagrams`(embedded|missing|rejected)로 보고한다. "렌더할 절이 없음"은 뷰를 뺀 슬라이드 수로 판정한다.
- `tests/brief-command.test.mjs`: 0.58.4 바이트 고정(sha256)·순서/위치·설계 없음 대체 위치·새 사실 0·외부 자산 0(허용 목록에 figure·img·alt, src는 SVG data URI만)·결정론·전체 repo spec에 뷰 실음·CLI rejected/missing/레거시 HTML 무시/뷰만 있으면 exit 1.
- 문서: `src/cli-args.mjs` brief summary, `commands/harness-task.md`·`commands/harness-diagram.md` 한 줄, CHANGELOG `[Unreleased]`(minor, 범프는 release 단계).
- 검증:
  - `npm test` exit 0 — 1478 tests, 0 fail(1 skipped, 기존). `npm run docs:check` — 최신.
  - 0.58.4(88b859e7) `renderBrief`와 새 `renderBrief`(인자 하나)로 이 저장소 spec 198개를 렌더해 `cmp` 동일.
  - 수동: 임시 저장소에서 `diagram record --view sequence|module`을 통과한 SVG 2개로 `brief` → 설계 하위 절 뒤 그림 2장, 브라우저(1280×800)에서 1075px 폭으로 그려짐·콘솔 오류 0·네트워크 요청은 문서 하나. module에 `<script>`를 넣자 `module 거부(스크립트 요소: script)`, exit 0, 산출물 `<script` 0·figure 1.
- 묻지 않고 내린 결정: alt에는 뷰 이름을 포함한 repo 상대 경로만 둔다. 그림 슬라이드 제목(`titles`·JSON `sections`)은 `diagram:<view>`. 그림 `<img>`에 흰 바탕을 둔다(투명 SVG가 어두운 테마에서 묻히지 않게). 뷰가 없을 때도 콘솔에 `뷰 SVG: … 없음` 한 줄을 낸다.


## Reviews
*Codex 등 리뷰 실행 시 결과(요약·발견·조치)를 날짜와 함께 남긴다. 남기지 않은 리뷰는 "안 한 것"으로 간주.*
*기계 판독용 마커를 함께 남긴다: `<!-- harness:review kind=codex scope=worktree tip=<sha|none> at=<ISO8601> -->`*


## Learnings
- 바이트 호환 계약이 있는 렌더러에 기능을 더할 때는 공용 CSS 상수를 건드리지 말고 조건부로 덧붙인다 — 편집 전에 기준선 산출물(전체 입력)과 sha를 먼저 떠 둔다.

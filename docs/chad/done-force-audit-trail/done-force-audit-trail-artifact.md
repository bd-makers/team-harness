# done-force-audit-trail — Artifact

*최종 결과물과 학습 내용을 기록한다.*

## 결과

**구현 (2026-09-08).** 흔적 없는 우회를 없앴다. 가드의 차단 판정(`collectDoneIssues`)과
`--force` 경로는 한 줄도 바뀌지 않았다.

| 층 | 변경 |
|---|---|
| meta 스키마 | `taskMetaTemplate`에 `forcedAt: null`·`forcedIssues: null` 추가 (`summary.mjs`) |
| 기록 | `runDone`이 `force && issues.length`일 때만 두 필드를 쓴다 (`task.mjs`) |
| 원장 렌더 | 우회 종결은 `✅ done ⚠️`, 사용자 인덱스는 `- ✅ <task> ⚠️` |
| 역파싱 | `SUMMARY_ROW_RE`를 `DONE_CELL`·`FORCED_MARK` 상수에서 **조립**해 렌더와 갈라질 수 없게 함 |
| degrade | `inferLegacyMeta`가 두 필드를 `null`로 둔다 — "우회 아님"을 주장하지 않는다 |

**표시 결정.** plan이 열어 둔 `(open) 원장의 우회 표시 마크`는 `✅ done ⚠️`로 정했다.
정상 종결의 표기(`✅ done`)를 **접두로 보존**해서, 구 원장을 읽던 `done` 판정이
`startsWith(DONE_CELL)`로 그대로 성립한다. 상태 칸을 통째로 바꾸는 안(`⚠️ forced`)은
`inferLegacyMeta`가 원장에서 `created`를 복구하는 경로를 깨뜨릴 위험이 있어 버렸다.

**정규식을 리터럴로 두지 않은 이유.** `⚠️`는 U+26A0 + U+FE0F 두 코드포인트다. 렌더와 역파싱
양쪽에 손으로 적으면 변이 선택자가 한쪽에서 빠져도 **아무 에러 없이** 그 행만 매치에 실패한다.
`inferLegacyMeta`에게 원장은 완료된 구 task의 `created` 마지막 출처라 손실이 영구적이다.
그래서 두 곳이 같은 상수를 참조하도록 조립했다.

**spec과 plan이 어긋나 보이는 지점 (리뷰어용).** spec 제약은 필드 없는 구 task를
*"우회 아님"이 아니라 "알 수 없음"*으로 degrade하라 하고, plan 4단계는 *"두 필드를 `null`로 두고"*
라 한다. plan을 따랐다. `null`은 "우회 기록이 없다"이지 "우회하지 않았다"는 **주장이 아니며**,
원장에는 그 둘을 나눠 그릴 세 번째 표기가 없다. 제약이 실제로 금지하는 것은 `forced: false`
같은 적극적 단정이고, 세 번째 표기를 만드는 것은 이 task의 범위 밖이다.

**의도적으로 지우지 않는 것.** 우회가 아닌 종결에서는 `...meta` 스프레드가 기존 `forcedAt`을
그대로 보존한다. 한 번 우회한 task를 reopen해서 깨끗하게 다시 닫는 것으로 흔적이 지워지면
그건 감사 흔적이 아니다.

**검증.**
- `npm run test` 662개 / 실패 0 / skip 1 (착수 전 656개 → +6).
- E2E(scratch repo): 미완 plan + 템플릿 artifact + 미커밋 변경 3개 issue를 `--force`로 무시 →
  `meta.json`에 `forcedAt` + `forcedIssues` 3건 원문 기록 → `summary --write` →
  `| tester | bypass-demo | ✅ done ⚠️ | 2026-09-08 |` (대조군 `clean-demo`는 `✅ done`) →
  `readLedger` 재읽기에서 두 행 모두 `done: true`·`created` 보존, `completedNames`에 둘 다 존재.
- 이 저장소 자신의 원장 회귀 없음 (`summary --check` = 최신, 88 task) · `docs:check` 최신.

**TDD 순서 (plan 단계 번호와 다름).** plan은 테스트를 5단계에 두지만 구현은 test-first로 했다.
plan의 체크박스는 다른 명령의 기계 입력이라 순서를 손대지 않았고, 각 단계 안에서 RED→GREEN을 돌렸다.
실패를 실제로 관찰한 기록:
1. `forcedAt 기록됨` → `actual: undefined` (기록 층 없음).
2. `taskMetaTemplate ... forcedAt 키 존재` → `actual: false` (스키마 없음).
3. `status 칸에서 구분된다` → 렌더가 두 종결을 같게 그림.
4. **왕복 테스트는 렌더만 바꾸고 정규식을 그대로 둔 상태에서 일부러 실패시켜** 이빨을 확인했다 —
   plan이 경고한 "행 유실" 회귀가 실제로 재현됐고, 그 다음 정규식을 조립해 초록으로 만들었다.
5. 기준 2(`--force`만 붙은 종결) 테스트도 **조건 없이 기록하는 구현을 먼저 넣어** 실패를 관찰한 뒤
   `force && issues.length` 조건을 넣었다. 그냥 두면 처음부터 통과해 아무것도 증명하지 못한다.

**처음에 잘못 쓴 테스트.** `우회 종결과 정상 종결이 구분된다`를 행 전체 비교로 썼더니 통과했는데,
두 행이 다른 이유가 표시가 아니라 **task 이름**이었다. status 칸만 비교하도록 고쳤다.

## Reviews
*Codex 등 리뷰 실행 시 결과(요약·발견·조치)를 날짜와 함께 남긴다. 남기지 않은 리뷰는 "안 한 것"으로 간주.*
*기계 판독용 마커를 함께 남긴다: `<!-- harness:review kind=codex scope=worktree tip=<sha|none> at=<ISO8601> -->`*


## Learnings


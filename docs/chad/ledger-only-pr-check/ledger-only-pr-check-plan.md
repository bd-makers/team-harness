# ledger-only-pr-check — Plan

## 목표
생성물 원장(`docs/task_summary.md`, `docs/<user>/<user>-task.md`)만 바뀐 diff 를 `pr-check` 가 통과시키고 note 를 남긴다 — 섞인 diff 는 종전 판정.

## 단계
- [x] [사람] spec 검토 승인 — chad
- [x] 1. 원장 전용 diff 실패 테스트를 먼저 쓰고 현 코드에서 red 확인(`c72c76a4` 재현)
- [x] 2. `pr-check.mjs` — `isLedgerPath`·`ledgerOnly` 판정·통과·렌더링·JSON 필드
- [x] 3. 섞인 경우·닮은 경로·`--pre-push` 테스트 추가, `npm run test` 통과
- [x] 4. 문서 — D11·D5 정정(D5 는 `templates/docs/decisions.md` 미러 동일 문장), `commands/harness-task.md`, CHANGELOG Unreleased
- [x] 5. `npm run docs:check` 통과, artifact 기록, 커밋
- [ ] ship 완료

## Ontology 변경 로그
*개념이 새로 정의되거나 의미가 바뀌면 한 줄로 기록. spec.md의 Ontology 섹션을 갱신할 트리거가 된다.*

- 2026-11-20 "원장 전용 diff" 신설 — pr-check 의 task 문서 검사 대상이 아님.

## 참고
- 재현 커밋 `c72c76a4` (브랜치 `chore/summary-batch-2026-11-20`)

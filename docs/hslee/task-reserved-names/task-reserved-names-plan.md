# task-reserved-names — Plan

## 목표
`harness-team` 명령 이름으로 새 task를 만들지 않는다 (기존 task 활성화는 유지).

## 단계
- [x] 실패하는 테스트 작성 (`tests/task-reserved-names.test.mjs`)
- [x] `runTask`에 예약 이름 거부 추가 (COMMANDS 단일 소스)
- [x] `commands/harness-task.md` 경고 문단 현행화
- [x] `npm test` 전체 통과 + `docs:check`
- [x] read-only 리뷰(codex) 기록

## Ontology 변경 로그
- 2026-09-25 **예약 이름** 도입 — spec Ontology 반영

## 참고
- 다이어그램: 옵트아웃(2026-09-25 질문, 넣지 않음)

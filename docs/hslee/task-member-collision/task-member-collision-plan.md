# task-member-collision — Plan

## 목표
`--member` 가 config user 를 이기게 하고, 추론 member 로 다른 member 와 같은 이름의 task 를 만들지 않는다.

## 단계
- [x] 실패하는 테스트 작성 (`tests/task-member-collision.test.mjs`) — 2건 red 확인
- [x] `resolveUser` 우선순위 수정 + 충돌 가드
- [x] README 식별 규칙·`commands/harness-task.md`·CHANGELOG
- [x] `npm test` 전체 통과 + `docs:check`
- [ ] read-only 리뷰(codex) 기록

## Ontology 변경 로그
- 2026-09-25 **명시/추론 member**, **이름 충돌** 도입 — spec Ontology 반영

## 참고
- 다이어그램: 옵트아웃(2026-09-25 질문, 넣지 않음)

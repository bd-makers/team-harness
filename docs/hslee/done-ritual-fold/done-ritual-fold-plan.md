# done-ritual-fold — Plan

## 목표
머지 후 task 종결을 커밋 하나로 — `done` 가드가 체크박스만 켠 plan.md를 미커밋 작업으로 세지 않는다.

## 단계
- [x] 실패 테스트 작성 — 통과·차단·`isCheckboxOnlyChange` 경계 (`tests/done-guard.test.mjs`)
- [x] 구현 — `isCheckboxOnlyChange` + 가드 git 블록 면제 (`src/commands/task.mjs`)
- [x] 문서 — `commands/harness-task.md` "머지 후 종결 — 커밋 하나"
- [x] 검증 — `npm test`(1036, fail 0), `npm run docs:check`
- [x] 리뷰(codex ×2, P2 4건 반영) → artifact Reviews 기록
- [ ] 커밋·PR (머지 후 체크 — 이 task가 새 절차의 첫 사용자)

## Ontology 변경 로그
*개념이 새로 정의되거나 의미가 바뀌면 한 줄로 기록. spec.md의 Ontology 섹션을 갱신할 트리거가 된다.*

- 2026-09-26: "체크박스-only 변경" 정의 추가 — done 가드 dirty 면제 조건.

## 참고
- 다이어그램: 옵트인 질문에 "넣지 않음"(2026-09-26)

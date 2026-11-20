# adopt-reviews-closed — Plan

## 목표
`migrate --adopt-reviews` 채택 후보에서 기본 브랜치 R에서 종결(그 뒤 재개 안 됨)된 task를 뺀다 (done-derive 리뷰 P2-6, 결정 A).

## 단계
- [x] [사람] spec 검토 승인 — chad
- [x] 후보 필터에 R 종결 제외 구현 (`collectReviewAdoptionCandidates`)
- [x] 테스트: R 종결 제외 · R에서 열림 · 재개 · ref 없음
- [x] 문서: harness-migrate.md · harness-review.md · CHANGELOG
- [x] `npm run test` · `npm run docs:check` 통과
- [x] ship 완료

## Ontology 변경 로그
*개념이 새로 정의되거나 의미가 바뀌면 한 줄로 기록. spec.md의 Ontology 섹션을 갱신할 트리거가 된다.*

- 2026-11-20 "채택 후보"(= 열린 구 task)의 "열림"이 로컬 기록 기준에서 "기본 브랜치 R에서 마지막 재개 이후 종결되지 않음"까지로 넓어짐.

## 참고
- `docs/chad/done-derive/done-derive-artifact.md` P2-6

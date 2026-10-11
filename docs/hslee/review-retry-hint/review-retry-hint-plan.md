# review-retry-hint — Plan

## 목표
`review`·`scope` 의 scope 오류 retry 를 원인 종류(`errorKind`)로 고른다 — followups 19 해결.

## 단계
- [x] spec/plan 다이어그램 — 미실행(경미한 문구 수정)
- [x] 회귀 테스트 추가(review 4종·scope 4종) → 구현 전 ✖ 확인, artifact 기록
- [x] `resolveBase`·`resolveScope` 가 `errorKind` 를 싣는다
- [x] `review.mjs`·`scope.mjs` retry 를 `errorKind` 로 고른다 → 테스트 ✔
- [x] `docs/followups.md` 19번 삭제 + 괄호 기록 + "남은 것" 갱신, CHANGELOG `[Unreleased]` Fixed 1줄
- [x] `npm test`·`npm run docs:check` 통과
- [x] PR 생성(#143) — 리뷰 덱 미실행(스킬 없음)
- [x] 머지 (사람)

## Ontology 변경 로그
*개념이 새로 정의되거나 의미가 바뀌면 한 줄로 기록. spec.md의 Ontology 섹션을 갱신할 트리거가 된다.*

- 2026-10-11 `errorKind` 신설 — scope 오류 원인 종류 4값(spec Ontology)

## 참고
- spec `## 설계 / 접근` 의 표가 문구 정본

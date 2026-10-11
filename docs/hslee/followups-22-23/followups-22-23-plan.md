# followups-22-23 — Plan

## 목표
`diff-failed` cause 에 git 의 실패 사유를 싣고(followups 22), pre-push 가 기본 브랜치와 무관한 히스토리의 브랜치를 건너뛰게 한다(followups 23, 방향 A).

## 단계
- [x] spec/plan 다이어그램 — 미실행(경미한 오류 경로 수정)
- [x] 회귀 테스트 추가(review-command: diff-failed cause · pr-check: pre-push 무관 히스토리 건너뛰기 + 관련 브랜치 검사) → 구현 전 ✖ 확인, artifact 기록
- [x] `review.mjs` `resolveScope` 의 diff-failed cause 를 git stderr 마지막 줄로(`gitFailureReason`)
- [x] `pr-check.mjs` pre-push 루프에 `sharesHistory`(merge-base exit 1 만 건너뛰기) → 테스트 ✔
- [x] README pre-push 건너뛰기 목록 동기화, `docs/followups.md` 22·23번 삭제 + 괄호 기록 + "남은 것: 없음", CHANGELOG `[Unreleased]` Fixed
- [x] `npm test`·`npm run docs:check` 통과
- [x] PR 생성(#146) — 리뷰 덱 미실행(스킬 없음)
- [ ] 머지 (사람)

## Ontology 변경 로그
*개념이 새로 정의되거나 의미가 바뀌면 한 줄로 기록. spec.md의 Ontology 섹션을 갱신할 트리거가 된다.*

- 2026-10-11 pre-push 의 "검사 대상"에서 기본 브랜치와 공통 조상이 없는 브랜치를 뺌(D11 게이트를 좁힘 — spec Ontology·설계)

## 참고
- 정본 서술: `docs/followups.md` 22·23번(main a89d1c4, 이 PR 에서 삭제)

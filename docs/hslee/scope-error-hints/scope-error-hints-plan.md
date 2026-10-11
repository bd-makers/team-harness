# scope-error-hints — Plan

## 목표
`scope` 오류 alternatives(followups 20)·`pr-check` base 오류 retry(followups 21)를 원인 종류(`errorKind`)로 고른다.

## 단계
- [x] spec/plan 다이어그램 — 미실행(경미한 문구 수정)
- [x] 회귀 테스트 추가(scope alternatives 4종·pr-check retry 4종 + pre-push diff-failed, 기존 pre-push 테스트 픽스처 이동) → 구현 전 ✖ 확인, artifact 기록
- [x] `scope.mjs` alternatives 를 `errorKind` 로 고른다
- [x] `pr-check.mjs` `emitBaseError` retry 를 `errorKind` 로 고른다(pre-push 는 `default-base`·`diff-failed` 만 덮음) → 테스트 ✔
- [x] `docs/followups.md` 20·21번 삭제 + 괄호 기록 + "남은 것" 갱신, CHANGELOG `[Unreleased]` Fixed
- [x] `npm test`·`npm run docs:check` 통과
- [x] PR 생성(#144) — 리뷰 덱 미실행(스킬 없음)
- [ ] 머지 (사람)

## Ontology 변경 로그
*개념이 새로 정의되거나 의미가 바뀌면 한 줄로 기록. spec.md의 Ontology 섹션을 갱신할 트리거가 된다.*

- 2026-10-11 `errorKind` 의 쓰임을 scope alternatives·pr-check retry 로 넓힘(값 불변) · "pre-push 판정 HEAD" 명시(spec Ontology)

## 참고
- spec `## 설계 / 접근` 의 두 표가 문구 정본

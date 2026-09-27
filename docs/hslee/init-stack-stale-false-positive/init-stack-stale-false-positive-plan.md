# init-stack-stale-false-positive — Plan

## 목표
`init --stack X`로 강제한 스택을 렌더 입력으로 저장해, doctor의 stack 절 stale 오탐과 플래그 없는 init의
조용한 되돌림을 없앤다.

## 단계
- [x] 재현: 실패 테스트 추가(`tests/doctor.test.mjs`) — `['AGENTS.md#stack']` 확인, plain init 되돌림 실측
- [x] 저장 위치 결정 수령 — A(render-state `stack` 필드) + A-1(`--stack <감지 id>`면 해제)
- [x] 구현: 강제 스택 저장 + init(플래그 없음)·doctor·migrate가 같은 유효 스택으로 렌더
- [x] 테스트: 재현 테스트 green + plain init 유지·리셋 경로 테스트
- [x] `npm test` 전체 green · `npm run docs:check` 통과
- [x] CHANGELOG Unreleased `### Fixed` 갱신
- [x] artifact 결과 기록 · 커밋(로컬만)

## Ontology 변경 로그
*개념이 새로 정의되거나 의미가 바뀌면 한 줄로 기록. spec.md의 Ontology 섹션을 갱신할 트리거가 된다.*

- 2026-09-27: 감지 스택 / 강제 스택 / 유효 스택 구분 도입.
- 2026-09-27: 강제 스택 = render-state `stack` 고정값(감지와 같은 id를 주면 해제)으로 확정.

## 참고
- 다이어그램: 미선택(AO 비대화형 워커 — 옵트인 질문 불가, 기본값 없음).

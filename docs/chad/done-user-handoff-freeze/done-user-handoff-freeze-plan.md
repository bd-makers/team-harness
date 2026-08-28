# done-user-handoff-freeze — Plan

## 목표

`done` 이후 `docs/<user>/<user>-handoff.md` 가 종결된 task 를 활성으로 선언한 채 얼어붙는
구조적 결함을 제거한다. 차단된 `done` 은 파일을 건드리지 않는다.

## 단계
- [x] 원인 재확인 — `writeActive(…, null)` 호출부가 `runDone` 하나뿐임을 확인해 종결 경로가 단일임을 고정
- [x] spec 작성 — 원인 분석·설계 판단((A)/(B))·출력 형식을 spec 본문에 직접 기록
- [x] RED — `tests/user-handoff.test.mjs` 작성, 수정 전 소스에서 실패 확인 및 출력 캡처
- [x] 구현 — `renderUserHandoff` 순수 렌더러 export, `runHandoffAuto`·`runDone` 양쪽이 호출
- [x] GREEN — 같은 테스트 통과 확인, 전체 `npm test` 회귀 확인
- [ ] 외부 검증 — `/harness-adversarial-review` 실행, `## Reviews` 에 kind 마커와 함께 기록
- [x] CHANGELOG Unreleased 항목 추가
- [ ] PR 생성 (열린 리뷰 스레드 `PRRT_kwDOSD3QEM6dFU8u` 참조), CI green 확인 — 머지는 승인 대기

## Ontology 변경 로그

- **종결 형태 (closed form)** 신규 정의 — 활성 task 가 없는 상태의 사용자 handoff.
  `Last Completed Task` 를 갖고 `Last Commit` sha 를 갖지 않는다.
- **사용자 handoff** 의 성격 명시 — 손으로 관리하는 SSOT 가 아니라 **도구 소유 생성물**이다.
  이 결함 이전에는 종결 후 도구가 손을 떼어 사람이 손으로 고쳐야 했고, 그래서 생성물처럼
  보이지 않았다.

## 참고
- 브리프: done 이후 사용자 handoff 동결 결함 수정
- 형식 기준: `bbbc885` (PR #56)

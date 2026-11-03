# gate-fail-cause — Plan

## 목표
게이트 실패 메시지에 설치 흔적 부재(환경 원인) 단서를 붙인다.

## 단계
- [x] spec 작성(후보 C)
- [x] `gate.mjs` 실패 분기에 `installHint` 추가
- [x] 테스트 추가(단서 있음·없음)
- [x] `npm test` fail 0(1,300개 중 pass 1,299), `docs:check` 최신
- [ ] 커밋(브랜치 `feat/gate-env-hint`, push 없음)

## Ontology 변경 로그
- (none)

## 참고
- 리뷰(R3)는 PR 전에 메인테이너가 정한다.

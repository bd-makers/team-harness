# svg-script-evasion — Plan

## 목표
`svgSelfContainmentViolations`가 스크립트 우회 세 갈래(DTD 내부 subset 속성 기본값, `_`로 시작하는 요소 이름, SMIL로 이벤트 속성 애니메이션)를 위반 하나로 거부해 `record --view`·`brief`·`pr-check`가 함께 막는다.

## 단계
- [ ] [사람] spec 검토 승인 — chad
- [x] 1차 자료로 브라우저 동작 확인(DTD 속성 기본값·SMIL 이벤트 속성) → spec `## 원천 검토`에 기록
- [x] 실패 테스트: `SVG_VIOLATIONS`에 세 갈래 표본, 통과 표본 회귀
- [x] `svgSelfContainmentViolations` 규칙 보강
- [x] CHANGELOG `[Unreleased]` `### Changed`, `commands/harness-diagram.md` 뷰 제약 한 줄
- [x] `npm test` exit 0
- [x] 리뷰(codex) P2-1 반영: SMIL 정규식 2차 backtracking 수정 — P2-2(텍스트 속 거짓 거부)는 정책 안이라 미조치
- [x] 재리뷰(codex, 2228ffb9) P2 반영: SMIL 접두사 글자에서 `=`를 빼 이어 쓴 `attributeName=`의 2차 경로 수정 — P3 셋은 정책 안이라 미조치
- [x] 3차 리뷰(codex, 1fb4267f) P3 둘 반영(사용자 지시): 위반 문구 일치 값·태그 이름 60자 자르기 + 변이 확인한 테스트, spec SMIL 정규식을 코드와 동기화(`1a9069ea`) — 긴 닫는 태그 이름 표본은 diagram-svg-wellformed 리뷰에서 더함(`5232c42d`), 텍스트·`data-attributeName` 오탐은 정책 안이라 미조치
- [x] ship: spec 범위·설계, plan, artifact 검증·리스크 갱신 — 다이어그램 건너뜀(사용자 선택, plan에 단계 없음)
- [ ] ship 완료

## Ontology 변경 로그
*개념이 새로 정의되거나 의미가 바뀌면 한 줄로 기록. spec.md의 Ontology 섹션을 갱신할 트리거가 된다.*

- 스크립트 우회·DTD 내부 subset 선언 도입. 위반 문구 `DTD 엔티티 선언` → `DTD 내부 subset 선언`

## 참고
- 기준: `claude/agitated-yonath-4fc02c` 52671997(task `diagram-svg-wellformed`, 미머지) 위에 쌓음 — 그 브랜치는 다시 `claude/brief-diagram-svg-embed-0f4251` 위에 있다

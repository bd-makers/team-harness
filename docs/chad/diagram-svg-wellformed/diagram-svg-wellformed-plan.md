# diagram-svg-wellformed — Plan

## 목표
태그 짝이 어긋난 뷰 SVG를 `svgSelfContainmentViolations` 한 곳에서 거부해 `record --view`·`brief`·`pr-check`가 함께 막는다.

## 단계
- [x] [사람] spec 검토 승인 — chad (사후 승인 2026-11-27 — 코드는 #204·#205로 main에 머지된 뒤, 사용자가 종결 요청 중 승인으로 기록하라고 답함)
- [x] 실패 테스트: `SVG_VIOLATIONS` 짝 어긋남 표본, 통과 표본(CDATA·주석·스스로 닫힘), brief rejected
- [x] `svgSelfContainmentViolations` 태그 중첩 검사
- [x] CHANGELOG `[Unreleased]` `### Changed`
- [x] `npm test` exit 0
- [x] 리뷰(claude) 반영: iCloud 중복 파일 제거, 끝 정규식 지수 backtracking 수정, `ATTR`의 `<` 삼킴 수정
- [x] 리뷰 2차(claude) P3-1~3 반영: CHANGELOG 정정, 주석 통과 표본, pad 28칸, 속성 이름 따옴표 표본
- [x] 리뷰 2차 P3-4 반영: 이벤트 핸들러 규칙을 원문에서 찾기
- [x] 리뷰 3차(claude) 문구 P3 반영: CHANGELOG 규칙별 근거, 테스트 주석
- [x] `svg-script-evasion` 브랜치 merge(`fd919171`·`992c96a9`·`27a621ba`·`23e74430`·`680c4558`)
- [x] 위반 문구의 태그 이름 60자 자르기(`1a9069ea`, svg-script-evasion codex 3차 P3와 함께), 이 task codex 리뷰 P3: 긴 닫는 이름 표본(`5232c42d`)
- [x] ship 완료

## Ontology 변경 로그
*개념이 새로 정의되거나 의미가 바뀌면 한 줄로 기록. spec.md의 Ontology 섹션을 갱신할 트리거가 된다.*

- 태그 중첩 위반 도입

## 참고
- 기준: `claude/brief-diagram-svg-embed-0f4251` 3acad236 위에 쌓음(미머지)

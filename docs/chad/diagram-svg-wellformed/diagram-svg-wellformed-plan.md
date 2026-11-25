# diagram-svg-wellformed — Plan

## 목표
태그 짝이 어긋난 뷰 SVG를 `svgSelfContainmentViolations` 한 곳에서 거부해 `record --view`·`brief`·`pr-check`가 함께 막는다.

## 단계
- [ ] [사람] spec 검토 승인 — chad
- [x] 실패 테스트: `SVG_VIOLATIONS` 짝 어긋남 표본, 통과 표본(CDATA·주석·스스로 닫힘), brief rejected
- [x] `svgSelfContainmentViolations` 태그 중첩 검사
- [x] CHANGELOG `[Unreleased]` `### Changed`
- [x] `npm test` exit 0
- [ ] ship 완료

## Ontology 변경 로그
*개념이 새로 정의되거나 의미가 바뀌면 한 줄로 기록. spec.md의 Ontology 섹션을 갱신할 트리거가 된다.*

- 태그 중첩 위반 도입

## 참고
- 기준: `claude/brief-diagram-svg-embed-0f4251` 3acad236 위에 쌓음(미머지)

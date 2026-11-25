# brief-diagram-svg-embed — Plan

## 목표
`harness-team brief`가 활성 task의 뷰 SVG를 설계 슬라이드 뒤에 그림 슬라이드로 싣되, 인자 하나 `renderBrief(spec)`는 0.58.4와 같은 바이트를 낸다.

## 단계
- [x] [사람] spec 검토 승인 — chad (2026-11-25 대화에서 승인)
- [x] `renderBrief` 선택 두 번째 인자·그림 슬라이드·위치
- [x] `runBrief` 뷰 읽기·자립성 판정·콘솔/JSON 보고, 렌더할 절 판정은 뷰 제외
- [x] 테스트: 바이트 동일성(sha256 고정)·삽입 순서/위치·rejected·missing·새 사실 0·외부 자산 0·결정론·뷰만 있는 spec 오류
- [x] `cli-args.mjs` summary·`harness-task.md`·`harness-diagram.md`·CHANGELOG `[Unreleased]`
- [x] `npm test`·`docs:check`·0.58.4 전체 spec `cmp`·수동 브라우저 확인
- [ ] 리뷰 기록
- [ ] ship 완료

## Ontology 변경 로그
- 그림 슬라이드·embedded/missing/rejected 도입

## 참고
- 기준선 산출물: 0.58.4 `renderBrief`로 렌더한 이 저장소 spec 198개(세션 scratchpad)

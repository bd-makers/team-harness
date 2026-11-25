# diagram-svg-wellformed — Artifact

*최종 결과물과 학습 내용을 기록한다.*

## 결과
- `svgSelfContainmentViolations`에 `tagStructureViolation`(태그 여닫이 짝·닫히지 않음·루트 뒤 내용·맨 `<`)을 더했다. 루트가 없거나 잘린 파일이면 건너뛰어 위반이 겹치지 않는다.
- 세 호출부(`diagram record --view`·`brief`·`pr-check`)가 함께 엄격해진다 — 호출부 코드는 그대로.
- 테스트: `SVG_VIOLATIONS`에 태그 구조 표본 6개(record 루프가 exit 1까지 검증), 주석·CDATA·PI·`&#60;`·대소문자 짝 통과 표본, brief `rejected` 테스트.
- 검증: `npm test` 1480 pass / 0 fail(perf 1 pass), `npm run docs:check` 최신. 20000개 요소 SVG 9ms.
- 미검증: 실제 생성기(diagram 스킬)가 만든 SVG — 이 저장소에 커밋된 뷰 SVG가 없다.

## Reviews
*Codex 등 리뷰 실행 시 결과(요약·발견·조치)를 날짜와 함께 남긴다. 남기지 않은 리뷰는 "안 한 것"으로 간주.*
*기계 판독용 마커를 함께 남긴다: `<!-- harness:review kind=codex scope=worktree tip=<sha|none> at=<ISO8601> -->`*


## Learnings

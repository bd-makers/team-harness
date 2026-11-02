# done-scope-line — Plan

## 목표
`done`·`gate commit` 통과 출력에 보장 범위 한 줄을 붙인다(차단 없음).

## 단계
- [x] `describeDoneScope` + `collectDoneIssues` 반환 확장 + `runDone` 출력
- [x] `gate commit` 통과 시 stdout systemMessage
- [x] 테스트(done scope 줄·gate systemMessage), README·CHANGELOG
- [x] `npm test`·`npm run docs:check` 통과 확인

## Ontology 변경 로그
*개념이 새로 정의되거나 의미가 바뀌면 한 줄로 기록. spec.md의 Ontology 섹션을 갱신할 트리거가 된다.*

- 2026-11-02: "보장 범위 줄" 도입

## 참고
- spec `## 설계 / 접근`

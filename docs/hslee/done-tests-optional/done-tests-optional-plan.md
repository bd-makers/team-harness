# done-tests-optional — Plan

## 목표
`done` 가드의 `tests` 미선언 기본값을 `required` → `optional`로 내린다(D11 정합).

## 단계
- [x] `task.mjs` 기본값·허용값·주석, spec 템플릿 주석 변경
- [x] done-guard 테스트: 기본값 의존 케이스를 `tests: required` 명시로 전환, 새 기본값·`optional` 선언 케이스 추가
- [x] golden fixture·README·decisions.md(D11 정정)·CHANGELOG 갱신
- [x] `npm test`·`npm run docs:check` 통과 확인

## Ontology 변경 로그
*개념이 새로 정의되거나 의미가 바뀌면 한 줄로 기록. spec.md의 Ontology 섹션을 갱신할 트리거가 된다.*

- 2026-11-02: tests 증거 수준에 `optional` 추가·기본값화, `skip`은 동의어로 유지

## 참고
- spec `## 설계 / 접근`

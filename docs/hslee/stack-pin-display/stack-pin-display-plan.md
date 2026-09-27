# stack-pin-display — Plan

## 목표
`harness-team stack`이 render-state 고정 스택을 text·JSON(필드 추가)으로 드러낸다.

## 단계
- [x] 실패 테스트 추가 (JSON `stackPin` null/고정, text pin 줄)
- [x] `src/commands/stack.mjs` 구현
- [x] 문서(`commands/harness-init.md`)·CHANGELOG [Unreleased]
- [x] `npm test`·`npm run docs:check` green
- [x] 외부 리뷰(`harness-team review`) → artifact 기록
- [x] PR 생성·CI 확인 (#113, test (24) pass)
- [x] 머지 후 종결(기본 브랜치)

## Ontology 변경 로그
*개념이 새로 정의되거나 의미가 바뀌면 한 줄로 기록. spec.md의 Ontology 섹션을 갱신할 트리거가 된다.*

- 감지/고정/유효 스택 3개념 도입(spec Ontology)

## 참고
-

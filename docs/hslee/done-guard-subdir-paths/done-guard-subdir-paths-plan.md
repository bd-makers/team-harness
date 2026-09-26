# done-guard-subdir-paths — Plan

## 목표
하위 디렉터리 설치본에서 done 가드(handoff 제외·체크박스 면제)와 post-commit sweep 판정이 루트 설치본과 같게 동작한다.

## 단계
- [x] 실패 테스트 작성 — 하위 디렉터리 fixture (`tests/done-guard.test.mjs`, `tests/handoff-hook-churn.test.mjs`)
- [x] 구현 — `--show-prefix` 헬퍼 + 세 비교 지점 (`src/commands/task.mjs`)
- [x] 문서 — `commands/harness-task.md` 한계 문장 제거, CHANGELOG `[Unreleased]`
- [x] 검증 — `npm test`(1041, fail 0), `npm run docs:check`
- [x] 리뷰(codex, P1·P2 없음, P3 1건 반영) → artifact Reviews 기록
- [x] 커밋·PR

## Ontology 변경 로그
*개념이 새로 정의되거나 의미가 바뀌면 한 줄로 기록. spec.md의 Ontology 섹션을 갱신할 트리거가 된다.*

- 2026-09-26: "targetDir"·"루트 기준 경로" 정의 추가 — git 경로 비교의 기준.

## 참고
- 다이어그램: 옵트인 질문에 "넣지 않음"(2026-09-26)

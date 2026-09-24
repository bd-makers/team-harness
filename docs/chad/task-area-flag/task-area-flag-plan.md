# task-area-flag — Plan

## 목표
`--area` + `meta.area` 로 모노레포 task 를 앱 단위로 묶는다 — 경로 불변, 무설정 바이트 동일.

## 단계
- [x] 행동 매트릭스 테스트 작성 (`tests/task-area.test.mjs`) — 먼저 red
- [x] `task --area`: 검증·새 task meta·채택·충돌 거부
- [x] `list` 표시·`--area` 필터
- [x] `summary` 원장 `Area` 열 (조건부, 맨 뒤)
- [x] cli-args 등록 + `commands/harness-task.md` (AGENTS 1줄은 eager 예산 초과로 제외 — spec 참고)
- [x] `npm test`·`doctor`(eager 예산)·`release --dry-run`·golden 무변경
- [x] Codex 리뷰 기록
- [x] CHANGELOG `[Unreleased]`

## Ontology 변경 로그
*개념이 새로 정의되거나 의미가 바뀌면 한 줄로 기록. spec.md의 Ontology 섹션을 갱신할 트리거가 된다.*

- (none)

## 참고
-

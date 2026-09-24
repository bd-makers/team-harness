# task-paths-helper — Plan

## 목표
task 경로·식별자 조립을 `src/task-paths.mjs` 한 곳으로 모은다 — 동작 변화 0 (monorepo 스펙 1단계).

## 단계
- [x] golden e2e 추가 — 현 코드에서 green
- [x] `src/task-paths.mjs` 도입 + `summary.mjs` re-export
- [x] task.mjs 경유 (taskDir·handoffRelPaths·runList·done·retro·handoff auto·출력)
- [x] summary·session-context·context·boundary·doctor 경유 (스캐너 3벌 → listTaskRefs)
- [x] review·rules·diagram·remote-task·observe·migrate(현행 구조 출력부) 경유
- [x] 단일 조립 지점 핀 테스트
- [x] `npm test`·`doctor`·`release --dry-run` + golden 무변경 확인
- [x] Codex 리뷰 기록 (artifact Reviews)
- [x] CHANGELOG `[Unreleased]`

## Ontology 변경 로그
*개념이 새로 정의되거나 의미가 바뀌면 한 줄로 기록. spec.md의 Ontology 섹션을 갱신할 트리거가 된다.*

- (none)

## 참고
-

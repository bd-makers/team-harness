# task-index-open-naming — Plan

## 목표

인덱스 "active"(open set) 라벨을 "open"으로 rename해 active.json(포인터)과 의미 분리. 무회귀·기존설치본 호환.

## 단계
- [x] task.mjs write 측: `userTaskIndexTemplate` `## Active`→`## Open`, `addToTaskSummary` `🔄 active`→`🔄 open`
- [x] task.mjs read 측(backward-compat): `addToUserTaskIndex` `## Open`||`## Active` 삽입, `markDoneInTaskSummary` `🔄 (?:active|open)` 매칭
- [x] migrate 측: `migrateTaskIndexLabels` 추가 (+ migrateTaskStructure의 index 생성부도 open으로). runMigrate 배선
- [x] 이 레포 chad-task.md·task_summary.md 조화 (`## Active`→`## Open`, `🔄 active`→`🔄 open`)
- [x] 테스트: 신규→`## Open`+`🔄 open` / 기존 `## Active`·`🔄 active`에서 삽입·done 무회귀 / migrate 라벨 변환(idempotent)
- [x] 회귀: `npm test` green (122→126 pass)

## Ontology 변경 로그
*개념이 새로 정의되거나 의미가 바뀌면 한 줄로 기록. spec.md의 Ontology 섹션을 갱신할 트리거가 된다.*

- 2026-07-07: 인덱스 "active"(open set) → "open" rename, 포인터 "active"(active.json) 유지 — 의미 분리.

## 참고
-

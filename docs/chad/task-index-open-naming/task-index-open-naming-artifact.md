# task-index-open-naming — Artifact

*최종 결과물과 학습 내용을 기록한다.*

## 결과

인덱스 "active"(open set)를 "open"으로 rename, `.harness/active.json`(포인터)과 의미 분리.
- **write**: `userTaskIndexTemplate` `## Active`→`## Open`, `addToTaskSummary` `🔄 active`→`🔄 open`. migrate의 index 재생성부(migrateTaskStructure)도 open으로.
- **read(backward-compat)**: `addToUserTaskIndex`가 `## Open`||`## Active` 아래 삽입, `markDoneInTaskSummary` 정규식 `🔄 (?:open|active)`. 기존 설치본(구 라벨) 삽입·done 무회귀.
- **migrate**: `migrateTaskIndexLabels`(export) — `docs/*/*-task.md` `## Active`→`## Open`, `task_summary.md` `🔄 active`→`🔄 open`. runMigrate 배선 + idempotent.
- **이 레포**: chad-task.md·task_summary.md 조화 완료.
- **미변경(의도)**: `.harness/active.json`, `readActive`/`writeActive`, handoff `## Active Task`(=포인터, 정당).
- 테스트 122→126 pass (신규 4: 신규라벨 write / `## Active` 삽입 compat / `🔄 active` done compat / migrate idempotent).

## Reviews
*Codex/Gemini 등 리뷰 실행 시 결과(요약·발견·조치)를 날짜와 함께 남긴다. 남기지 않은 리뷰는 "안 한 것"으로 간주.*

### 2026-07-07 — Claude self-review (task index active→open rename)
- **정확성**: write=새 라벨, read=구·신 both. 4개 사이트(task.mjs 125/160/167/175) + migrate 2개 생성부 모두 갱신. handoff 포인터(`## Active Task`)는 미변경 확인.
- **엣지**: 기존 `## Active` 인덱스 삽입 / 기존 `🔄 active` done 처리 / migrate idempotent(2nd run false) 모두 테스트. `## Open\n` 정확 매칭으로 헤더만 치환.
- **회귀**: 122→126 pass, e2e lifecycle(실 CLI task/done) green. 구 라벨 자산 파손 없음(호환 유지).
- **보안**: 문자열 치환만, 신규 입력/실행 없음.
- **단순성**: header fallback 1줄 + 정규식 alternation 1개 + migrate 20줄. 과한 추상화 없음.
- **테스트**: runTask/runDone/migrateTaskIndexLabels 각 커버. migrate helper는 다른 migrate export와 일관되게 export.
- **판단**: migrate step은 정확성엔 불필요(read 호환으로 충분)하나 기존 설치본 라벨 일관성 위해 포함 — "제대로 구현" 요구 반영.


## Learnings


# task-index-open-naming — Spec

## 목적 / 요구사항

task 인덱스 계층의 "active" 과부하를 제거한다. 현재 `<user>-task.md`의 `## Active`
섹션과 `task_summary.md`의 `🔄 active` 상태는 "열린(미완료) task **집합**"을 뜻하는데,
`.harness/active.json`은 "현재 전환된 **단일 포인터**"를 뜻해 의미가 충돌한다
(여러 행이 동시에 `🔄 active`일 수 있음). 인덱스 라벨을 `open`으로 바꿔 구분한다.

- **건드리는 것**: `<user>-task.md`의 `## Active` 헤더, `task_summary.md`의 `🔄 active` 상태.
- **건드리지 않는 것**: `.harness/active.json`, `readActive`/`writeActive`(포인터 의미는 정당),
  handoff의 `## Active Task`(=현재 포인터, 정당).

## 설계 / 접근

- **write(신규 생성)**: 새 라벨 사용 — 템플릿 `## Open`, 상태 `🔄 open`.
- **read(삽입/완료)**: 구·신 라벨 **둘 다** 수용해 기존 설치본 무회귀.
  - `addToUserTaskIndex`: `## Open` 없으면 `## Active` 아래 삽입.
  - `markDoneInTaskSummary`: `🔄 (?:active|open)` 매칭.
- **migrate**: 기존 설치본 라벨 조화(`## Active`→`## Open`, `🔄 active`→`🔄 open`) 단계 추가
  (`refreshClaudeHooks` 패턴 재사용). 정확성엔 불필요하나 일관성 확보.
- 이 레포 자신의 `chad-task.md`도 조화.

## Ontology
*이 task가 다루는 핵심 개념의 정의. "X가 정확히 뭔가?"에 답한다.*

- **open (인덱스)**: 아직 done 안 된 task들의 **집합**. 여러 개 동시 존재 가능. `<user>-task.md ## Open` / `task_summary 🔄 open`.
- **active (포인터)**: 지금 전환돼 작업 중인 **단일** task. `.harness/active.json`. 이 refactor 대상 아님.
- **게이트 통과 근거**: 대상 파일·라벨·호환 전략이 코드(task.mjs:125/160/167/175)에서 직접 식별됨 (2026-07-07).

## Ambiguity 자가진단
*각 항목이 명확하면 체크. 3개 이상 미체크면 진입 금지(브레인스토밍으로 복귀).*

- [x] **Goal 명확도** (40%) — 목표가 한 문장으로 구체화되었는가?
- [x] **Constraint 명확도** (30%) — 기술/시간/범위 제약이 명시되었는가?
- [x] **Success 기준** (30%) — 완료를 어떻게 측정하는가?
- [x] **Context 명확도** (brownfield 한정) — 영향 받는 기존 코드/파일을 식별했는가?
- [x] **Ambiguity ≤ 0.2** — 위 항목 가중합 ≥ 0.8

## 참고
- 발단: Codex 리뷰 2026-07-02 (plugin-hardening artifact.md), spawn chip task_3e1bab70
- 대상 코드: `src/commands/task.mjs` (125·160·167·175), `src/commands/migrate.mjs`

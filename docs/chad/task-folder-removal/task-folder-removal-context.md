# task-folder-removal — Context Card
<!-- working set only; UTF-8 <= 6 KiB, nonblank lines <= 100 -->

## Now
- Goal: C2a(비파괴) — 폴더가 있어도 없어도 원장·done-on-main·list --remote·task가 같은 답. 삭제(C2b)는 후속.
- Current atomic step: plan 검토 대기 — 다음은 plan 다이어그램 단계, 그다음 1단계(parseSummaryRows).
- Stop / human-decision condition: 구현 착수는 사람 지시 후. push·PR 금지(upstream=origin/main 주의).

## Constraints and settled decisions
- 사람 답 2026-10-09: 전부 권장 + Q6 수정(폴더도 없을 때만 거부). 기존 테스트 무수정, migrate는 collectTasks 기본값 유지.
- ledger 출처 nudge만 문구 분기, closedAt=git log -1 %cI (spec Q6 해석 ①②).
- 의존성 0, gh 없음, 버전 범프 범위 밖.

## JIT retrieval map
- Identifiers / symbols: listTaskRefs, collectTasks, readLedger, readRemoteTaskMeta, listBranchOnlyTasks, wikiSources, collectDoneIssues
- Narrow globs: src/commands/{summary,remote-task,task,wiki,migrate,observe}.mjs, src/task-paths.mjs
- Read next: plan 단계 1–5, spec 설계 절 '원장 규칙'
- Verification command: npm test && npm run docs:check

## Failure capsules (max 3 unresolved)
- (none)

## Resume checklist
- plan 다이어그램 → 1단계부터 TDD, 단계마다 plan 체크.

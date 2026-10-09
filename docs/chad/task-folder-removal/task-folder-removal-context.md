# task-folder-removal — Context Card
<!-- working set only; UTF-8 <= 6 KiB, nonblank lines <= 100 -->

## Now
- Goal: C2 — 종결 task 폴더 삭제 + 폴더를 읽는 장치(원장·done-on-main·list --remote·이름 가드)의 입력 이전. spec 초안 단계.
- Current atomic step: 사람의 답 대기 — spec `## 참고` 인터뷰 질문 Q1–Q10 + 복잡도 게이트.
- Stop / human-decision condition: 답이 오기 전 plan·코드 변경 금지. push·PR 금지(로컬 커밋까지).

## Constraints and settled decisions
- PR 4문서 강제(D11)·pr-check 불변. 삭제는 기본 브랜치 종결 절차에서 `done` 다음.
- 의존성 0, gh 없음, 버전 범프 범위 밖.

## JIT retrieval map
- Identifiers / symbols: listTaskRefs, collectTasks, readLedger, readRemoteTaskMeta, listBranchOnlyTasks, wikiSources, collectDoneIssues
- Narrow globs: src/commands/{summary,remote-task,task,wiki,migrate,observe}.mjs, src/task-paths.mjs
- Read next: spec 설계 절 영향 표(file:line)
- Verification command: npm test && npm run docs:check

## Failure capsules (max 3 unresolved)
- (none)

## Resume checklist
- 답을 spec에 반영 → `/harness-interview`로 게이트 판정 → plan 작성.

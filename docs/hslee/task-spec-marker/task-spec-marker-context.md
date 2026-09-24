# task-spec-marker — Context Card
<!-- working set only; UTF-8 <= 6 KiB, nonblank lines <= 100 -->

## Now
- Goal: `task` 의 기존-task 판정을 `<name>-spec.md` 마커 기준(listTaskRefs 와 동일)으로 맞춘다 (R1)
- Current atomic step: Codex 리뷰 → artifact 판별 → commit/PR
- Stop / human-decision condition: merge·release·브랜치 삭제는 사용자 승인

## Constraints and settled decisions
- spec 있는 task 동작 불변(golden e2e 무수정)
- spec 없음 + 내용물 있음 → exit 1, 무쓰기. 빈 dir → 생성. spec 만 잃은 task 도 거부(복원 안내)

## JIT retrieval map
- Identifiers / symbols: runTask, isAbsentOrEmpty, emitTaskError, listTaskRefs
- Narrow globs: src/commands/task.mjs, src/task-paths.mjs
- Read next: tests/task-spec-marker.test.mjs
- Verification command: node --test tests/task-spec-marker.test.mjs tests/e2e/task-paths-golden.test.mjs

## Failure capsules (max 3 unresolved)

## Resume checklist
- plan.md 미완 단계 확인

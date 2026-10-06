# empty-doc-guard — Context Card
<!-- working set only; UTF-8 <= 6 KiB, nonblank lines <= 100 -->

## Now
- Goal: 빈 task 문서가 pr-check·done을 통과하던 구멍 막기 + 실례 plan 복원
- Current atomic step: plan 6 — codex 리뷰 → artifact Reviews
- Stop / human-decision condition: push·PR은 사용자 승인 후

## Constraints and settled decisions
- 판정 한 줄씩, 새 장치 없음. plan 부재 시 done 동작은 그대로(pr-check가 부재를 막음)
- 실례 plan은 a4e45a3 판 + artifact·meta 증거로 체크

## JIT retrieval map
- Identifiers / symbols: taskFindings, collectDoneIssues, planHasOpenBoxes
- Narrow globs: src/commands/pr-check.mjs, src/commands/task.mjs
- Read next: spec 설계 절
- Verification command: node --test tests/pr-check.test.mjs tests/done-guard.test.mjs; npm run test

## Failure capsules (max 3 unresolved)

## Resume checklist
- 리뷰 반영 → 커밋 → handoff 커밋 → pr-check → 승인 대기

# review-scope-handoff — Context Card
<!-- working set only; UTF-8 <= 6 KiB, nonblank lines <= 100 -->

## Now
- Goal: scope 자동 판정이 post-commit 훅의 handoff 변경을 dirty로 세지 않는다 — 그것뿐이면 diff.
- Current atomic step: plan 5 — R2·R3 리뷰(`--scope diff` 명시, codex → claude 폴백).
- Stop / human-decision condition: push·PR 금지(brief). 다이어그램 옵트인은 사람 결정 대기.

## Constraints and settled decisions
- 제외 집합 = `handoffRelPaths`(훅 코드 근거). B 기각, 잠재 문제·리뷰 기록 dirty는 followups 17·18.

## JIT retrieval map
- Identifiers / symbols: `resolveScope`, `handoffRelPaths`, `parsePorcelainPaths`, `repoPrefix`, `runHandoffAuto`
- Narrow globs: `src/commands/{review,task,scope}.mjs`, `tests/{review,scope}-command.test.mjs`
- Read next: spec Done evidence S1–S3
- Verification command: `npm test && npm run docs:check && node bin/harness-team.mjs scenario check`

## Failure capsules (max 3 unresolved)

## Resume checklist
- R2·R3 결과를 artifact `## Reviews`에 반영 → ship 준비 보고(`ao report`).

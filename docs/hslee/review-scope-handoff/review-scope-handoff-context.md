# review-scope-handoff — Context Card
<!-- working set only; UTF-8 <= 6 KiB, nonblank lines <= 100 -->

## Now
- Goal: scope 자동 판정이 하네스 기록 파일(훅 handoff·review 의 artifact·meta)을 dirty로 세지 않는다.
- Current atomic step: PR #139 리뷰 대기(머지 금지).
- Stop / human-decision condition: PR 생성 후 보고하고 멈춤(머지 금지). push·PR 막히면 --needs-input.

## Constraints and settled decisions
- 제외 집합 = `handoffRelPaths` ∪ artifact·meta(사람 결정). done 가드는 handoff만. B 기각, 잠재 문제 followups 17.

## JIT retrieval map
- Identifiers / symbols: `resolveScope`, `handoffRelPaths`, `parsePorcelainPaths`, `repoPrefix`, `runHandoffAuto`
- Narrow globs: `src/commands/{review,task,scope}.mjs`, `tests/{review,scope}-command.test.mjs`
- Read next: spec Done evidence S1–S3
- Verification command: `npm test && npm run docs:check && node bin/harness-team.mjs scenario check`

## Failure capsules (max 3 unresolved)

## Resume checklist
- PR #139 생성·CI green. 리뷰 코멘트가 오면 대응.

# overview-worktree-inventory — Context Card
<!-- working set only; UTF-8 <= 6 KiB, nonblank lines <= 100 -->

## Now
- Goal: overview 인벤토리 = `git add -A`가 스테이징할 트리. MAINTAINING eager 수치 제거.
- Current atomic step: 커밋 → R3 리뷰 → PR(사용자 지시 뒤)
- Stop / human-decision condition: push·PR은 사용자 지시 뒤에만

## Constraints and settled decisions
- 새 명령·플래그 없음. CI 의미 불변(깨끗한 체크아웃은 index == tree).
- PR #10 리뷰의 tracked-only 결정을 뒤집는다. ignored 제외는 유지한다.
- 상수는 이름과 위치만 남기고, 실측 리터럴은 지운다.

## JIT retrieval map
- Identifiers / symbols: `listTrackedSourceFiles`, `sourceTreeEntries`, `buildFileRows`
- Narrow globs: `scripts/generate-harness-overview.mjs`, `tests/harness-overview-generation.test.mjs`
- Read next: `MAINTAINING.md:39`, `:52`
- Verification command: `npm run docs:check && npm test`

## Failure capsules (max 3 unresolved)
- (none)

## Resume checklist
- 브랜치 `fix/overview-worktree-inventory` 확인 → plan 첫 미체크 단계부터

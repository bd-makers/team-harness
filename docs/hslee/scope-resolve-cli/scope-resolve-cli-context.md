# scope-resolve-cli — Context Card
<!-- working set only; UTF-8 <= 6 KiB, nonblank lines <= 100 -->

## Now
- Goal: `resolveScope`가 `origin/HEAD`를 보게 고치고(실제 결함), 그 판정을 `harness-team scope`로 노출해 `/harness-ship` 2단계가 사다리를 손으로 실행하지 않게 한다.
- Current atomic step: plan 전 단계 완료. codex 리뷰 6회 반영 끝. 커밋 대기(사용자 지시 필요).
- Stop / human-decision condition: 커밋·push·PR은 사용자 지시 후에만. `summary.mjs`의 세 번째 구현 통일은 별도 task로 넘김 — 여기서 손대지 않는다.

## Constraints and settled decisions
- 판정 로직을 복제하지 않는다. `scope.mjs`는 `resolveScope`를 호출만 한다.
- `resolveDefaultRef`(remote-task.mjs) 자체는 건드리지 않는다 — 존재 확인은 호출자(resolveScope)가 한다. remote-task의 실패 모드를 바꾸지 않기 위해서다.
- `summary.mjs:301` `isSyncedWithDefault`는 의도적으로 세 번째 구현으로 남긴다(하는 일이 다르고 실패 모드가 바뀐다).
- scope 규칙은 **문서(harness-review.md 2단계)가 정본, 코드(review.mjs)가 미러**다. 규칙을 바꾸면 둘 다 같은 커밋에서 움직인다.
- origin 없는 저장소의 `main` 폴백은 보존한다(기존 테스트가 기대).

## JIT retrieval map
- Identifiers / symbols: `resolveScope` · `resolveDefaultRef` · `runScope` · `SCOPES` · `isSyncedWithDefault`
- Narrow globs: `src/commands/{review,scope,remote-task}.mjs` · `commands/harness-{ship,review}.md` · `tests/scope-command.test.mjs`
- Read next: `src/commands/review.mjs`의 `resolveScope`(base 후보 루프) → `src/commands/scope.mjs` → `commands/harness-ship.md` 2·7단계
- Verification command: `npm test` · `npm run docs:check` · `node bin/harness-team.mjs scope --json --target <dir>`

## Failure capsules (max 3 unresolved)
- (없음 — 6회 리뷰에서 나온 P1 1건·P2 7건 전부 판별·수정 완료, artifact `## Learnings`에 기록)

## Resume checklist
- `git status --short`로 staged 상태 확인 — 커밋 전이면 전부 staged여야 한다.
- 커밋 전 게이트: `npm test` → `git add -A` → `npm run docs:generate` → `npm run docs:check`. **순서 중요** — 생성 문서는 `git ls-files` 기반이라 stage 전에는 신규 파일을 못 본다.
- 커밋 후 post-commit 훅이 handoff 2개를 고친다 — 별도 `chore(...)` 커밋으로 반영한다(관례: `9f50b11`).

# review-retry-hint — Context Card
<!-- working set only; UTF-8 <= 6 KiB, nonblank lines <= 100 -->

## Now
- Goal: scope 오류 retry 를 원인 종류(`errorKind`)로 고른다 — followups 19
- Current atomic step: PR 생성 + 리뷰 덱 (구현·테스트·문서 완료)
- Stop / human-decision condition: 머지·done·summary 는 사람 몫

## Constraints and settled decisions
- 후보 (B) — `resolveBase`·`resolveScope` 가 `errorKind` 를 싣고 호출부가 retry 를 고른다. `flags.base` 분기 금지
- cause·exit·safeDefault·stop·alternatives·envelope 불변. 문구 정본은 spec 표

## JIT retrieval map
- Identifiers / symbols: `errorKind`, `SCOPE_ERROR_RETRY`, `resolveBase`, `resolveScope`
- Narrow globs: `src/commands/{review,scope}.mjs`, `tests/{review,scope}-command.test.mjs`
- Read next: spec `## 설계 / 접근`
- Verification command: `node --test --test-name-pattern="scope error retry" tests/review-command.test.mjs tests/scope-command.test.mjs`

## Failure capsules (max 3 unresolved)
- (none)

## Resume checklist
- PR 상태·CI annotation 확인 → 리뷰 덱 커밋 여부 확인

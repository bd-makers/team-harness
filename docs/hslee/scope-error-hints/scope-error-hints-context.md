# scope-error-hints — Context Card
<!-- working set only; UTF-8 <= 6 KiB, nonblank lines <= 100 -->

## Now
- Goal: scope alternatives·pr-check base retry 를 `errorKind` 로 고른다(followups 20·21).
- Current atomic step: PR 생성 → AO review 대기(오케스트레이터가 띄운다).
- Stop / human-decision condition: 종류별 문구가 기존 계약을 깨야 하면 ao report 로 멈춤. 머지·done 은 사람.

## Constraints and settled decisions
- cause·exit·envelope·stop·originIsEmpty·review/scope retry 불변. `flags.base` 분기 금지.
- pre-push 는 `default-base`·`diff-failed` 만 덮는다(실측 근거: spec `### 발견`).

## JIT retrieval map
- Identifiers / symbols: `SCOPE_ERROR_ALTERNATIVES`, `BASE_ERROR_RETRY`, `PRE_PUSH_BASE_ERROR_RETRY`, `emitBaseError`
- Narrow globs: `src/commands/{scope,pr-check}.mjs`, `tests/{scope-command,pr-check}.test.mjs`
- Read next: spec `## 설계 / 접근` 두 표
- Verification command: `node --test --test-name-pattern="CLI scope error|pr-check base error retry" tests/scope-command.test.mjs tests/pr-check.test.mjs`

## Resume checklist
- `npm test` · `npm run docs:check` green 확인 후 PR 상태·리뷰 코멘트 확인.

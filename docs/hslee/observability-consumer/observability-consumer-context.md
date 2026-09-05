# observability-consumer — Context Card
<!-- working set only; UTF-8 <= 6 KiB, nonblank lines <= 100 -->

## Now
- Goal: `harness-team observe` — 관측 JSONL 스코어카드 + 트립와이어 2종 (read-only, 발화 시 exit 1).
- Current atomic step: Task 5.2 codex 리뷰 판별·반영 → 5.3 ship → PR.
- Stop / human-decision condition: push·PR·머지는 사용자 지시 후. 임계값 변경은 spec 결정 사항.

## Constraints and settled decisions
- 형태 A(새 하위명령만) · 트립와이어 failure-rate-2x(20·5·2×)+repeat-failure-3x · exit 1 · 훅 파일 import 금지(HMAC 재구현, 테스트로 동일성 고정).

## JIT retrieval map
- Identifiers / symbols: `summarizeObservability`, `readObservabilityRecords`, `resolveTaskRefs`, `runObserve`, `VALUE_FLAGS`
- Narrow globs: `src/commands/observe.mjs`, `tests/observe.test.mjs`, `commands/harness-observe.md`
- Read next: artifact `## Reviews` → plan Task 5
- Verification command: `node --test tests/observe.test.mjs tests/cli-args.test.mjs tests/manifest-sync.test.mjs`; 전체 `npm test`; `npm run docs:check`

## Failure capsules (max 3 unresolved)
- (none)

## Resume checklist
- plan 미완 단계(5.2~5.4)부터. codex 로그: scratchpad codex-review-observe.log(세션 한정).

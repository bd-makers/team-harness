# commit-gate-lint — Context Card
<!-- working set only; UTF-8 <= 6 KiB, nonblank lines <= 100 -->

## Now
- Goal: 커밋 게이트에 package.json `lint` 단계 추가 — 위반 exit 2, 127 경고 후 통과
- Current atomic step: 커밋 후 `npm run test` 전체 → Codex read-only 리뷰
- Stop / human-decision condition: push·PR은 사용자 명시 지시 전 금지

## Constraints and settled decisions
- 사용자 결정 C안(2026-10-05): lint 127만 경고, test 게이트는 127도 차단(불변)
- jq-fallback 블록·timeout 120s 불변, detect_pm bun.lock·heliosent 커스텀 훅은 후속(artifact)

## JIT retrieval map
- Identifiers / symbols: `has_script`, `lint_rc`, `KNOWN_STOCK_HOOK_SHA256`
- Narrow globs: `templates/.claude/hooks/pre-commit-check.sh`, `tests/fixtures/stock-hooks/pre-lint/`
- Read next: `tests/hooks-jq-fallback.test.mjs` (runCommitWithNpm), `tests/migrate-hooks.test.mjs`
- Verification command: `npm run test`, `npm run docs:check`

## Failure capsules (max 3 unresolved)

## Resume checklist
- 이력 완전성 테스트는 HEAD 기준 — 커밋 후 재실행

# deprecated-review-carryover — Context Card
<!-- working set only; UTF-8 <= 6 KiB, nonblank lines <= 100 -->

## Now
- Goal: 0.20.0 이월 기록 누락 정정(완료) + 0.21.0 포워딩 4개 제거 준비
- Current atomic step: PR 리뷰 대기 — 이번 PR 범위는 전부 완료
- Stop / human-decision condition: 홈 머신 hsonpro 전역 CLAUDE.md 전환 확인은 사용자만
  가능 — 확인 전에는 후속 범위(제거)를 시작하지 않는다

## Constraints and settled decisions
- 발행된 `## [0.20.0]` 절은 소급 수정 금지 — 정정은 `## [Unreleased]` `### Notes`에만
- `skills/harness-codex-sim`은 제거 대상 아님(별개 스킬)
- 제거 시 `.claude-plugin/plugin.json` commands 항목 2개도 함께 제거

## JIT retrieval map
- Identifiers / symbols: `harness-codex-review`, `harness-codex-adversarial-review`
- Narrow globs: `commands/harness-codex-*.md`, `skills/harness-codex-*review*/`
- Read next: plan의 "후속 범위 — 0.21.0 제거" 단계
- Verification command: `npm test` (manifest-sync 포함) + `npm run docs:generate`

## Failure capsules (max 3 unresolved)
- (none)

## Resume checklist
- 사용자에게 홈 머신 전환 확인 여부 질문 → 확인되면 plan 후속 범위 실행

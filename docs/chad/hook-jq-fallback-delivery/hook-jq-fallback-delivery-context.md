# hook-jq-fallback-delivery — Context Card
<!-- working set only; UTF-8 <= 6 KiB, nonblank lines <= 100 -->

## Now
- Goal: PR #29 리뷰 후속 6건(P1-1/P1-2/P2-1/P2-2/P2-3/P3-1) 수정 — 구현·검증 완료.
- Current atomic step: 커밋 + PR 생성 (P1~P3 매핑 명시).
- Stop / human-decision condition: PR 리뷰 피드백 대기.

## Constraints and settled decisions
- 훅 refresh 게이트 = "알려진 stock 버전 sha256 바이트 정확 대조" (시그니처 휴리스틱보다 강함).
- 커스터마이즈 훅은 절대 안 덮음 — 안내만. pnpm 시그니처 분기는 그물로 보존.
- jq 경고는 항상 warning (fail++ 금지). 폴백 블록 4훅 바이트 동일 유지.
- bash 이스케이프 디코더는 범위 밖 — \uXXXX 우회는 잔여 리스크로 핀만.

## JIT retrieval map
- Identifiers / symbols: `refreshClaudeHooks`, `KNOWN_STOCK_HOOK_SHA256`, `jqFallbackGaps`,
  `jqInstallAction`, `json_input_field`, `JQ_FALLBACK_MARKER`
- Narrow globs: `src/commands/{migrate,doctor}.mjs`, `templates/.claude/hooks/*.sh`,
  `tests/{migrate-hooks,hooks-jq-fallback,doctor}.test.mjs`, `tests/fixtures/stock-hooks/`
- Read next: (없음 — 구현 완료)
- Verification command: `npm run test` (361/365; e2e 3건은 선재 환경 실패, 아래 F-001)

## Failure capsules (max 3 unresolved)
### F-001
- Signal: e2e apply-smoke 3건 fail — doctor status warning.
- Tried: sandbox에서 doctor --json 직접 실행해 경고 내용 확인.
- Compact finding / current hypothesis: 이 머신의 `~/.claude/plugins/installed_plugins.json`(0.15.2)
  vs 리포(0.16.1) drift 경고. `CLAUDE_PLUGINS_ROOT` 격리 시 success — 본 작업과 무관한 선재 문제.
- Next discriminator: sandbox가 CLAUDE_PLUGINS_ROOT를 격리하면 해소 (별도 task 후보).
- Source (safe path or command): tests/e2e/sandbox.mjs, src/commands/doctor.mjs checkCliDrift

## Resume checklist
- 커밋(한국어 conventional) → PR 생성 → artifact ## Reviews에 리뷰 결과 기록

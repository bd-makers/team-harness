# env-blank-q1q4 — Context Card
<!-- working set only; UTF-8 <= 6 KiB, nonblank lines <= 100 -->

## Now
- Goal: D12 역할 ① 빈칸 보고 — stack `declarations`·요약 축, doctor soft warning. Q2·Q4는 hasDependencies일 때만.
- Current atomic step: codex 리뷰(`--scope diff --base 84dd9fc`) 판별·조치 → artifact `## Reviews`.
- Stop / human-decision condition: 푸시·PR은 메인테이너 지시 후. escalation은 "권장안대로 진행"으로 답함(2026-11-03).

## Constraints and settled decisions
- 파일→질문 지식은 프리셋 `env.declare`에만(D11). 질문 의미(언제 묻나)는 코드 표.
- stack `status`·`next_actions` 불변(spec D-5). doctor는 warning, warnActions 없음, pluginDev로 거르지 않음(D-6).
- `.env.*`는 `file` 존재만(D-7). `node.json`의 `env.packageManager`·`detectPackageManager`는 병행 세션 몫 — 건드리지 않음(D-9).
- 이 브랜치는 PR #165(env-state-q5) 위 — #165 머지 후 base 동기화 필요.

## JIT retrieval map
- Identifiers / symbols: `holds` `firstHolding` `condFile` `detectInstallTrace` `renderSummary` `checkGateFingerprint` `checkPrePushHook`
- Narrow globs: `templates/presets/{node,python}.json` `src/presets.mjs` `src/commands/{stack,doctor}.mjs`
- Read next: `tests/presets.test.mjs:190` · `tests/detect-testing.test.mjs:360-415` · `tests/e2e/init-smoke.test.mjs:45`
- Verification command: `npm test` · `npm run docs:check`

## Failure capsules (max 3 unresolved)

## Resume checklist
- spec `## 원천 검토` D-1–D-9 확인 → escalation 답 반영 → 테스트 red부터.

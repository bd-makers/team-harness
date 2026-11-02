# env-state-q5 — Context Card
<!-- working set only; UTF-8 <= 6 KiB, nonblank lines <= 100 -->

## Now
- Goal: `stack`이 Q5의 설치 축(lockfile 선언 대 설치 흔적)을 관측해 보고한다.
- Current atomic step: 테스트 먼저(red) — presets `installTrace`·stack CLI.
- Stop / human-decision condition: 영향 소스 파일이 4개를 넘거나 새 조건 종류가 필요해지면 멈추고 묻는다.

## Constraints and settled decisions
- 언어 지식은 `templates/presets/*.json` `env.installTrace`에만. 코드는 `firstHolding`·`holds` 재사용.
- envelope 더하기만(`installTrace` 최상위, null | {state, lockfile, trace}). profile에는 넣지 않는다.
- 런타임 버전·빈칸 보고·workspace별·poetry·mtime 신선도는 Out(spec D-1, 범위 절).
- 병행 세션 파일 금지: `src/commands/context.mjs`·TCC 템플릿·`templates/.claude/skills/{fix-bug,new-feature}/SKILL.md`.

## JIT retrieval map
- Identifiers / symbols: `firstHolding`, `holds`, `detectBootstrap`, `renderSummary`, `nextActions`, `runStack`
- Narrow globs: `src/presets.mjs`, `src/commands/stack.mjs`, `templates/presets/{node,python}.json`
- Read next: `tests/detect-testing.test.mjs`(stack CLI 블록), `tests/presets.test.mjs`
- Verification command: `node --test tests/presets.test.mjs tests/detect-testing.test.mjs` → `npm test`

## Failure capsules (max 3 unresolved)

## Resume checklist
- spec `## 원천 검토` D-1–D-6 결정을 읽고, plan의 첫 미완 단계부터 이어간다.

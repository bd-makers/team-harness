# env-state-q5 — Context Card
<!-- working set only; UTF-8 <= 6 KiB, nonblank lines <= 100 -->

## Now
- Goal: `stack`이 Q5의 설치 축(lockfile 선언 대 설치 흔적)을 관측해 보고한다.
- Current atomic step: 구현·리뷰 판별 완료 → 메인테이너 지시 대기(푸시·PR 안 함).
- Stop / human-decision condition: codex 발견이 설계(D-1–D-6)를 뒤집으면 멈추고 묻는다. 푸시·PR 금지.

## Constraints and settled decisions
- 언어 지식은 `templates/presets/*.json` `env.installTrace`에만. 코드는 `firstHolding`·`holds` 재사용.
- envelope 더하기만(`installTrace` 최상위, null | {state, lockfile, trace}). profile에는 넣지 않는다. 평가기 `detectInstallTrace`.
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

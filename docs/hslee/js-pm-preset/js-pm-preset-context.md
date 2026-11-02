# js-pm-preset — Context Card
<!-- working set only; UTF-8 <= 6 KiB, nonblank lines <= 100 -->

## Now
- Goal: JS lockfile→pm 판정을 `node.json` `env.packageManager` + `firstHolding()`으로 옮긴다 — 동작 변화 0.
- Current atomic step: 구현·검증 완료, codex 리뷰 판별 → 커밋 → 메인테이너 지시 대기(푸시·PR 안 함).
- Stop / human-decision condition: codex 발견이 D-1(npm 기본값은 코드)을 뒤집거나 새 조건 종류가 필요해 보이면 멈추고 묻는다.

## Constraints and settled decisions
- 규칙은 lockfile 3개만(`{ when, id }`), npm/null 기본값은 코드(spec D-1). `install` 필드 없음(D-2). `presetEnv('node')`(D-3).
- 호출부 2곳(`detectStack`·`resolveStack`) 무변경 — 함수 본문만(D-4).
- 병행 세션 파일 금지: `src/commands/stack.mjs`·doctor·`node.json`의 `env.packageManager` 밖 블록.
- PR #165(`env-state-q5`) 위의 브랜치 — #165 머지 뒤 base 동기화 필요.

## JIT retrieval map
- Identifiers / symbols: `detectPackageManager`, `firstHolding`, `presetEnv`, `pythonProfile`, `buildProposal`
- Narrow globs: `src/detect-stack.mjs`, `templates/presets/node.json`, `tests/detect-stack.test.mjs`
- Read next: spec `## 설계 / 접근`의 "동작 변화 0의 증명" 1–4
- Verification command: `node --test tests/detect-stack.test.mjs` → `npm test` → `npm run docs:check`

## Failure capsules (max 3 unresolved)

## Resume checklist
- plan의 첫 미완 단계부터 이어간다. 검증 결과는 artifact `## 결과`에 있다.

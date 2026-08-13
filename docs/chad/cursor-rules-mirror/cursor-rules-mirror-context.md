# cursor-rules-mirror — Context Card
<!-- working set only; UTF-8 <= 6 KiB, nonblank lines <= 100 -->

## Now
- Goal: `.claude/rules` → `.cursor/rules` 미러가 `paths:` 스코프를 Cursor `globs:`로 번역하고 하위 디렉터리도 빠뜨리지 않게 한다.
- Current atomic step: plan 전 항목 완료 — 커밋 후 done 대기.
- Stop / human-decision condition: 브랜치가 `fm/th-codex-hooks-template` 위에 쌓여 있다(스택). PR 순서는 사람이 정한다.

## Constraints and settled decisions
- Cursor `globs:`는 쉼표 구분 **문자열**이다(YAML 리스트 아님).
- `paths:` 없는 규칙만 `alwaysApply: true`.
- Node 18 지원이라 `readdir({recursive:true})`(20.1+) 대신 수동 재귀.
- 심볼릭 링크는 따라가되 realpath 집합으로 순환 차단.
- `.claude/rules`는 Claude(+Cursor 미러) 전용 — Codex·Gemini·OpenCode는 못 읽는다. 팀 규칙은 `AGENTS.md`.

## JIT retrieval map
- Identifiers / symbols: `mirrorCursorRules`, `splitRulePaths`, `collectRuleFiles`
- Narrow globs: `src/harness.mjs`, `tests/cursor-rules-mirror.test.mjs`, `tests/e2e/ssot-consistency.test.mjs`
- Read next: 없음 (작업 완료)
- Verification command: `node --test tests/cursor-rules-mirror.test.mjs` / `npm test` / `npm run docs:check`

## Failure capsules (max 3 unresolved)
- (none)

## Resume checklist
- `git log --oneline -3`으로 커밋 상태 확인
- `harness-team done`은 untracked `docs/harness-*-guide.html` 때문에 가드에 걸릴 수 있다(이 task 소유 아님).

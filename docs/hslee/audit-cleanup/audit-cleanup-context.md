# audit-cleanup — Context Card
<!-- working set only; UTF-8 <= 6 KiB, nonblank lines <= 100 -->

## Now
- Goal: 2026-09-03 감사 발견 수정 + `apply` 삭제 + OpenCode·Gemini 멤버 제거(D7), 테스트 green, 외부 리뷰 기록 후 done.
- Current atomic step: plan §5 마지막 — 사용자 커밋 후 `harness-team done`.
- Stop / human-decision condition: 리뷰 BLOCKER 발견 시 재현·판별 후 반영; 커밋·푸시는 사용자 지시로만.

## Constraints and settled decisions
- 쓰기는 단일 스레드(D4). 이력 스냅샷(what-changes-*, *-0.x.html, CHANGELOG 릴리스 절, docs/chad/**)은 소급 수정 금지.
- 문서에 미래 릴리스 번호 금지 — CHANGELOG는 `## [Unreleased]`에만 기록.
- 루트 AGENTS.md·CLAUDE.md 관리 절은 템플릿 렌더와 바이트 일치(tests/agent-files.test.mjs).
- docs:generate 전에 `git add -A` — 인벤토리는 `git ls-files` 기준이라 삭제·신규 파일이 index에 있어야 반영된다.
- "gemini 제거"는 리뷰 엔진 체인까지 포함(codex → claude)으로 해석 — 사용자에게 명시함.

## JIT retrieval map
- Identifiers / symbols: REFRESHABLE_HOOK_FILES, KNOWN_STOCK_HOOK_SHA256, excludesRnRules, resolveStack, KNOWN_STACK_IDS, MarkerMismatchError, resolveHooksDir, printFailures(ctx.mirrorStderr)
- Narrow globs: src/commands/{init,doctor,migrate,boundary}.mjs · src/{harness,merge,detect-stack,git-hooks}.mjs · templates/.claude/hooks/*.sh · tests/{git-hooks,detect-stack,observe-tools-entry,boundary-checkpoint-write,gitignore-entries}.test.mjs
- Read next: docs/hslee/audit-cleanup/audit-cleanup-handoff.md (다음 세션 절차·커밋 메시지 초안) → plan §5
- Verification command: `npm test` (unit+e2e+perf) · `npm run docs:check` · `grep -rn -i -E "opencode|gemini|harness-apply" --exclude-dir=chad .`

## Failure capsules (max 3 unresolved)
(none)

## Resume checklist
- `git status --short | wc -l` = 121 (스테이징만, 커밋 없음) — 0이면 이미 커밋됨
- 남은 단계: 사용자 커밋 → `harness-team done` (리뷰 2회·retro 기록 완료; 가드가 커밋을 요구)

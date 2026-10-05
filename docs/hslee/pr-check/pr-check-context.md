# pr-check — Context Card
<!-- working set only; UTF-8 <= 6 KiB, nonblank lines <= 100 -->

## Now
- Goal: `harness-team pr-check` + init·sync pre-push 훅 + ship 연동 (cycle §6-4)
- Current atomic step: plan 8 리뷰 — codex P2 3건 조치 완료, 새 컨텍스트 리뷰 판별 → 9 커밋·PR(사용자 지시 후)
- Stop / human-decision condition: 커밋·push·PR 생성은 사용자 지시 후

## Constraints and settled decisions
- 강제는 4문서(spec·plan·handoff·artifact)만. PR 다이어그램은 권장 — pr-check는 안내만(사용자 2026-10-06, D11·cycle 정정)
- git pre-commit에 gate 연결 안 함 · pre-push base 판정 실패는 차단
- 판정 = `base...rev` diff가 건드린 task, 커밋(git 객체) 기준. active.json 미사용(gitignore)
- 훅: CLI 부재·구버전 fail-open, 직전 rc 보존, 빈 stdin → 현재 브랜치 판정

## JIT retrieval map
- Identifiers / symbols: collectPrCheck, runPrCheck, prePushTargets, installGitHook, PRE_PUSH_HOOK, DIAGRAM_SKIPPED_PREFIX
- Narrow globs: src/commands/pr-check.mjs, src/git-hooks.mjs, tests/pr-check.test.mjs, tests/git-hooks.test.mjs
- Read next: docs/hslee/pr-check/pr-check-artifact.md (## Reviews)
- Verification command: npm run test && npm run docs:check

## Failure capsules (max 3 unresolved)

## Resume checklist
- 새 컨텍스트 리뷰 결과를 artifact ## Reviews에 판별과 함께 기록
- plan 8 체크 → 사용자에게 커밋·PR 지시 확인

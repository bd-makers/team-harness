# agent-failure-hardening — Context Card
<!-- working set only; UTF-8 <= 6 KiB, nonblank lines <= 100 -->

## Now
- Goal: done 가드 테스트 삭제 오인 등 빈틈 5개(spec R1–R5)를 최소 변경으로 메운다
- Current atomic step: 구현·리뷰 2회·dry-run 완료, 모든 변경 stage됨(커밋 없음) → 사용자 커밋 승인 대기 → 커밋 뒤 `done`
- Stop / human-decision condition: 커밋·push·release 본 실행은 사용자 승인 후. release는 dry-run만

## Constraints and settled decisions
- 워크트리 `.claude/worktrees/agent-failure-hardening`, 브랜치 `fix/agent-failure-hardening`(origin/main 기준, upstream 없음)
- 267520f(release cacheFilter)는 docs/refresh-v0.50에만 있다 — 이 브랜치에 없다
- `cat .env`는 Read deny가 이미 막는다(공식 문서) — 훅은 cp 계열·rm 변형·find -delete·curl|sh만
- 훅은 새 PreToolUse group(matcher Bash)으로 — 기존 group 수정은 기존 설치에서 중복 실행
- jq-fallback 블록은 바이트 동일 복사("훅 4개" 문구 유지, spec Out)

## JIT retrieval map
- Identifiers / symbols: `classifyChangedPaths`·`collectDoneIssues`(task.mjs) · `FRAMING_TEMPLATES` testcritic · `CHECKS`·`JQ_HOOK_FILES`(doctor) · `CLAUDE_HOOK_FILES`(migrate)
- Narrow globs: `tests/done-guard.test.mjs` · `tests/loop-command.test.mjs` · `tests/hooks-jq-fallback.test.mjs` · `tests/review-command.test.mjs`
- Read next: `makeEvidenceFixture`(done-guard.test.mjs ~610)
- Verification command: `node --test tests/done-guard.test.mjs` → 마지막에 `npm test`

## Failure capsules (max 3 unresolved)

## Resume checklist
- 커밋 승인 후: 커밋 → post-commit handoff 갱신분 다음 커밋 → `node bin/harness-team.mjs done`(커밋 0개·미커밋이면 막힌다)
- 후속: rubric 가이드 7행(`docs/refresh-v0.50` 병합 뒤) · release 버전 patch/minor 결정 · 267520f main 반영

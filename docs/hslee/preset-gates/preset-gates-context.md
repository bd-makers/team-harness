# preset-gates — Context Card
<!-- working set only; UTF-8 <= 6 KiB, nonblank lines <= 100 -->

## Now
- Goal: 커밋 게이트·포맷의 언어 지식을 프리셋 데이터로 옮기고 훅은 config 명령 목록만 실행 (cycle §6-3 전반부)
- Current atomic step: plan.md 작성 완료 → 메인테이너 검토·실행 방식 선택 대기, 그다음 다이어그램 단계
- Stop / human-decision condition: plan 검토 전 구현 금지 (§5-A 복잡도 게이트, 영향 파일 5개+)

## Constraints and settled decisions
- 범위 분할: 모양 판별·모노레포·RN rules 프리셋은 다음 task
- 실행기 CLI(`gate commit`, 가칭) + Claude PreToolUse 래퍼 유지, git pre-commit은 4번 task
- gates 미설정 기존 설치: migrate가 제안·확인 후 기록 (`--yes`면 제안 그대로)
- D8 덮지 않음 · D11 훅에 언어 분기 금지 · jq-fallback 블록 동일 유지
- plan 다이어그램 옵트인 = 예
- CLI 부재 → 경고 후 통과 · format = glob → 명령 목록(경로 끝 인수) · 수정 = `gate suggest` · 프리셋 = `templates/presets/`

## JIT retrieval map
- Identifiers / symbols: `KNOWN_STOCK_HOOK_SHA256`, `refreshClaudeHooks`, `detectStack`, `buildProfile`, `JQ_HOOK_FILES`
- Narrow globs: `templates/.claude/hooks/{pre-commit-check,auto-format,boundary-checkpoint}.sh`, `src/commands/{migrate,doctor,init}.mjs`
- Read next: `src/commands/init.mjs` (제안 UI 삽입 지점), `tests/migrate-hooks.test.mjs`
- Verification command: `npm run test` · `npm run docs:check`

## Failure capsules (max 3 unresolved)
- (none)

## Resume checklist
- spec `## 참고`의 (open) 항목부터 확인

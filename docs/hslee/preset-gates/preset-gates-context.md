# preset-gates — Context Card
<!-- working set only; UTF-8 <= 6 KiB, nonblank lines <= 100 -->

## Now
- Goal: 커밋 게이트·포맷의 언어 지식을 프리셋 데이터로 옮기고 훅은 .harness/gates.json 명령 목록만 실행 (cycle §6-3 전반부)
- Current atomic step: 구현·리뷰 반영 완료(plan 전부 [x]) → PR 준비(ship) 대기
- Stop / human-decision condition: PR 생성·push는 메인테이너 지시 후

## Constraints and settled decisions
- 범위 분할: 모양 판별·모노레포·RN rules 프리셋은 다음 task
- 실행기 CLI(`gate commit`, 가칭) + Claude PreToolUse 래퍼 유지, git pre-commit은 4번 task
- gates.json 없는 기존 설치: migrate가 제안·확인 후 기록 (`--yes`면 기존 동작 tsc·test만)
- D8 덮지 않음 · D11 훅에 언어 분기 금지 · jq-fallback 블록 동일 유지
- plan 다이어그램 옵트인 = 예
- CLI 부재 → 경고 후 통과(systemMessage) · 구버전 CLI → 차단 · format = glob → 명령 목록 · 수정 = `gate suggest` · 프리셋 = `templates/presets/`
- 확정 게이트 = 커밋되는 `.harness/gates.json` · `--yes`는 프리셋 `confirm` 항목 제외(리뷰 C1·I4)

## JIT retrieval map
- Identifiers / symbols: `KNOWN_STOCK_HOOK_SHA256`, `refreshClaudeHooks`, `detectStack`, `buildProfile`, `JQ_HOOK_FILES`
- Narrow globs: `templates/.claude/hooks/{pre-commit-check,auto-format,boundary-checkpoint}.sh`, `src/commands/{migrate,doctor,init}.mjs`
- Read next: artifact `## Reviews`(미룬 Minor 6건), `src/presets.mjs`
- Verification command: `npm run test` · `npm run docs:check`

## Failure capsules (max 3 unresolved)
- (none)

## Resume checklist
- spec `## 참고`의 (open) 항목부터 확인

# scaffold-pm-permissions — Context Card
<!-- working set only; UTF-8 <= 6 KiB, nonblank lines <= 100 -->

## Now
- Goal: init이 쓰는 `.claude/settings.json` 권한 목록을 감지된 패키지 매니저·스택에 맞게 생성 (pnpm·Expo 고정 해소)
- Current atomic step: 문서 — `CHANGELOG.md` [Unreleased] Changed 항목(합집합 병합으로 옛 pnpm 항목 잔존 한계 포함); 가이드에 pnpm 권한 서술 없음(README·MAINTAINING 0건, overview 템플릿 언급은 pre-commit 훅 설명)
- Stop / human-decision condition: 템플릿을 JSON이 아닌 형식으로 바꿔야 하거나 merge 계약을 건드려야 하면 멈추고 사용자에게

## Constraints and settled decisions
- 템플릿 JSON 유지, `deepMergeJson`·`mergeClaudeSettings` 계약 불변
- RN 판정은 `excludesRnRules`와 동일 입력(`ctx.flags?.stack ?? ctx.stackId`)
- 기존 프로젝트의 낡은 `pnpm *` 항목 제거는 범위 밖(합집합 병합) — CHANGELOG 한계로 기록
- Done evidence: review required (codex), tests required(기본)

## JIT retrieval map
- Identifiers / symbols: `excludesRnRules`, `planChanges`, `mergeClaudeSettings`, `deepMergeJson`, `buildProfile`, `detectPackageManager`
- Narrow globs: `src/harness.mjs`, `src/detect-stack.mjs`, `src/merge.mjs`, `templates/.claude/settings.json`, `tests/harness-settings.test.mjs`
- Read next: `CHANGELOG.md` [Unreleased] 절 형식(직전 릴리스 Changed 항목 문체), `MAINTAINING.md` 릴리스 크기 판단(① 에이전트 행동 표면)
- Verification command: `npm test` · `npm run docs:check`

## Failure capsules (max 3 unresolved)
- (none)

## Resume checklist
- plan의 현재 미완 단계 확인 → 위 Read next 두 구간만 읽고 시작
- 신규 테스트 파일을 추가했으면 `git add -A && npm run docs:generate` 후 `docs:check`

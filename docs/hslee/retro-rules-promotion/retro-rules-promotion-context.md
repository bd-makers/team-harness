# retro-rules-promotion — Context Card
<!-- working set only; UTF-8 <= 6 KiB, nonblank lines <= 100 -->

## Now
- Goal: artifact `## Learnings` 항목을 사용자 승인 후 기계적으로 `.claude/rules/<slug>.md`(유래 메타 포함)로 승격하는 경로를 만든다 (PDF 권고 ②).
- Current atomic step: 브레인스토밍 — 승격 형태·유래 메타 형식·doctor 범위 질문 → 설계 승인 → spec.md
- Stop / human-decision condition: 설계 승인 전 코드 작성 금지(brainstorming HARD-GATE). PR 생성·머지·릴리스는 사용자 지시.

## Constraints and settled decisions
- D4 단일 스레드: inline 실행만. LLM 자동 승격 배제(승인 후 기계적 이동만).
- retro 명령의 append 계약(artifact SSOT) 불변.
- 새 표면은 이름을 부르는 곳 전부 동시에(cli-args·bin 라우터·commands/*.md·skills/*+openai.yaml·plugin.json·README·CHANGELOG·overview) — manifest-sync가 고정.

## JIT retrieval map
- Identifiers / symbols: `runRetro`, `taskArtifactTemplate`, `copyStaticAssets`, `mirrorCursorRules`, `splitRulePaths`, `checkEagerTierSize`, `COMMANDS`, `VALUE_FLAGS`
- Narrow globs: `src/commands/task.mjs`, `src/harness.mjs`, `src/commands/doctor.mjs`, `src/cli-args.mjs`, `bin/harness-team.mjs`, `tests/{retro,cursor-rules-mirror,doctor,cli-args,manifest-sync}.test.mjs`
- Read next: `docs/hslee/observability-consumer/observability-consumer-{spec,plan}.md` (본보기)
- Verification command: `npm test` · `npm run docs:check`

## Failure capsules (max 3 unresolved)
(none)

## Resume checklist
- `.claude/handoffs/2026-09-05-1750-retro-rules-promotion.md` §1·§3·§8 읽기
- 브랜치 `claude/retro-rules-promotion` 확인, `.harness/active.json` = hslee/retro-rules-promotion

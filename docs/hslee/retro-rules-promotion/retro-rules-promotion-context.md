# retro-rules-promotion — Context Card
<!-- working set only; UTF-8 <= 6 KiB, nonblank lines <= 100 -->

## Now
- Goal: artifact `## Learnings` 항목을 사용자 승인 후 기계적으로 `.claude/rules/<slug>.md`(유래 메타 포함)로 승격하는 경로를 만든다 (PDF 권고 ②).
- Current atomic step: Task 6.3 ship — 문서 최종 커밋 → codex shipcheck(S1~S5) → 준비 완료 보고 → push·PR(사용자 지시 후)
- Stop / human-decision condition: PR 생성·머지·릴리스는 사용자 지시. 리뷰 발견은 재현 후 반영/기각(자동 반영 금지).

## Constraints and settled decisions
- D4 단일 스레드: inline 실행만. LLM 자동 승격 배제(승인 후 기계적 이동만).
- retro 명령의 append 계약(artifact SSOT) 불변.
- 새 표면은 이름을 부르는 곳 전부 동시에(cli-args·bin 라우터·commands/*.md·skills/*+openai.yaml·plugin.json·README·CHANGELOG·overview) — manifest-sync가 고정.

## JIT retrieval map
- Identifiers / symbols: `runRetro`, `taskArtifactTemplate`, `copyStaticAssets`, `mirrorCursorRules`, `splitRulePaths`, `checkEagerTierSize`, `COMMANDS`, `VALUE_FLAGS`
- Narrow globs: `src/commands/task.mjs`, `src/harness.mjs`, `src/commands/doctor.mjs`, `src/cli-args.mjs`, `bin/harness-team.mjs`, `tests/{retro,cursor-rules-mirror,doctor,cli-args,manifest-sync}.test.mjs`
- Read next: `retro-rules-promotion-artifact.md` ## 결과·## Reviews, scratch `codex-review.log`
- Verification command: `npm test` · `npm run docs:check`

## Failure capsules (max 3 unresolved)
(none)

## Resume checklist
- `.claude/handoffs/2026-09-05-1750-retro-rules-promotion.md` §3(머지 후 done·원장 절차)·§8 읽기
- 구현 6커밋 + 리뷰 반영 `506e59a`(7건), npm test 579/580(skip 1) — 남은 것: shipcheck·준비 완료 보고·PR
- 브랜치 `claude/retro-rules-promotion` 확인, `.harness/active.json` = hslee/retro-rules-promotion

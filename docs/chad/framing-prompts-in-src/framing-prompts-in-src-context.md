# framing-prompts-in-src — Context Card
<!-- working set only; UTF-8 <= 6 KiB, nonblank lines <= 100 -->

## Now
- Goal: 프레이밍 프롬프트 7 템플릿 정본을 src 상수로, `--framing`(+`--rubric`)만으로 실행.
- Current atomic step: plan 7단계 — retro 기록 완료, 커밋 대기 → `harness-team done`(가드가 창 내 커밋·테스트 파일 이력을 요구).
- Stop / human-decision condition: 루브릭 문구를 바꿔야 하는 상황이 생기면 멈춘다(범위 밖).

## Constraints and settled decisions
- B 결정(src 상수 + 문서 블록 + pin). testcritic은 `--rubric unit|component|integration`, kind 불변.
- kind·VERIFY_KIND_SUFFIXES·마커·runner·meta 기존 필드 불변. `--prompt-file`은 override.
- task-docs target(contrarian·simplifier): scope 기본값 task-docs, 다른 scope 명시는 거부.
- 다이어그램 없음.

## JIT retrieval map
- Identifiers / symbols: `REVIEW_PROMPT_TEMPLATE`, `buildPrompt`, `buildReviewKind`, `runReview`, `VALUE_FLAGS`, `VERIFY_KIND_SUFFIXES`
- Narrow globs: `src/commands/review*.mjs`, `src/cli-args.mjs`, `tests/review-command.test.mjs`, `commands/harness-{adversarial-review,contrarian,simplifier,ship,unittest,comptest,inttest,review}.md`
- Read next: `src/commands/review.mjs:300-380` (검증 순서), `tests/review-command.test.mjs:155-200` (pin·task-docs)
- Verification command: `npm run test` · `npm run docs:check` · `node bin/harness-team.mjs review codex --framing adversarial`

## Failure capsules (max 3 unresolved)
- (none)

## Resume checklist
- plan 체크박스 확인 → 미완 단계부터. 문서 7종의 `<!-- harness:prompt … -->` 마커가 있으면 문서 단계는 끝난 것.

# eval-defect-triage — Context Card
<!-- working set only; UTF-8 <= 6 KiB, nonblank lines <= 100 -->

## Now
- Goal: eval 결함 후보 6건 판정, 확인된 1·2·3·5만 최소 수정
- Current atomic step: 리뷰·커밋 (수정과 npm run test는 끝남)
- Stop / human-decision condition: 6번(SKILL.md "Codex wrapper" 설명 21개 변경)은 전하 결정 전 손대지 않는다

## Constraints and settled decisions
- 외부 엔진 프롬프트 미러 블록(`harness:prompt`)과 `src/commands/review-prompts.mjs`는 건드리지 않는다
- 4번은 기각(샌드박스 원인·실패 고지됨) — 6번 결정에 묶음
- push 하지 않는다

## JIT retrieval map
- Identifiers / symbols: `taskPlanTemplate`, `nextActions`(stack.mjs)
- Narrow globs: `commands/harness-{simplifier,inttest,contrarian,interview}.md`, `tests/agent-files.test.mjs`
- Read next: artifact `## 결과` 표
- Verification command: `npm run test`

## Failure capsules (max 3 unresolved)

## Resume checklist
- 6번 결정을 받으면 `skills/*/SKILL.md` description 일괄 수정 여부 진행

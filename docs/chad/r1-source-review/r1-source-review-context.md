# r1-source-review — Context Card
<!-- working set only; UTF-8 <= 6 KiB, nonblank lines <= 100 -->

## Now
- Goal: R1 원천 검토를 /harness-interview 단계로 + spec 템플릿 `## 원천 검토 (R1)` 절, 미해결이면 통과 선언 금지(규범 차단)
- Current atomic step: /harness-review codex → artifact Reviews 판별 → 커밋 → pr-check
- Stop / human-decision condition: push·PR은 사용자 승인 후

## Constraints and settled decisions
- 기계 차단 없음(D11). `--framing sourcecheck` 보류 — spec "기각한 대안"
- A1(r2-scenario-evidence)과 병렬: review-prompts.mjs·VERIFY_KIND_SUFFIXES 미변경, 템플릿 변경은 목적 절 다음
- 다이어그램 생략, harness-sim 생략(사용자 결정)

## JIT retrieval map
- Identifiers / symbols: taskSpecTemplate, `## 원천 검토 (R1)`, `## R1 원천 검토`
- Narrow globs: commands/harness-{interview,spec}.md, tests/{task-templates,agent-files}.test.mjs
- Read next: docs/chad/r1-source-review/r1-source-review-spec.md 설계 절
- Verification command: npm run test

## Resume checklist
- golden fixture 재생성: GOLDEN_UPDATE=1 node --test tests/e2e/task-paths-golden.test.mjs

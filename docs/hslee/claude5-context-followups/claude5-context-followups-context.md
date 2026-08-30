# claude5-context-followups — Context Card
<!-- working set only; UTF-8 <= 6 KiB, nonblank lines <= 100 -->

## Now
- Goal: spec 템플릿 rich-references 유도(A) + stack 조건부 rules 복사(B) 구현·검증
- Current atomic step: 커밋 → done → push → PR 생성
- Stop / human-decision condition: done 가드가 막히면 원인 파악 후 보고(강제 우회 금지)

## Constraints and settled decisions
- A: taskSpecTemplate `## 참고` 문구는 브리프 원문 그대로 (pin 테스트 없음, 안전 확인됨)
- B: 게이트는 `ctx.flags.stack`(명시적 플래그)만 본다 — auto-detect 결과는 게이트하지 않음
  (하위 호환 우선). RN 계열 식별자는 `'react-native'`(+ 방어적으로 `'expo'`).

## JIT retrieval map
- Identifiers / symbols: taskSpecTemplate, copyStaticAssets, copyTree, mirrorCursorRules
- Narrow globs: src/commands/task.mjs, src/harness.mjs, src/fsx.mjs
- Read next: (구현 완료 — 테스트 결과만 확인)
- Verification command: npm test

## Failure capsules (max 3 unresolved)
(none)

## Resume checklist
- 커밋(feat) → post-commit hook 결과 확인 → done → push → PR 생성

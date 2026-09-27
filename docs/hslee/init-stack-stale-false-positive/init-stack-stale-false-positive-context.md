# init-stack-stale-false-positive — Context Card
<!-- working set only; UTF-8 <= 6 KiB, nonblank lines <= 100 -->

## Now
- Goal: `init --stack X` 강제 스택을 저장해 doctor stack 절 stale 오탐 + plain init 되돌림 제거
- Current atomic step: 구현·테스트 완료, read-only 리뷰 반영 → artifact 기록 → 로컬 커밋
- Stop / human-decision condition: push·PR은 사용자 승인 전 금지

## Constraints and settled decisions
- 로컬 커밋까지만(push·PR 금지) · 버전 범프 금지 · 의존성 추가 금지
- 결정: A(render-state `stack` 필드) + A-1(`--stack <감지 id>`면 해제), 필드 없음 = 감지(동작 불변)

## JIT retrieval map
- Identifiers / symbols: resolveStack, detectStack, planChanges, loadRenderState, saveRenderState, findStaleManagedSections, migrateManagedSectionBackup
- Narrow globs: src/commands/{init,doctor,migrate}.mjs, src/harness.mjs, src/render-state.mjs, src/detect-stack.mjs
- Read next: spec `## 설계 / 접근` 결정 절
- Verification command: `node --test --test-name-pattern="init --stack 으로 감지와 다른" tests/doctor.test.mjs`

## Failure capsules (max 3 unresolved)
- (none — F-001 해소, 결과는 artifact)

## Resume checklist
- 리뷰 결과 확인 → artifact 결과·Reviews → plan 마지막 단계 체크 → 커밋 → ao report --done

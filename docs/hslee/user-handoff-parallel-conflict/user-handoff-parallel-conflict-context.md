# user-handoff-parallel-conflict — Context Card
<!-- working set only; UTF-8 <= 6 KiB, nonblank lines <= 100 -->

## Now
- Goal: 병렬 PR 사이 `docs/<user>/<user>-handoff.md` 충돌을 구조적으로 제거(진입점 기능 유지)
- Current atomic step: 오케스트레이터 결정 대기(선택지 A~D, 권장 A / migrate 수행 vs 안내)
- Stop / human-decision condition: 결정 수령 전 구현 코드 작성 금지. push·PR 금지.

## Constraints and settled decisions
- 코드 읽기 소비자 0 — session-context는 active.json을 직접 읽는다(확인됨)
- `handoffRelPaths`는 변경하지 않는다(전환기 churn 방지)
- gitignore 패턴 `docs/*/*-handoff.md`는 깊이 2만 매치(임시 repo로 확인)

## JIT retrieval map
- Identifiers / symbols: renderUserHandoff, runHandoffAuto, runDone, handoffRelPaths, appendGitignore, userHandoffRel
- Narrow globs: src/commands/task.mjs, src/harness.mjs, src/task-paths.mjs, tests/user-handoff.test.mjs, tests/handoff-hook-churn.test.mjs
- Read next: spec `## 설계 / 접근` A의 세부 설계
- Verification command: npm test && npm run docs:check

## Failure capsules (max 3 unresolved)
- (none)

## Resume checklist
- 결정 내용을 spec Ambiguity 게이트에 반영 → plan 3단계 체크 → 실패 테스트부터

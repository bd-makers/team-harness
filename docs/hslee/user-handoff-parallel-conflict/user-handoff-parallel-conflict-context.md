# user-handoff-parallel-conflict — Context Card
<!-- working set only; UTF-8 <= 6 KiB, nonblank lines <= 100 -->

## Now
- Goal: 병렬 PR 사이 `docs/<user>/<user>-handoff.md` 충돌을 구조적으로 제거(진입점 기능 유지)
- Current atomic step: 구현·테스트 완료 → codex 리뷰 기록 → 커밋·push·PR·CI
- Stop / human-decision condition: 머지 금지(사람 지시로만). 0.44.3이 main에 먼저 들어가면 갱신(CHANGELOG 양쪽 유지).

## Constraints and settled decisions
- 결정(09-27): 선택지 A, 소비자 migrate는 안내만(인덱스 무변경)
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

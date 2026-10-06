# prepush-existing-installs — Context Card
<!-- working set only; UTF-8 <= 6 KiB, nonblank lines <= 100 -->

## Now
- Goal: followups 12번을 (a)로 닫는다 — 기존 설치본에 `harness-team sync` 1회를 CHANGELOG·README로 안내, 코드 없음.
- Current atomic step: 모든 plan 단계 완료 — PR #127 리뷰·머지 대기
- Stop / human-decision condition: push·PR 생성은 사용자 승인 후.

## Constraints and settled decisions
- (a) 결정(사용자 2026-10-06). migrate 변경 없음(pull, 2차 장치 규칙 — spec에 b·c 기각 사유).
- 다이어그램 생략(사용자 결정). 릴리스 범위 밖.

## JIT retrieval map
- Identifiers / symbols: `checkPrePushHook`, `installPrePushHook`
- Narrow globs: `src/commands/{migrate,sync,init}.mjs`, `src/git-hooks.mjs`
- Read next: CHANGELOG.md `[Unreleased]` Added 첫 두 항목, README `pr-check` 절
- Verification command: `npm run test`

## Failure capsules (max 3 unresolved)
- (none)

## Resume checklist
- 머지 후 main에서 task done.

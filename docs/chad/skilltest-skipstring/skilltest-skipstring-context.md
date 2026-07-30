# skilltest-skipstring — Context Card
<!-- working set only; UTF-8 <= 6 KiB, nonblank lines <= 100 -->

## Now
- Goal: `skipString` raw 개행 스패닝 수정으로 본문·선언부 오파싱 두 발현 제거.
- Current atomic step: 구현·검증·문서화 완료 — 커밋 `10a4914`에 기록됨.
- Stop / human-decision condition: task 완료 처리는 사용자 확인이 필요하다.

## Constraints and settled decisions
- 토큰화기 수정은 2026-07-30 선장 승인 범위.
- 백틱 템플릿은 개행을 계속 허용한다.
- 외부 의존성·채점 규칙·출력 형식 변경 금지.
- A2는 불필요: 근본 수정만으로 회귀 fixture가 `declared=2`, `bodies=2`, PASS를 회복.

## JIT retrieval map
- Identifiers / symbols: `skipString`, `scanNonCode`, `findDeclarations`, `testBodies`, `scoreGWT`.
- Narrow globs: `tests/sim/skilltest.mjs`, `docs/chad/skilltest-{ast-grader,skipstring}/`.
- Read next: 재개 시 `skilltest-skipstring-artifact.md`와 `tests/sim/skilltest.mjs:167`.
- Verification command: `node tests/sim/skilltest.mjs selftest`; `npm run test`.

## Failure capsules (max 3 unresolved)
- none — 본문·선언부 오파싱 회귀는 65/65 selftest로 해소됨.

## Resume checklist
- 구현 작업은 없다. 재개 시 artifact의 RED→GREEN 증거와 A2 판정을 먼저 확인한다.

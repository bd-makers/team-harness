# doctor-decision-headings — Context Card
<!-- working set only; UTF-8 <= 6 KiB, nonblank lines <= 100 -->

## Now
- Goal: doctor `checkDecisionLog`가 D6·D7 누락도 경고하게 한다.
- Current atomic step: 구현·리뷰 완료. 커밋·PR 여부는 사용자 결정 대기.
- Stop / human-decision condition: 커밋·PR·done은 사용자 지시 후. fenced-block 파싱(codex P2 기각)은 별도 결정.

## Constraints and settled decisions
- warn 수준·throw 금지·라인 앵커 `\b` 매칭은 유지한다.
- 부재 메시지의 절 ID는 `DECISION_HEADINGS`에서 파생한다(리터럴 재드리프트 방지).
- 다이어그램 옵트인: 아니오. 전역 `harness-team` 대신 `node bin/harness-team.mjs` 사용(D7).

## JIT retrieval map
- Identifiers / symbols: `DECISION_HEADINGS`, `checkDecisionLog`, `makeDecisionLogFixture`
- Narrow globs: `src/commands/doctor.mjs`, `tests/doctor.test.mjs`
- Read next: artifact Reviews 절 → plan 미완 단계
- Verification command: `node --test --test-name-pattern=checkDecisionLog tests/doctor.test.mjs`; 전체 `npm test`

## Failure capsules (max 3 unresolved)
- (none)

## Resume checklist
- plan 단계 체크 상태 확인 → 미완 단계부터.

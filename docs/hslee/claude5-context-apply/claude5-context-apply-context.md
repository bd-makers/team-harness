# claude5-context-apply — Context Card
<!-- working set only; UTF-8 <= 6 KiB, nonblank lines <= 100 -->

## Now
- Goal: Claude 5 컨텍스트 블로그 권고 4건 반영 (auto-memory 경계·CLAUDE.md 감량·doctor eager 경고·session-context 캡)
- Current atomic step: 구현·테스트·codex 리뷰 반영 완료 — 커밋 후 done 판단만 남음
- Stop / human-decision condition: PR/MR 생성·병합·done 처리는 사용자 지시 대기

## Constraints and settled decisions
- AGENTS.md는 손대지 않았다 — 다중 엔진 공유 규범 (spec 참조)
- eager 예산 24 KiB(`EAGER_TIER_MAX_BYTES`), doctor 경고만 · session-context 캡 8(`SESSION_CONTEXT_MAX_TASKS`)
- codex P2·P3 반영: stat try/catch 포함, tie-break user→name
- 후속 후보(이번 범위 제외): spec rich-references 섹션, stack 조건부 rules 복사

## JIT retrieval map
- Identifiers / symbols: `EAGER_TIER_MAX_BYTES`(doctor.mjs), `SESSION_CONTEXT_MAX_TASKS`·`listIncompleteTasks`(session-context.mjs)
- Narrow globs: `templates/CLAUDE.md.hbs`, `src/commands/{doctor,session-context}.mjs`, `tests/{doctor,session-context,agent-files}.test.mjs`
- Read next: (없음 — 작업 완료 상태)
- Verification command: `npm run test` (463 pass / 1 skip 기준선)

## Failure capsules (max 3 unresolved)

## Resume checklist
- plan.md 전 항목 [x] — 남은 건 사용자 결정(PR/병합/done)
- 검토 아티팩트 페이지 URL·리뷰 기록은 artifact.md 참조

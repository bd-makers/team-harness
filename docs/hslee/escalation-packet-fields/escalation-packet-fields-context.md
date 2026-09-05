# escalation-packet-fields — Context Card
<!-- working set only; UTF-8 <= 6 KiB, nonblank lines <= 100 -->

## Now
- Goal: escalation packet(envelope `error` 3필드 + CLAUDE.md §5-A 1줄 권유)에 PDF 권고 ③의 "시도한 대안·안전 기본값"을 더한다.
- Current atomic step: 브레인스토밍 — 범위(envelope/§5-A/둘 다)·필드 필수성·스키마 질문 → 설계 승인 → spec.md
- Stop / human-decision condition: 설계 승인 전 코드 작성 금지. PR·머지·릴리스는 사용자 지시.

## Constraints and settled decisions
- D4 단일 스레드 inline. 계약 변경은 additive를 우선하고 기존 소비자(3키 읽기)를 깨지 않는다.
- 새 표면은 이름을 부르는 곳 전부 동시에(테스트 pin·overview 템플릿·CLAUDE.md 템플릿+저장소 CLAUDE.md 동기).

## JIT retrieval map
- Identifiers / symbols: `buildEnvelope`, `emitObservation`, `ERROR_ADVICE`, `fail(` (summary·observe·rules), `runDone`, `collectDoneIssues`
- Narrow globs: `src/observation.mjs`, `src/commands/{release,summary,observe,task,doctor,rules}.mjs`, `tests/observation*.test.mjs`, `templates/CLAUDE.md.hbs` §5-A, `docs/harness-overview.template.html:379-394`
- Read next: `.claude/handoffs/2026-09-05-1330-harness-pdf-6layer-comparison.evidence.md` #16, PDF §V.A "Escalation Is Not Failure"
- Verification command: `npm test` · `npm run docs:check`

## Failure capsules (max 3 unresolved)
(none)

## Resume checklist
- 브랜치 `claude/escalation-packet-fields`(origin/main a0266b2 기준), `.harness/active.json` = hslee/escalation-packet-fields

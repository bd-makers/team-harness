# escalation-packet-fields — Context Card
<!-- working set only; UTF-8 <= 6 KiB, nonblank lines <= 100 -->

## Now
- Goal: escalation packet(envelope `error` 3필드 + CLAUDE.md §5-A 1줄 권유)에 PDF 권고 ③의 "시도한 대안·안전 기본값"을 더한다.
- Current atomic step: plan Task 1 — `buildErrorPacket`/`renderErrorPacket` RED(테스트 먼저) → GREEN
- Stop / human-decision condition: 설계 승인됨(2026-09-05). PR·머지·릴리스는 사용자 지시.

## Constraints and settled decisions
- D4 단일 스레드 inline. additive(스키마 v1 유지) · `buildEnvelope`는 pass-through 유지(deepEqual pin 보존).
- 강제는 `buildErrorPacket` 한 곳. JSON 생산자는 `cause`에 string만, 배열은 text 전용(runDone).
- 새 표면은 이름을 부르는 곳 전부 동시에(테스트 pin·overview 템플릿·CLAUDE.md 템플릿+저장소 CLAUDE.md 동기).

## JIT retrieval map
- Identifiers / symbols: `buildErrorPacket`, `renderErrorPacket`, `buildEnvelope`, `ERROR_ADVICE`, `fail(`, `runDone`
- Narrow globs: `src/observation.mjs`, `src/commands/{release,summary,observe,task,doctor,rules}.mjs`, `tests/observation*.test.mjs`, `templates/CLAUDE.md.hbs` §5-A, `docs/harness-overview.template.html:379-394`
- Read next: `<name>-plan.md` Task 1~11 (실행 순서·코드 포함), `<name>-spec.md`
- Verification command: `npm test` · `npm run docs:check`

## Failure capsules (max 3 unresolved)
(none)

## Resume checklist
- 브랜치 `claude/escalation-packet-fields-380f1f` (구 `claude/escalation-packet-fields`는 다른 워크트리가 점유 — checkout 불가)
- `.harness/active.json`은 워크트리별·gitignore → 새 세션은 `task escalation-packet-fields`로 재활성화

# adversarial-verify-rubric — Context Card
<!-- working set only; UTF-8 <= 6 KiB, nonblank lines <= 100 -->

## Now
- Goal: 적대적 검증(D6) 규범 + testcritic/shipcheck 루브릭을 문서·테스트에 심는다 (1–2단계)
- Current atomic step: codex 외부 리뷰 결과 반영 → artifact 기록 → 커밋
- Stop / human-decision condition: 3단계(contrarian/simplifier external)·4단계(src 변경)는 별도 지시 후 착수

## Constraints and settled decisions
- decisions.md ↔ templates/docs/decisions.md는 byte-identical (테스트 강제) — 수정 시 cp로 미러
- AGENTS.md roles 관리 절은 templates/AGENTS.md.hbs와 짝수정 (드리프트 테스트 강제)
- 검증자는 read-only, 자동 수정 루프 금지 — 발견은 driver가 재현·판별 후 반영
- kind 접미사: `<engine>-adversarial`·`-testcritic`·`-shipcheck` (done 가드는 kind 목록 대조 안 함)
- 다이어그램 옵트아웃 (사용자 선택), 범위: 1–2단계만

## JIT retrieval map
- Identifiers / symbols: `kind=<engine>-`, `검증자 인계`, `정합 검증`, `## D6 (2026-08-26)`
- Narrow globs: commands/harness-{review,ship,unittest,comptest,inttest}.md, templates/AGENTS.md.hbs
- Read next: tests/agent-files.test.mjs (D6 pin 테스트 2개, decisions 동일성 테스트)
- Verification command: npm run test:unit && npm run docs:check

## Failure capsules (max 3 unresolved)

## Resume checklist
- plan.md 미체크 항목: 외부 리뷰 기록·커밋
- 후속 task 후보: 3단계(contrarian/simplifier external·interview 채점 선행), 4단계(done 가드 verify 키·kind allowlist)

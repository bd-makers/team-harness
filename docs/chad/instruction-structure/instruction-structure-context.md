# instruction-structure — Context Card
<!-- working set only; UTF-8 <= 6 KiB, nonblank lines <= 100 -->

## Now
- Goal: 지시 구조 중복 제거 + lazy 정본 이관 (spec P1~P5)
- Current atomic step: templates 편집 (decisions.md 신설 → AGENTS/CLAUDE hbs 슬림화)
- Stop / human-decision condition: 테스트 의도(3표면 계약)를 새 설계로 바꿀 때 의도 훼손이 의심되면 중단

## Constraints and settled decisions
- 수정 기점 = templates/*.hbs; 루트 파일 마커 절은 템플릿과 동일해야 함 (drift 테스트)
- 다이어그램 요약은 AGENTS.md에 도구 중립 1블록 유지 (Codex/OpenCode는 commands/ 못 읽음)
- 다이어그램 옵트인: 아니오 (2026-08-21)
- 전역 CLAUDE.md 수정은 이 머신만 — hsonpro 머신은 사용자 수동 반영 필요

## JIT retrieval map
- Identifiers / symbols: taskSpecTemplate, AGENT_FILE_TEMPLATES, extractSections, copyStaticAssets
- Narrow globs: templates/*.hbs, tests/agent-files.test.mjs, tests/task-templates.test.mjs
- Read next: tests/task-templates.test.mjs, tests/ship-command.test.mjs
- Verification command: npm run test

## Failure capsules (max 3 unresolved)

## Resume checklist
- plan.md 체크박스 순서대로; 테스트 재작성 전 기존 assert 의도 주석 확인

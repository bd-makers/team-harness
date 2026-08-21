# instruction-structure — Context Card
<!-- working set only; UTF-8 <= 6 KiB, nonblank lines <= 100 -->

## Now
- Goal: 지시 구조 중복 제거 + lazy 정본 이관 (spec P1~P5)
- Current atomic step: Codex 리뷰 P2 조치 — 사용자 지시 대기 (P2-2 예외·guide, P2-3 TCC 문구/메시지)
- Stop / human-decision condition: P2 수정 여부·범위는 사용자 결정 (review-only 계약)

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

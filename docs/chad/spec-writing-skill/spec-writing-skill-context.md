# spec-writing-skill — Context Card
<!-- working set only; UTF-8 <= 6 KiB, nonblank lines <= 100 -->

## Now
- Goal: /harness-spec 커맨드/스킬 추가 — Confluence·Figma·인터뷰 3소스에서 활성 task spec 초안 생성
- Current atomic step: PR 생성(main 대상) → 머지 후 summary --write·task done·릴리스
- Stop / human-decision condition: 커밋/PR 여부는 사용자 결정

## Constraints and settled decisions
- agent workflow 커맨드 (CLI 서브커맨드 아님) — harness-interview 패턴
- MCP 우선 + 수동 붙여넣기 폴백, specSources는 첫 실행 시 lazy 수집
- writer(/harness-spec) / validator(/harness-interview) 역할 분리 — writer는 게이트 통과 선언 금지
- config 저장은 read-modify-write (기존 키 보존), malformed JSON이면 중단

## JIT retrieval map
- Identifiers / symbols: printTaskNextActions, taskSpecTemplate, specSources
- Narrow globs: commands/harness-spec.md, skills/harness-spec/**, src/commands/task.mjs
- Read next: docs/chad/spec-writing-skill/spec-writing-skill-artifact.md (Reviews)
- Verification command: npm run test && node scripts/generate-harness-overview.mjs --check

## Failure capsules (max 3 unresolved)
- (none)

## Resume checklist
- 구현·리뷰 3회(1차 codex 10건, 2차 P1/P3, 3차 P2) 조치 완료 — artifact Reviews 참조
- 커밋 전 handoff 꼬리 트림 루틴 유지 (전역 CLI가 구버전 캐시 — 머지+릴리스 전까지)
- 남은 것: PR 생성 → 머지 → 기본 브랜치에서 summary --write → task done → 릴리스(범프+캐시 동기화)
- 대화형 드라이런은 미수행 (plan 마지막 항목) — 실사용 첫 /harness-spec 실행으로 검증

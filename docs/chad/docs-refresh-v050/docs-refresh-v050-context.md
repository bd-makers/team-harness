# docs-refresh-v050 — Context Card
<!-- working set only; UTF-8 <= 6 KiB, nonblank lines <= 100 -->

## Now
- Goal: docs/index.html이 링크하는 상시 문서 8개를 v0.50.0 기준으로 맞추고 기준 버전 표기
- Current atomic step: plan 2 — 문서별 낡은 지점 조사(서브에이전트 4개, 읽기 전용)
- Stop / human-decision condition: 조사 결과가 문서 구조 개편(삭제·재작성 수준)을 요구하면 사용자에게 확인

## Constraints and settled decisions
- 버전 스냅샷 파일(*-0.x.html)은 고치지 않는다(사용자 결정 2026-10-12)
- .md 링크·코드·templates/ 범위 밖
- 다이어그램은 inline SVG, script 의존 금지
- 쓰기는 메인 세션 단일 스레드(D4)

## JIT retrieval map
- Identifiers / symbols: `tag tag-purple`, `v0.50.0`
- Narrow globs: docs/harness-{cheatsheet,task-guide,workflow-diagrams,workflow-schematics,rubric-guide,onboarding-checklist,kickoff-deck,operations-playground}.html
- Read next: docs/harness-overview.html(기준 문서), CHANGELOG.md
- Verification command: grep -L 'v0.50.0' <8 files>; npm run test

## Failure capsules (max 3 unresolved)

## Resume checklist
- 브랜치 docs/refresh-v0.50 확인 → plan 미완 단계부터

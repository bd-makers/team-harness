# team-onboarding-kit — Context Card
<!-- working set only; UTF-8 <= 6 KiB, nonblank lines <= 100 -->

## Now
- Goal: 팀 전달용 진입로·실행물 4종을 docs/에 만들고 index.html이 역할별로 라우팅하게 한다
- Current atomic step: 커밋 → /harness-ship → PR 준비 보고 (산출물 5개는 작성·검증 완료)
- Stop / human-decision condition: PR 생성·push는 사용자 지시를 받고 한다

## Constraints and settled decisions
- 자립형 HTML — CDN 금지, inline SVG (Obsidian이 script 제거)
- 기존 문서 6종을 다시 쓰지 않는다. 링크·요약으로 재사용한다
- 코드·templates/·훅 무변경. docs/ 안에서만
- 치트시트만 밝은 종이 테마 (인쇄 대상), 나머지는 index.html 다크 팔레트 계열
- 이 산출물은 파생물 — 규약이 바뀌면 AGENTS.md 등 정본을 먼저 고치고 따라 고친다
- 덱 문구는 사용자 승인으로 확정 (14장 "가급적", 15장 7개 전체)

## JIT retrieval map
- Identifiers / symbols: `.routes` / `.route` (index.html 진입로 카드), `SLIDES` (덱), `PHASES` (체크리스트), `verifySources()` (구성기 verify 판정)
- Narrow globs: docs/harness-{operations-playground,onboarding-checklist,kickoff-deck,cheatsheet}.html, docs/index.html
- Read next: 없음 — 산출물 완성. 재개 시 plan.md 미완 2단계만 보면 된다
- Verification command: `npm run docs:check` · index 링크·앵커 해석 스크립트 · headless Chrome 렌더 측정

## Failure capsules (max 3 unresolved)
- (none unresolved — 아래 2건은 해소됨, 상세는 artifact.md Learnings)

## Resume checklist
- `git status`로 docs/ 5개 변경이 남아 있는지 확인
- plan.md 미완 단계 2개(커밋 · ship)만 수행
- 치트시트를 고쳤다면 A4 1페이지를 headless Chrome PDF로 다시 확인

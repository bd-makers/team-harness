# diagram-optin — Context Card
<!-- working set only; UTF-8 <= 6 KiB, nonblank lines <= 100 -->

## Now
- Goal: spec/plan 다이어그램 옵트인을 문서 전용으로 추가 (질문 1회, plan.md가 상태)
- Current atomic step: PR #26 리뷰 대기 (머지 금지 — 사람 판단)
- Stop / human-decision condition: PR 머지·릴리스는 사람 판단. `release`·main 직접 푸시 금지.

## Constraints and settled decisions
- 별도 옵트인 저장소 금지: `.harness/config.json` 키·doctor 체크·상태 파일 없음. plan.md가 곧 상태.
- 질문은 CLI가 아니라 `commands/harness-task.md`가 소유 → `src/` 무변경.
- `AGENTS.md`는 멀티에이전트 SSOT라 도구 중립. Claude 전용 호출은 CLAUDE.md·commands에만.
- 도구 부재 시 실패 금지 — skip 후 artifact에 "미실행" (probe → degrade → record).
- 산출물 `<name>-diagram.html`은 자립형 inline SVG (Obsidian이 script 제거).
- 루트 파일과 `templates/*.hbs`는 반드시 쌍으로. 버전 범프 금지.

## JIT retrieval map
- Identifiers / symbols: `harness:section="protocol"`, `### 1-B.`, `<name>-diagram.html`
- Narrow globs: `templates/*.hbs`, `commands/harness-task.md`, `tests/agent-files.test.mjs`
- Read next: (없음 — 구현 완료)
- Verification command: `npm run test` · `npm run docs:check`

## Failure capsules (max 3 unresolved)
(none — 미해결 실패 없음)

## Resume checklist
- PR #26 상태·CI 확인 (브랜치 `ao/harness-aijient-team-plugin-3/diagram-optin`)
- W3(`/harness-ship`)와 CHANGELOG `[Unreleased]`·AGENTS.md 충돌 시 rebase — 상대 변경 삭제 금지

# prerequisites-doc — Context Card
<!-- working set only; UTF-8 <= 6 KiB, nonblank lines <= 100 -->

## Now
- Goal: 사전 준비를 능력 매트릭스로 문서화 + doctor `EXTERNAL_TOOLS`와 양방향 테스트로 고정
- Current atomic step: 커밋 → 최신 main으로 rebase → PR open (머지 금지)
- Stop / human-decision condition: W4(#28) README 충돌 시 rebase로 풀되 상대 변경 삭제 금지;
  W8(#29 jq fail-closed)이 먼저 머지되면 §3 표현을 fail-closed 기준으로 조정

## Constraints and settled decisions
- 훅 코드 변경 금지 (W8 담당) · `templates/` 금지 · 버전 범프 금지 · main 직접 push/merge 금지
- `harness-team` 어떤 서브커맨드에도 `--help` 금지 (과거 release 사고)
- README는 3지점만: 목차 1줄 / `## 설치` 앞 새 절 / 기존 `### 요구사항` 축약. 명령어 레퍼런스 무단속
- CHANGELOG는 `[Unreleased]` 기존 Added·Changed 절에 이어붙이기 (새 헤더 금지)
- 다이어그램: 옵트인 질문에 "아니오" → plan에 단계 없음

## JIT retrieval map
- Identifiers / symbols: `EXTERNAL_TOOLS` (src/commands/doctor.mjs:16, export됨),
  `sourceTreeEntries` (scripts/generate-harness-overview.mjs:11), `detectMember` (src/member.mjs),
  `installPostCommitHook` (src/git-hooks.mjs)
- Narrow globs: `docs/prerequisites.md`, `tests/prerequisites-doc.test.mjs`,
  `templates/.claude/hooks/*.sh`
- Read next: (없음 — 구현 완료)
- Verification command: `npm run test` (302 pass) · `npm run docs:check`

## Failure capsules (max 3 unresolved)
(없음 — 미해결 실패 없음)

## Resume checklist
- `git log --oneline -3` 로 커밋 여부 확인
- `git fetch origin main && git rebase origin/main` — #28(W4 README) 충돌 가능
- `gh pr list --head ao/harness-aijient-team-plugin-7/prerequisites-doc` 로 PR 상태 확인
- `npm run test && npm run docs:check` 재실행 (rebase 후 필수 — 새 파일 추가 시 docs 재생성 필요)

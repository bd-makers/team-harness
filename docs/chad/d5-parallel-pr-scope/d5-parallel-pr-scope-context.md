# d5-parallel-pr-scope — Context Card
<!-- working set only; UTF-8 <= 6 KiB, nonblank lines <= 100 -->

## Now
- Goal: AGENTS.md D4 아래에 D5(2026-08-20) append — 단일 스레드 쓰기 범위를 "같은 워킹트리·브랜치"로
  정정하고 격리 브랜치/worktree + PR 병합을 허용 경로로 명문화. 문서 전용.
- Current atomic step: 커밋 → main 대상 PR 오픈(머지 금지) → plan 체크 + artifact 기록
- Stop / human-decision condition: PR 머지, 버전 범프, 릴리스는 사람 결정. 절대 자동 수행 금지.

## Constraints and settled decisions
- D4 원문 무수정 — append-only 결정 원장. D5는 반전이 아니라 범위 정정.
- 쌍 편집 필수: 루트 파일 ↔ `templates/*.hbs`. 관리 절은 문자 단위로 대조된다.
- 고정 문자열 보존: `**D2 (2026-06-11)`, `**D4 (2026-07-28)`, `동시에 병렬로 쓰지 않는다`,
  `병렬 작성·결정 에이전트는 두지 않는다`, `쓰기는 단일 스레드로 유지한다`, `컨텍스트 격리 서브에이전트`.
- 역할 표 행(`| **…`)에는 `병렬`이 등장하면 안 된다 — D5는 blockquote라 무관.
- 금지: `src/` 변경, 버전 범프, `harness-team release`, main 직접 푸시, 어떤 서브커맨드에도 `--help`.

## JIT retrieval map
- Identifiers / symbols: `harness:section="roles"`, `extractSections`, `roleRows`, `AGENT_FILE_TEMPLATES`
- Narrow globs: `templates/{AGENTS,CLAUDE}.md.hbs`, `tests/agent-files.test.mjs`,
  `tests/e2e/ssot-consistency.test.mjs`
- Read next: (없음 — 편집 완료)
- Verification command: `npm run test` (290 pass / 0 fail + perf 1 pass, 2026-08-20)

## Failure capsules (max 3 unresolved)
- (none)

## Resume checklist
- 편집 완료 파일: `AGENTS.md`, `templates/AGENTS.md.hbs`, `CLAUDE.md`, `templates/CLAUDE.md.hbs`,
  `CHANGELOG.md`([Unreleased], 범프 없음)
- 브랜치: `ao/harness-aijient-team-plugin-2/d5-parallel-pr-scope`

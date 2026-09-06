# eager-tier-slimming — Context Card
<!-- working set only; UTF-8 <= 6 KiB, nonblank lines <= 100 -->

## Now
- Goal: 프로젝트 eager 소계(AGENTS.md + CLAUDE.md) 19,327 B → 17,500 B 이하. 삭제가 아니라 lazy 정본으로 이전.
- Current atomic step: T1 — `tests/agent-files.test.mjs`에 소계 상한 가드 추가 (RED 확인까지)
- Stop / human-decision condition: 이전 대상이 도구 중립성을 잃을 때(= `commands/`로만 옮겨져 Codex·Cursor에서 사라질 때) 멈추고 묻는다.

## Constraints and settled decisions
- 목표는 프로젝트 소계로만 잰다 — 전역 `~/.claude/CLAUDE.md`는 머신 의존이라 제외(2026-09-07 사용자 결정).
- `commands/*.md`는 Claude 전용 표면. Codex·Cursor 도달 표면은 `AGENTS.md`·`skills/*/SKILL.md`·`templates/**`.
- 이전 금지: CLAUDE.md `### 5-A 복잡도 게이트`, AGENTS.md `### JIT retrieval 프로토콜` (상황 인식형).
- 수정 기점은 `templates/*.hbs`, 루트 파일은 마커 절을 동일 내용으로 갱신(드리프트 테스트가 강제).
- 실행은 inline(D4: 같은 워킹트리 쓰기는 단일 스레드). subagent-driven 기각.
- 구조 개편(3 KB+ 감축)은 범위 밖 — 소비자 전파가 넓어 되돌리기 어렵다.

## JIT retrieval map
- Identifiers / symbols: `PROJECT_EAGER_MAX_BYTES`, `EAGER_TIER_MAX_BYTES`(doctor), `extractSections`, `AGENT_FILE_TEMPLATES`
- Narrow globs: `templates/AGENTS.md.hbs`, `AGENTS.md`, `templates/CLAUDE.md.hbs`, `CLAUDE.md`, `commands/harness-task.md`, `tests/agent-files.test.mjs`
- Read next: `tests/agent-files.test.mjs:26-42`(드리프트 루프 — 새 테스트는 그 아래 추가)
- Verification command: `node --test tests/agent-files.test.mjs`

## Failure capsules (max 3 unresolved)
(없음)

## Resume checklist
- plan의 `## 단계`에서 첫 미완 `- [ ]`을 찾아 그 Task부터 이어간다.
- 절 크기 재측정: spec `## 설계 / 접근`의 표와 같은 방법(절 헤딩 단위 UTF-8 바이트).
- 매 Task 끝에 `npm test` · `doctor` · `docs:check` 3종.

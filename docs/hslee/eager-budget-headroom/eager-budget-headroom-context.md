# eager-budget-headroom — Context Card
<!-- working set only; UTF-8 <= 6 KiB, nonblank lines <= 100 -->

## Now
- Goal: AGENTS.md protocol 절 압축으로 eager 여유 ≥ 1 KB (규범 의미 불변)
- Current atomic step: 커밋 완료 → PR 생성은 전하 지시 대기, 머지 후 plan 마지막 단계 체크 → done
- Stop / human-decision condition: push·PR은 명시 승인 필요

## Constraints and settled decisions
- `PROJECT_EAGER_MAX_BYTES` 17,500 상향 금지. 루트·템플릿 protocol 절 동일.
- Cursor는 commands/ 를 못 읽는다 → 규칙 문장은 AGENTS에 남기고 근거·상세만 lazy로.
- 결과: 16,425 B (여유 1,075 B).

## JIT retrieval map
- Identifiers / symbols: `PROJECT_EAGER_MAX_BYTES`, `harness:section="protocol"`
- Narrow globs: `tests/agent-files.test.mjs`, `commands/harness-{task,interview,diagram}.md`
- Read next: artifact `## Reviews`
- Verification command: `wc -c AGENTS.md CLAUDE.md && npm test`

## Failure capsules (max 3 unresolved)
### F-001
- Signal: `codex exec` 401 Incorrect API key `sk-svcac…` (재로그인 후에도)
- Tried: `codex login`(성공), `-p headless`(프로필 파일 없음)
- Compact finding / current hypothesis: 로컬에 해당 키 없음 — 계정/서버 측 추정
- Next discriminator: 다른 머신 또는 `codex login --device-auth` 로 재현
- Source (safe path or command): `harness-team review codex`

## Resume checklist
- PR 머지 확인 → plan "커밋·PR" 체크 → `harness-team done`

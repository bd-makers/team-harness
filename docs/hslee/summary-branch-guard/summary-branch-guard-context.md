# summary-branch-guard — Context Card
<!-- working set only; UTF-8 <= 6 KiB, nonblank lines <= 100 -->

## Now
- Goal: `summary --write` 가드를 브랜치 이름이 아니라 HEAD == `origin/<기본브랜치>` 로 판정
- Current atomic step: codex 리뷰 결과 반영 → ship (구현·테스트·CHANGELOG·E2E 는 끝)
- Stop / human-decision condition: PR 생성은 사용자 지시가 있어야 한다. `[Unreleased]` 릴리스
  여부(0.30.0 후보)도 별도 결정.

## Constraints and settled decisions
- 정확 동일성만 인정 — ancestor(ahead/behind) 불인정
- fail-closed 유지: `rev-parse` 실패는 전부 기존 거부로 떨어진다
- 범위 밖: detached HEAD · 거부 메시지 문구 · `defaultBranchCandidates`
- 후보 여러 개일 때 아무거나 매칭하는 느슨함은 이름 판정이 이미 갖던 성질 — 주석으로 명시
- 이 브랜치는 cherry-pick 탓에 ahead다 → 여기서 `summary --write` 를 시연하지 않는다

## JIT retrieval map
- Identifiers / symbols: `isSyncedWithDefault` · `runSummary` · `branchState` · `defaultBranchCandidates`
- Narrow globs: `src/commands/summary.mjs` · `tests/summary.test.mjs`
- Read next: 리뷰 결과 파일 → artifact `## Reviews`
- Verification command: `node --test tests/summary.test.mjs` (20/20) · `npm test` (603/602/0/1 + perf 1)

## Failure capsules (max 3 unresolved)
*미해결 없음. 해소된 것은 artifact Learnings 로 옮겼다 (mutation A 미커버 경로).*

## Resume checklist
- 활성 task 설정돼 있는지 확인 (`.harness/active.json` — 새 워크트리에는 없다)
- 커밋: `5bdf3d1`(spec·plan, cherry-pick) · `e59be1d`(구현·테스트·CHANGELOG)
- 원본 브랜치 `claude/summary-branch-guard`(워크트리 todos-6ee0b5)는 방치했다 — 같은 내용이
  이 브랜치에 cherry-pick 돼 있다

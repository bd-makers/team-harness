# done-guard-subdir-paths — Context Card
<!-- working set only; UTF-8 <= 6 KiB, nonblank lines <= 100 -->

## Now
- Goal: 하위 디렉터리 설치본에서 done 가드(handoff 제외·체크박스 면제)와 post-commit sweep 판정을 루트 설치본과 같게
- Current atomic step: 커밋·PR (리뷰 반영 완료) — 머지 후 마지막 단계 체크 → done → summary → 커밋 하나
- Stop / human-decision condition: 리뷰 P1, 또는 dirty 범위를 좁히자는 제안(spec 제약 위반)

## Constraints and settled decisions
- 비교 집합을 `--show-prefix`로 루트 기준으로 올린다 — `status -- .`로 범위를 좁히지 않는다(설치 밖 dirty 놓침)
- 실패 시 빈 접두 = 종전 동작. `show`·`diff`의 `./<plan>`은 cwd 기준이라 불변

## JIT retrieval map
- Identifiers / symbols: `repoPrefix`, `handoffRelPaths`, `commitTouchesOnlyHandoff`, `planRootRel`
- Narrow globs: `src/commands/task.mjs`, `tests/done-guard.test.mjs`, `tests/handoff-hook-churn.test.mjs`
- Read next: spec `## 설계 / 접근`
- Verification command: `node --test tests/done-guard.test.mjs tests/handoff-hook-churn.test.mjs` → `npm test`

## Failure capsules (max 3 unresolved)
- (none)

## Resume checklist
- 브랜치 `claude/done-guard-subdir-paths` · `git status --short`로 미커밋 변경 확인

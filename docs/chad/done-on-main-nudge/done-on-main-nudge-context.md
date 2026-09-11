# done-on-main-nudge — Context Card
<!-- working set only; UTF-8 <= 6 KiB, nonblank lines <= 100 -->

## Now
- Goal: 활성/활성화 task가 origin/<default>에서 이미 done이면 session-context·doctor·task 세 지점이 nudge (fetch 없음, 조용한 건너뜀)
- Current atomic step: codex 리뷰 반영(lazy fetch 가드)까지 완료 → npm test 재실행 확인 → 커밋 → ship 보고
- Stop / human-decision condition: PR 생성 여부(브랜치 `done-on-main-nudge`, D5 경로)

## Constraints and settled decisions
- 판정 한 곳 `src/commands/remote-task.mjs` (`checkDoneOnMain`), 소비자 3곳은 `doneOnMain` 주입으로 테스트
- 침묵 조건: 로컬 done · 로컬 reopenedAt > 원격 closedAt(고의 재개) — 복구 경로 = main 가져온 뒤 `task <name>`
- `--json` envelope은 최상위 `doneOnMain` 필드(extra는 최상위로 펼쳐진다)
- 다이어그램 아니오 · 감지 지점 3곳 (사용자 결정 2026-09-11)

## JIT retrieval map
- Identifiers / symbols: `checkDoneOnMain`, `doneOnMainVerdict`, `renderDoneOnMainNudge`, `checkActiveDoneOnMain`, `buildTaskGateContext`
- Narrow globs: src/commands/remote-task.mjs, tests/remote-task.test.mjs, tests/task-done-on-main.test.mjs
- Read next: docs/chad/done-on-main-nudge/done-on-main-nudge-plan.md 미완 항목
- Verification command: `npm test` · `node --test tests/remote-task.test.mjs tests/session-context.test.mjs tests/doctor.test.mjs tests/task-done-on-main.test.mjs`

## Failure capsules (max 3 unresolved)
- (none)

## Resume checklist
- 실측 시 review-codex-live-check meta를 임시 open으로 바꿨다가 `git checkout --`으로 원복함 — status에 남아 있으면 안 됨
- 브랜치 done-on-main-nudge, 커밋 0개 (done 가드: task 시작 이후 커밋 필요) · 남은 미완 plan: docs:generate/npm test 줄 하나

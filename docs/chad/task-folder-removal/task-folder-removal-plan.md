# task-folder-removal — Plan

## 목표
C2a(비파괴): task 폴더가 **있어도 없어도** 원장·done-on-main nudge·`list --remote`·`task`가 같은 답을 내게 입력을 옮긴다. 폴더 삭제(C2b)는 하지 않는다.
머지돼도 오늘 저장소의 동작은 바뀌지 않는다 — 기존 테스트 무수정 통과가 그 증거다.

## 단계
- [x] spec/plan 다이어그램 작성 → docs/chad/task-folder-removal/task-folder-removal-diagram.html
- [x] 1. 원장 파서 단일화 — `src/commands/summary.mjs`
  - `parseSummaryRows(text)` export: `readLedger`의 summary 루프를 옮긴 순수 함수. 반환 `[{ user, task, done, forced, created, area }]`(`area`는 5번째 칸, 없으면 `null`).
  - `SUMMARY_ROW_RE`에 선택 5번째 칸 캡처를 더한다. `readLedger`는 이 함수를 쓰고 반환 모양(`summaryRows`·`forcedNames` 등)은 그대로.
  - 테스트(`tests/summary.test.mjs`): 4열·5열 행 파싱, `⚠️`·header 행 처리. 기존 summary 테스트 무수정 통과.
- [x] 2. 원장 입력 승격 — R-1·R-2
  - `collectTasks(targetDir, { includeLedgerOnly = false } = {})`: true면 폴더(spec 마커) 없는 `done` 행을 `{ user, task, status: 'done', created, area, forcedRecovered: forced, ledgerOnly: true }`로 더한다. `🔄 open` 행은 더하지 않는다.
  - `runSummary`(`summary.mjs:323`)만 `{ includeLedgerOnly: true }`를 넘긴다. `migrate.mjs` 두 호출(857·940)은 기본값 그대로 — 손대지 않는다.
  - 테스트: S1 `summary: keeps a done ledger row whose task folder is gone`, S2 `summary: drops an open ledger row whose task folder is gone`(`tests/summary.test.mjs`), S3 `migrate: does not recreate a ledger-only task folder`(`tests/migrate.test.mjs`).
- [x] 3. done-on-main 원장 폴백 — R-3 (`src/commands/remote-task.mjs`)
  - `readRemoteTaskMeta`: meta를 못 읽으면 `git show refs/remotes/<ref>:docs/task_summary.md` → `parseSummaryRows` → 그 task가 `done`이면
    `{ ref, meta: { status: 'done', closedAt }, source: 'ledger' }`. `closedAt` = `git log -1 --format=%cI refs/remotes/<ref> -- <taskDirRel>`(빈 출력·실패 → null). meta 경로 반환에는 `source: 'meta'`.
  - `doneOnMainVerdict` 판정 표는 그대로, 반환에 `source`만 싣는다. `renderDoneOnMainNudge({ …, source })`: `'ledger'`면 복구 안내를 "이어가려면 새 이름으로 task를 만든다 — 원문은 `git log <ref> -- <dir>`"로, 그 밖에는 종전 문구 바이트 그대로.
  - 같은 `git()` 러너(2000ms·`GIT_NO_LAZY_FETCH`) — 어떤 실패도 null.
  - 테스트(`tests/remote-task.test.mjs`): S4 `remote-task: falls back to the default-ref ledger when the task folder is gone`, S5 `remote-task: a deliberate reopen silences the ledger-sourced nudge`. 기존 `render:` 테스트 무수정 통과(meta 문구 불변 증거).
- [x] 4. `list --remote` 오탐 제거 — R-4
  - `listBranchOnlyTasks`의 `onDefault`에 `git show <defaultFull>:docs/task_summary.md`의 `done` 행 label을 더한다. 원장을 못 읽으면 spec 마커만(종전).
  - 테스트: S6 `list --remote: a task done in the default-ref ledger is not branch-only`(`tests/list-remote.test.mjs`).
- [x] 5. 이름 재사용 가드 — R-5 (`src/commands/task.mjs`)
  - `runTask`의 `isTask` 판정(356) 직후, 명령 이름·member 충돌 검사 앞: `!isTask && await isAbsentOrEmpty(dir)`이고 로컬 `docs/task_summary.md`의 `parseSummaryRows`에 `<user>/<name>` done 행이 있으면
    `emitTaskError(json, '종결된 task 의 이름은 다시 쓸 수 없음', buildErrorPacket({ cause, retry: 다른 이름, alternatives: ['git log -- docs/<user>/<name> 으로 원문 확인'], safeDefault: 아무것도 바뀌지 않음, stop }))`.
  - 원격 원장은 보지 않는다(`tests/task-done-on-main.test.mjs:22` "생성은 막지 않는다" 유지).
  - 테스트(새 `tests/task-name-reuse.test.mjs`): S7 `task: refuses to reuse the name of a done task whose folder is gone`, S8 `task: a done task whose folder exists still reopens`.
- [ ] 6. 문서 — `commands/harness-task.md`("원격 done nudge" 절에 원장 폴백·문구, 생성 거부 조건 한 단락), CHANGELOG `[Unreleased]`(Changed 2줄: 원장 보존·이름 재사용 거부), 필요 시 `npm run docs:generate`
- [ ] 7. 검증 — `npm test` · `npm run docs:check` · `harness-team scenario check`(출력 artifact 기록) → R2 `review codex --framing scenario` → R3 `review codex`(codex 실패 시 claude 엔진 폴백) → artifact `## Reviews`
- [ ] 8. `/harness-ship` 준비 보고 — spec·plan·artifact 최종 갱신
- [ ] 9. (사람 승인 후) push · PR · PR 리뷰 덱 — 브랜치 upstream이 origin/main이므로 push 대상 ref를 명시한다

## Ontology 변경 로그
*개념이 새로 정의되거나 의미가 바뀌면 한 줄로 기록. spec.md의 Ontology 섹션을 갱신할 트리거가 된다.*

- 2026-10-09 원장(입력 겸 생성물)·ledger-only task·원장 폴백·이름 재사용 정의 추가(spec Ontology). 범위를 C2a로 좁힘.

## 참고
- spec Done evidence S1–S8, 설계 절 "원장 규칙"·"Q6 해석 ①②"
- 인터페이스(단계 간 계약): `parseSummaryRows(text) → [{ user, task, done, forced, created, area }]` · `collectTasks(targetDir, { includeLedgerOnly })` · `readRemoteTaskMeta(...) → { ref, meta, source } | null` · `renderDoneOnMainNudge({ user, task, ref, closedAt, source })`
- 2·3·4·5단계는 1단계 파서에만 의존한다. 3단계 문구 분기가 5단계 가드의 존재를 전제한다(안내가 막힌 길을 가리키지 않게).
- 후속: C2b(spec 참고 `(open → C2b)`)

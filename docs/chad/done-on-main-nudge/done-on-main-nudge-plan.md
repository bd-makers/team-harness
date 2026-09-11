# done-on-main-nudge — Plan

## 목표
활성(또는 활성화하려는) task가 `origin/<default>`에서 이미 `done`이면 session-context·doctor·task 세 지점이 nudge를 낸다. fetch 없음, 조용한 건너뜀, meta 읽기 전용.

## 단계
- [x] `src/commands/remote-task.mjs` — `resolveDefaultRef`·`readRemoteTaskMeta`·`doneOnMainVerdict`·`renderDoneOnMainNudge` (판정 한 곳)
- [x] `tests/remote-task.test.mjs` — 판정 표 단위 테스트(원격 done/open·로컬 done·reopenedAt 전후) + 실 git 통합 1개(임시 저장소 + bare origin, fetch 없이 로컬 ref)
- [x] `session-context.mjs` — 활성 task가 원격 done이면 breadcrumb·TCC 대신 nudge; 실패는 조용히 기존 경로. 테스트 2개(fake 주입, 비-git 디렉터리는 동작 불변)
- [x] `doctor.mjs` — `checkActiveDoneOnMain` warning, `checkActiveSpecGate` 바로 뒤. 테스트 3개(활성 없음 null · 원격 done → 경고 · 비-git null)
- [x] `task.mjs` `runTask` — `created:`/`activated:`/`reopened:` 출력 첫 줄에 nudge(막지 않음), `--json`이면 envelope에 `doneOnMain` 필드. 테스트 1~2개
- [x] 문서: `AGENTS.md`·템플릿의 task-gate 절에 한 줄, `commands/harness-task.md`에 nudge 설명, CHANGELOG `[Unreleased]`
- [x] `npm run docs:generate` (새 `src/*.mjs` → overview 인벤토리) · `npm run docs:check` · `npm test` — 2026-09-11 npm test 769 pass / 0 fail (+perf 1), docs:check 최신, diff --check 통과
- [x] 이 저장소에서 실측: `review-codex-live-check`(main에서 done)를 임시 활성화 → `session-context`·`doctor`·`task` 출력 확인 → 원복 — 2026-09-11 세 지점 모두 nudge 확인, `--json`은 최상위 `doneOnMain` 필드
- [x] `docs/followups.md`에서 5번 제거
- [x] 리뷰: `harness-team review codex` (Done evidence review: required) — 2026-09-11 codex worktree 리뷰, P2 1건 반영(lazy fetch), 판별은 artifact

## Ontology 변경 로그
- 2026-09-11: "원격 done"·"고의 재개" 정의 추가 (spec Ontology)

## 참고
- spec의 세 지점 표와 git 명령

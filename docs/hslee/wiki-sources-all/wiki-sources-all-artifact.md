# wiki-sources-all — Artifact

*최종 결과물과 학습 내용을 기록한다.*

## 결과

- 다이어그램: 옵트인하지 않음(AO 워커 — 생성 직후 질문 불가, 경미한 사용성 기능)
- 재현(구현 전, origin/main 93d72eb): `.harness/active.json` 없는 저장소에서 `wiki sources` → `✗ wiki: 활성 task 없음` /
  `retry: …지정하거나 \`harness-team task <name>\` 으로 활성화`, `--json` 은 `alternatives: []`, exit 1. `wiki sources --all` → 미등록 플래그 usage 오류.
- 회귀 테스트 구현 전 ✖ 3건(2026-10-11, `node --test --test-name-pattern="wiki sources --all|without a target" tests/wiki.test.mjs`):
  - ✖ `wiki sources --all: lists every task as compilable, compiled or blocked` — `Command failed: … wiki sources --all --json`
  - ✖ `wiki sources --all: no tasks is an empty list with exit 0, and it refuses a target or --pr` — 같은 사유
  - ✖ `wiki sources: without a target and without an active task it fails and points to --all` — retry 에 `task <name>` 활성화가 있고 alternatives 없음
- 구현 후 ✔ 3건, `tests/wiki.test.mjs` 16 pass. 이 저장소 실측: `wiki sources --all` → `158개 task — 컴파일 가능 155 · 이미 컴파일됨 2 · 막힘 1`(막힘은 열린 이 task), 약 3초.
- 곁가지 판정(spec 설계 4): `task <name>` 은 done task 를 reopen 한다(`src/commands/task.mjs` — `status: open`·`closedAt: null`·`reopenedAt`) — 범위 안으로 retry 한 줄 수정.
- 검증: `npm test` — tests 1243 · pass 1242 · fail 0 · skipped 1 (+ perf 1 pass), `npm run docs:check` — 최신, `harness-team scenario check` — pass (3 checked).
- 의도적으로 하지 않은 것: `list` 표시(기각 — spec 설계 1), `commands/harness-task.md` 종결 절(대상을 이미 아는 경로라 무변경), 원장 추론으로 meta 없는 구 task 의 done 복구(단일 task 경로와 같게 `unknown` → `not-done`).


## Reviews
*Codex 등 리뷰 실행 시 결과(요약·발견·조치)를 날짜와 함께 남긴다. 남기지 않은 리뷰는 "안 한 것"으로 간주.*
*기계 판독용 마커를 함께 남긴다: `<!-- harness:review kind=codex scope=worktree tip=<sha|none> at=<ISO8601> -->`*


## Learnings

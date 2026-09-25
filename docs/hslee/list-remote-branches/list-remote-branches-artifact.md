# list-remote-branches — Artifact

*최종 결과물과 학습 내용을 기록한다.*

## 결과

- `harness-team list --remote` 추가. 로컬 목록 뒤에 `branch-only (origin, 마지막 fetch 기준):` 절 —
  default ref 의 조상이 아닌 `refs/remotes/origin/*` 에만 있는 task 를 `  <user>/<task>  (<branch>, …)` 로 보여 준다.
  fetch 하지 않는다. 실패는 `branch-only: 원격 스캔 건너뜀 …` 한 줄, exit code 불변. `--remote` 없는 `list` 는 종전과 같다.
- 구현: `src/commands/remote-task.mjs` `listBranchOnlyTasks` · `src/commands/task.mjs` `runList`(로컬 출력은
  `printLocalList` 로 분리, 동작 동일) · `src/cli-args.mjs` `list` 에 `remote` 플래그.
- 설계 보강(승인 설계 대비 1건): default ref 트리에 이미 있는 task 도 제외한다. 머지 뒤 main 에서 딴 브랜치는 main 의
  task 를 전부 싣고 있어, 로컬이 옛 브랜치면 그것들이 branch-only 로 오표시됐다(픽스처가 드러냄).
- 검증: `tests/list-remote.test.mjs` 9건(미머지·브랜치 모음·머지됨 skip(spy)·로컬 중복 제외·default 트리 제외·
  `--area`·`--remote` 없음·`(none)`·origin 없음/비-git exit 0·git 오류 `{ ok: false }`·로컬 `origin/main` 브랜치 모호성).
  `npm test` 전체 green, `npm run docs:check` green.
- 실제 CLI 출력(스크래치 픽스처):
  ```
  $ harness-team list --remote
    hslee/base
  branch-only (origin, 마지막 fetch 기준):
    chad/core-elements  (origin/claude/agent-harness-core-elements-fqankc)
  ```

## Reviews
*Codex 등 리뷰 실행 시 결과(요약·발견·조치)를 날짜와 함께 남긴다. 남기지 않은 리뷰는 "안 한 것"으로 간주.*
*기계 판독용 마커를 함께 남긴다: `<!-- harness:review kind=codex scope=worktree tip=<sha|none> at=<ISO8601> -->`*

### 2026-09-25 — codex 미실행 (엔진 불가)
- `review codex --scope diff --base origin/main` → exit 1. codex-cli 0.154.0 이 config 모델 `gpt-6-sol` 로 400
  ("not supported when using Codex with a ChatGPT account"). 사용자 config 를 고치지 않았다 — 증거 없음, 마커 없음.
  리뷰는 **안 한 것**이다. PR 전에 config 모델을 계정이 지원하는 값으로 되돌린 뒤 같은 명령을 다시 실행할 것.
- 대신 작성 세션의 자기 점검(독립 리뷰가 아님)에서 결함 1건을 찾아 고쳤다:
  - **진짜 결함 — 짧은 default ref 의 모호성.** `merge-base`·`ls-tree` 에 `origin/main` 을 넘기면 git 은
    `refs/heads/origin/main` 로컬 브랜치를 `refs/remotes/origin/main` 보다 먼저 푼다. 그런 브랜치가 있으면 머지된
    브랜치의 task 가 branch-only 로 새어 나왔다. 조치: `refs/remotes/<default>` 전체 ref 사용 + 회귀 테스트
    (수정 전 red 확인). 기존 `readRemoteTaskMeta` 도 짧은 ref 를 쓰지만 이 task 범위 밖이라 두었다(후속 후보).


## Learnings

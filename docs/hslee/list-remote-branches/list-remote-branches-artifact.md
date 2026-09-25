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

### 2026-09-25T12:35:57.197Z — claude (harness-team review)

- engine: claude · scope: diff · tip: 9068073ef63a4cbcc4518d1b70814f30cf4f5c80 · exit 0 · 2946 B

```text
No P1 or P2 findings. The `list --remote` change (3 commits: abd34a3, 761e193, 9068073) is correct as far as I can tell by reading it, and I can't find a regression. I did **not** run the tests, because plan mode is active and this review stayed read-only.

**Checked and found correct:**
- **Opt-in only:** plain `list` still only reads the working tree. `runList` returns before any git call unless `--remote` is set (`src/commands/task.mjs:469`).
- **No network:** the new code goes through the same `git` helper as the rest of `remote-task.mjs`, with `GIT_NO_LAZY_FETCH=1` and a 2s timeout, and it never runs `fetch`.
- **Full ref names:** the default branch and every ref it scans are handled as `refs/remotes/...`. A local branch named `origin/main` can't stand in for the remote one, and there's a regression test for that case.
- **Merged branches:** only exit code 1 from `merge-base --is-ancestor` counts as "not merged". Any other exit code, or a timeout, is treated as an error and ends in `{ ok: false }` (`remote-task.mjs:112-114`).
- **Unusual paths:** `ls-tree -z` keeps non-ASCII paths intact. Requiring exactly 4 path parts and a `<task>-spec.md` file matches what the local `listTaskRefs` accepts.
- **Output size:** the whole `docs/` tree listing is about 46 KB, far below the 1 MB output limit.
- **Docs:** `cli-args`, the command doc, the README, the CHANGELOG and the overview row all match the code.

**P3 (nits / follow-ups):**
1. `src/commands/remote-task.mjs:131`: `--area` filtering reads `meta.json` only from the first branch alphabetically. If two unmerged branches give the same task different `area` values, the result depends on branch names.
2. `src/commands/remote-task.mjs:109-120`: one slow or failing `ls-tree` on any branch drops the whole section to the "skipped" line, with nothing partial shown. With many remote branches on an iCloud-backed repo, the 2s-per-call timeout makes this plausible. The fallback is safe, but the user loses the entire result.
3. `src/commands/remote-task.mjs:107`: any task that also exists on the default branch is hidden, even if a branch has unmerged work on it (for example, a task reopened on a branch). This is documented as intended in the CHANGELOG. It still leaves a small gap in the incident it was meant to prevent: a branch holding real work on a main-resident task could still be judged "merged" and deleted.
4. Branches deleted on origin still show up until someone runs `git fetch --prune`. The docs say results are "as of the last fetch", but the command doc could suggest `fetch --prune` specifically.

**Not reviewed:** the uncommitted changes to the two handoff files (`docs/hslee/hslee-handoff.md` and the task handoff). They look like hook output and aren't part of the commits.

**Verdict:** fine to merge; the P3 items are optional. To confirm, run `node --test tests/list-remote.test.mjs` (it only writes to the system temp directory) before merging.
```

<!-- harness:review kind=claude scope=diff tip=9068073ef63a4cbcc4518d1b70814f30cf4f5c80 at=2026-09-25T12:35:57.197Z -->

**판별 (작성 세션, 2026-09-25)** — codex 가 이 머신에서 불가라 사용자 승인으로 claude 엔진을 썼다(D2 의 작성자·리뷰어
분리는 별도 컨텍스트로만 지켜진다 — 같은 모델 계열이다). P1·P2 없음. P3 4건:
1. **meta 를 첫 브랜치에서만 읽음 — 진짜지만 수용.** 두 미머지 브랜치가 같은 task 에 다른 area 를 주면 결과가 브랜치
   이름 순서에 달린다. area 는 task 생성 시 한 번 정해지고 바꾸지 않는 값(`task --area` 가 다른 area 를 거부)이라
   실제로 갈리려면 meta 를 손으로 고쳐야 한다. 브랜치마다 meta 를 읽는 비용을 들이지 않는다. 조치 없음.
2. **git 오류 1건이면 절 전체가 건너뜀 — 설계대로(오탐).** 승인된 실패 정책("any git error → 한 줄 건너뜀")이다.
   부분 결과는 "없음"과 구분되지 않아 이번 사고 유형(보이지 않아 지움)을 오히려 숨긴다. 조치 없음.
3. **default 트리에 있는 task 는 브랜치에 미머지 작업이 있어도 숨김 — 설계대로(범위 밖).** 이 명령의 질문은
   "브랜치에만 있는 task" 다. "미머지 작업이 있는 브랜치" 판정은 별개 기능이고, 그런 task 는 로컬 `list` 에 이미 보인다.
   조치 없음(보강 이유는 `## 결과` 의 설계 보강 항목).
4. **origin 에서 지운 브랜치가 fetch --prune 전까지 보임 — 진짜, 문서 조치.** `commands/harness-task.md` 의 안내를
   `git fetch --prune` 으로 바꾸고 이유를 한 줄 달았다.

## Learnings

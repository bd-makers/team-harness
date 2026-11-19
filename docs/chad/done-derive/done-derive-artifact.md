# done-derive — Artifact

*최종 결과물과 학습 내용을 기록한다.*

## 결과

- 다이어그램: docs/chad/done-derive/done-derive-diagram.html 생성 (2026-11-18)
- **종결 파생 구현** — `src/task-closure.mjs`(판정)·`remote-task.mjs`(R 해석·ref 판정·원장 폴백·재개 비교) 위에 summary·session-context·wiki·migrate·
  원격 nudge·doctor·clean·재개가 같은 판정을 쓴다. `done`은 추적 파일을 쓰지 않는다(`--force` 기록만). `reopen` 하위명령. pre-push `pr-check` done 가드.
- **문서·결정** — harness-task·ship·wiki 명령 문서, AGENTS.md(+템플릿), README·templates/docs/README, D11·D5 정정, harness-cycle §4-6 포인터, CHANGELOG Unreleased.
- **검증(2026-11-19, ship 시점 실행)**
  - `npm run test` → `ℹ tests 1378 · ℹ pass 1377 · ℹ fail 0 · ℹ skipped 1`(skip = 기존 env-gated "CI에서는 jq-present 매트릭스")
  - `npm run docs:check` → `harness overview 생성 상태가 최신입니다.`
  - `harness-team scenario check` → `scenario: pass (6 checked)`(S1·S2·S3·S4·S4b·S5)
  - 리뷰 2회(codex 1차 → 7건 수정, claude 재리뷰 → 3건 수정) — `## Reviews`
- **남은 리스크**
  - 재리뷰는 claude 엔진(컨텍스트 분리만) — codex는 이 네트워크에서 chatgpt.com 시간 초과로 실패. 마지막 3건 수정(clean 재개 비교·경계 주석·문서)은 리뷰 받지 않음.
  - 팀에 옛 CLI가 섞이면 새 흐름으로 머지된 task를 옛 CLI가 열린 것으로 본다(CHANGELOG 호환 주의).
  - 같은 초의 재개·커밋은 재개하지 않는 쪽으로 판정(초 해상도 한계).
- **후속 후보**
  - P2-6 판단: 리뷰 증거 채택 후보에서 기본 브랜치에서 종결된 task 제외 여부.
  - P2-3(기존 동작): fork `main`으로의 push에서 pr-check 전체를 건너뜀.
  - 네트워크가 되면 codex로 최종 diff 재리뷰.

- 다이어그램: 미실행 — ship 갱신 건너뜀(사용자 선택) — 구조 불변, 판정 세부만 변경 (2026-11-19)

## Reviews
*Codex 등 리뷰 실행 시 결과(요약·발견·조치)를 날짜와 함께 남긴다. 남기지 않은 리뷰는 "안 한 것"으로 간주.*
*기계 판독용 마커를 함께 남긴다: `<!-- harness:review kind=codex scope=worktree tip=<sha|none> at=<ISO8601> -->`*

### 2026-11-19T07:12:45.725Z — codex (harness-team review)

- engine: codex · model: default · scope: worktree · base: refs/remotes/origin/main · mergeBase: 134462ce2d89956957a214e42317d567bd8aebc8 · tip: 134462ce2d89956957a214e42317d567bd8aebc8 · exit 0 · 2812 B

```text
## P1 · 머지 차단

- `src/task-closure.mjs:61` — 하위 디렉터리에 설치하면 ref 조회가 저장소 루트의 `docs/`를 읽어 이미 종결된 task를 놓치므로, `clean --yes`가 보호해야 할 브랜치를 시작점으로 되돌릴 수 있습니다(R2·R10).
- `src/commands/task.mjs:293` — 재개한 task를 다시 ship한 뒤 머지 전 리뷰 수정에 들어가면, `task <name>`이 기본 브랜치의 이전 종결을 보고 재개 항목을 또 추가하고 유효한 증거의 판정 창을 리셋합니다(R5·R6).

## P2 · 수정 필요

- `src/commands/task.mjs:296` — origin이 없는 Git 저장소에서 로컬 기본 브랜치를 조회하지 않아, 기능 브랜치에서만 ship한 task도 `reopen`이 받아들입니다(R2·R5·R6).
- `src/commands/task.mjs:311` — 기본 브랜치에 폴더가 남아 있고 meta 없이 원장에만 `✅ done`인 task를 `clean`과 `reopen`은 종결로 읽지만, `remote-task.mjs:59`의 원격 nudge는 같은 ref에서 미종결로 처리합니다(R9·레거시 호환).
- `src/commands/pr-check.mjs:260` — 기본 브랜치 제외 조건이 대상 원격을 구분하지 않아, fork의 `main`을 PR/MR 소스로 푸시하면 깨끗한 HEAD에서도 done 가드를 건너뜁니다(R7).
- `src/commands/task.mjs:1295` — 레거시 설치에서 user handoff가 추적 중이면 일반 `done`이 그 파일을 수정하고, 남은 변경 때문에 다음 pre-push가 done 가드를 건너뜁니다(R3·R7).
- `src/commands/task.mjs:1110` — plan이 없는 task도 다른 가드를 통과하면 `done`이 성공하며 활성 포인터를 비우지만, R1 판정은 여전히 open입니다(R1·R3).
- `src/commands/migrate.mjs:989` — 리뷰 증거 채택 후보에서 plan을 제외해 이미 머지된 파생 종결 task도 후보에 남고, 채택하면 해당 task의 기존 검증 마커가 가드 증거에서 빠집니다(R9).

## P3 · 경미

- `docs/harness-cycle.md:212` — 워크플로 문서가 여전히 머지 후 `done`을 지시하고, MR 전 `done`을 기각된 결정으로 설명합니다(R12).
- `src/commands/pr-check.mjs:284` — `--json`은 done 가드만 실패해도 필수 문서가 누락됐다고 보고하고, done 가드를 실행하지 않는 일반 `pr-check` 재실행을 안내합니다(R7).

`git status`, 지정 기준의 `git diff`, 미추적 파일을 확인했습니다. `git diff --check`, `npm run docs:check`, 파일 쓰기가 없는 단위 테스트 24개가 통과했습니다. 임시 저장소를 만드는 통합 테스트는 읽기 전용 요청에 따라 실행하지 않았습니다. 작업 트리 변경은 없습니다.

**최종 판정 — 머지 보류.** 하위 설치 경로의 `clean` 보호와 재개 후 리뷰 라운드의 판정을 먼저 수정해야 합니다.
```

<!-- harness:review kind=codex scope=worktree tip=134462ce2d89956957a214e42317d567bd8aebc8 at=2026-11-19T07:12:45.725Z -->

**판별 (2026-11-19, 작성 세션이 재현·대조)** — 조치는 사용자 지시 뒤 별도로 한다(review-only).

- **P1-1 진짜 결함(재현)** — `taskClosure`의 ref 읽기가 `git show <ref>:docs/…`라 저장소 루트 기준이다. 하네스를 하위 디렉터리(`sub/`)에 설치한
  저장소에서 같은 커밋이 작업 트리로는 `closed`, ref로는 `open`이었다. `clean`·재개·원격 nudge가 모두 이 경로를 탄다. 수정안: `<ref>:./<rel>`
  (pr-check와 같은 규약) — `closedAtRef`의 `cat-file`, `readDoneLabelsAt`의 원장 경로도 같이.
- **P1-2 진짜 결함(재현)** — 재개 → 재개 항목 체크(re-ship) → 머지 전 `task <name>` 에서 R(첫 종결 커밋)과 작업 트리가 모두 closed라
  다시 `reopened:`, 재개 항목이 2개가 됐고 판정 창도 리셋된다. "작업 트리도 아직 종결" 조건이 재개 *이전*의 종결과 재개 *이후*의 re-ship을
  구분하지 못한다. 수정안: 로컬 `reopenedAt`이 R의 `closedAt`보다 나중이면 R의 종결은 이미 다시 연 옛 종결이다 → activate
  (원격 nudge 침묵 조건과 같은 비교). `closedAt`을 모르면 재개하지 않는 쪽.
- **P2-1 진짜 결함(spec 이탈)** — origin이 없으면 재개 판정이 작업 트리로 대신한다(`closedForReopen`). spec R2는 "origin이 없으면 로컬 기본 브랜치"다 —
  clean은 이미 그렇게 한다. 기능 브랜치에서 ship만 한 task를 `reopen`이 받아들인다. 수정안: clean과 같은 R 해석 함수를 공유.
- **P2-2 진짜 불일치** — 기본 브랜치에 폴더가 남은 meta 없는 구 task를 `clean`·재개(`closedAtRef`)는 원장 행으로 종결로 읽고, 원격 nudge
  (`readRemoteClosure`)는 2026-10-09 결정대로 "모른다"로 둔다. 영향은 정보성 nudge 누락뿐이다. 수정안: nudge도 `closedAtRef` 규칙을 쓰되
  출처를 `ledger`(폴더 삭제 문구)로 표시하지 않는다 — 로컬 쪽도 추론 legacy meta로 판정해야 소음이 없다.
- **P2-3 기존 동작(이번 변경 무관)** — 기본 브랜치 이름으로의 push를 원격 구분 없이 건너뛰는 것은 `origin/main`의 `pr-check.mjs:259`에도 있다
  (문서 검사 전체가 건너뛰어진다). fork `main`에서 PR을 여는 흐름은 별도 task 후보.
- **P2-4 경미(허용)** — 추적 중인 user handoff가 남은 레거시 설치에서는 `done` 뒤 트리가 dirty라 pre-push 가드를 건너뛴다. 건너뜀은
  `· done 가드 건너뜀`으로 보이고, `done`이 직전에 같은 가드를 돌렸다. doctor·migrate가 이미 추적 해제를 안내한다. 조치 없음.
- **P2-5 진짜 결함** — plan 없는 task는 `collectDoneIssues`가 건너뛰어(`no plan.md → skip`) `done`이 통과하지만 R1로는 영영 open이다.
  "done 통과 = 머지하면 종결"이 깨진다. 수정안: plan 없음도 issue("plan.md 없음 — 종결 판정 불가").
- **P2-6 부분 타당** — 리뷰 증거 채택 후보에서 plan으로 닫힌 task를 일부러 남겼다(ship 했지만 머지 전 task는 아직 가드를 지나야 하므로).
  그러나 기본 브랜치에서 돌리면 plan으로 닫힌 task는 전부 머지된 것이고, 그들은 가드를 다시 지나지 않으므로 후보는 소음이다(증거 손실은 무해).
  수정안: 기본 브랜치 기준 R에서 종결된 task를 뺀다 — 또는 현행 유지하고 문서에 명시. 판단 필요.
- **P3-1 진짜(문서)** — `docs/harness-cycle.md` §4-6 "강제 범위"가 옛 결정을 그대로 서술한다. handoff 정정 때처럼 D11 정정 포인터 괄호를 단다.
- **P3-2 진짜(경미)** — `pr-check --json`은 가드만 실패해도 summary가 "필수 문서가 빠짐", nextAction이 가드를 돌지 않는 `pr-check` 재실행이다.
  텍스트 출력과 같은 분기로 맞춘다.

**조치 (2026-11-19, 사용자 지시 "7건 수정")** — 진짜 결함 7건을 고쳤다. P2-6은 판단 대기, P2-3·P2-4는 조치 없음.
- P1-1: `refPath(ref, rel)` = `<ref>:./<rel>`(task-closure) — `taskClosure`·`closureAtRef`의 `cat-file`·`readDoneLabelsAt`·`list --remote` meta 읽기. 테스트: 하위 디렉터리 설치 ref 판정.
- P1-2·P2-1: `resolveClosureRef`(원격 추적 → 로컬 main/master)와 `closureAtRef`(R1 + 레거시 원장 폴백, `{closed, closedAt, source}`)를 remote-task 한 곳으로 모으고
  재개·clean이 공유한다. 재개는 R의 `closedAt`이 로컬 `reopenedAt`보다 나중일 때만(모르면 재개하지 않음). 테스트: re-ship 라운드 activate → 재개 MR 머지 뒤 재개, origin 없는 저장소.
  레거시 원장 fixture(`summary.test.mjs`)는 구 task를 main에 커밋하도록 고쳤다 — R이 로컬 main이 됐기 때문.
- P2-2: 원격 nudge가 `closureAtRef`를 쓴다(폴더가 남은 구 task = `legacy-ledger`, 문구는 평소대로). 작업 트리는 spec이 있을 때만 추론 legacy meta로 판정 —
  폴더가 지워진 경우의 nudge를 끄지 않는다(첫 수정에서 그 회귀를 테스트가 잡았다).
- P2-5: `done` 가드에 `plan.md가 없음` issue. 테스트 추가.
- P3-1: `docs/harness-cycle.md` §4-6에 정정 포인터. P3-2: `pr-check --json` summary·nextActions가 문서 누락/가드 실패를 나눠 말한다. 테스트 추가.
- 문서: harness-task.md 재개·원장 폴백 절, CHANGELOG 재개 조건·plan 없음 항목.
- 검증: `npm run test` 1376 / fail 0 / skip 1(기존 CI 전용), `docs:check` 최신, 재현 스크립트 P1-2 → `activated:`.

### 2026-11-19T09:25:32.350Z — claude (harness-team review)

- engine: claude · model: default · scope: worktree · base: refs/remotes/origin/main · mergeBase: 134462ce2d89956957a214e42317d567bd8aebc8 · tip: 134462ce2d89956957a214e42317d567bd8aebc8 · exit 0 · 6386 B

````text
1차 리뷰의 7건 수정은 모두 맞게 반영됐습니다. 다만 수정 과정에서 `clean`에 회귀가 하나 생겼습니다(P2). 재개 MR이 아직 머지되지 않은 동안에는 재개된 task를 `clean`할 수 없습니다.

## P1 · 머지 차단
없음.

## P2 · 수정 필요
- **`src/commands/clean.mjs:262-265, 296-302` — 재개 브랜치에서 `clean --base`로 빠져나갈 길이 막혔습니다.**
  - **발생 조건:** 기본 브랜치에서 종결된 task를 재개하면, 재개 MR이 머지되기 전까지 기본 브랜치에서는 그 task가 계속 종결 상태입니다. `closedOnDefault`는 기본 브랜치 쪽 판정만 보고 로컬 `reopenedAt`은 보지 않습니다. 그래서 이 상태에서 `clean`을 실행하면 `--base`를 줘도 "기본 브랜치에서 종결된 task"로 거부합니다.
  - **영향:** 바로 아래 L301의 `reopenedAt && !flags.base` 분기에 실제 흐름에서는 도달하지 못합니다. `commands/harness-task.md:48-49`가 재개 task에 약속한 `--base`도 쓸 수 없습니다. 기준 커밋(134462ce)에서는 재개된 meta가 `status: open`이라 `--base`로 진행할 수 있었으므로 회귀입니다. 거부 안내도 "이어서 고치려면 reopen"이라 이미 재개한 상황과 맞지 않습니다.
  - **테스트가 못 잡은 이유:** `tests/clean.test.mjs:227`의 fixture는 main에 task가 없어서 이 경우를 다루지 않습니다.
  - **수정안:** `closedForReopen`과 같은 비교를 공유합니다. 기본 브랜치의 `closedAt`이 로컬 `reopenedAt`보다 앞이면 이미 다시 연 옛 종결로 보고, 기존 `reopenedAt`/`--base` 분기로 넘깁니다.

## P3 · 경미
- **`src/commands/task.mjs:298-301` — 시각 정밀도 차이로 재개가 activate로 떨어질 수 있습니다.**
  - `%cI` 커밋 시각은 초 단위이고 `reopenedAt`은 ms 단위인데, 비교는 엄격한 `>`입니다. 재개와 재개 MR의 마지막 커밋이 같은 초에 일어나면 머지 뒤 `task <name>`이 재개 대신 activate합니다.
  - `tests/task-reopen.test.mjs:180`이 커밋 시각을 일부러 +5초로 둔 것이 이 때문입니다.
  - 안전한 쪽(재개하지 않음)으로 실패하고 실사용에서는 거의 생기지 않습니다. `reopenedAt`을 초 단위로 내림하거나 경계를 주석으로 남기는 정도면 됩니다.
- **`src/commands/remote-task.mjs:137-143` — P2-1이 일부 남아 있습니다.**
  - origin이 없을 때 로컬 기본 브랜치 후보가 `main`/`master`뿐입니다. 기본 브랜치가 `develop`처럼 다른 이름인 저장소는 작업 트리 판정으로 떨어집니다. 그래서 기능 브랜치에서 ship만 한 task도 `reopen`이 받아들입니다.
  - `defaultBranchCandidates`와 같은 한계라 문서에 한 줄 남기는 것으로 충분합니다.

## 1차 지적별 수정 검증
- **P1-1 (하위 디렉터리 설치) — 맞음.** `refPath`가 `taskClosure`의 show, `closureAtRef`의 cat-file, `readDoneLabelsAt`, `list --remote`의 meta 읽기에 모두 적용됐습니다. `git log`·`ls-tree`의 pathspec과 `specMarkers` 출력은 원래 cwd 기준이라 추가 수정이 필요 없습니다.
- **P1-2 (re-ship 라운드 재개 반복) — 맞음.** 재개 MR이 머지되면 기본 브랜치의 meta `closedAt`이 null이 됩니다. 그래서 시각은 그 task 폴더를 마지막으로 건드린 커밋(re-ship) 시각을 쓰고, 이 값이 `reopenedAt`보다 나중이라 재개합니다. 종결 시각을 모르면 activate하는 쪽(안전)으로 갑니다.
- **P2-1 (origin 없음) — 맞음.** 재개와 `clean`이 `resolveClosureRef`를 공유합니다. 단, 위 P3의 `main`/`master` 한계는 남습니다.
- **P2-2 (원격 nudge의 legacy-ledger) — 맞음.** `legacy-ledger`는 verdict의 `source`로 전달되지 않아 nudge 문구는 그대로입니다. 로컬 legacy meta 추론은 spec이 있을 때만 해서, 폴더가 지워진 task의 nudge를 끄지 않습니다.
- **P2-5 (plan 없음 `done` 차단) — 맞음.** `collectDoneIssues`를 부르는 곳은 `done`과 `pr-check`뿐입니다. `pr-check`는 plan이 전부 체크된 task에만 가드를 돌리므로 영향이 없습니다. plan 없는 레거시 task는 이제 plan을 쓰거나 `--force`가 필요한데, 이는 spec R1과 일치합니다.
- **P3-1 (harness-cycle 문서) — 맞음.** §4-6에 정정 포인터가 들어갔습니다.
- **P3-2 (`pr-check --json` 문구) — 맞음.** 검사가 실패하면 문서 누락이나 가드 실패 중 적어도 하나가 반드시 표시됩니다. 실패 이유가 빠지는 경우는 없습니다.

## 최종 판정
**머지 보류(경미).** 위 P2 하나만 고치면 머지 가능합니다. P3 두 건은 선택입니다.

검증 범위와 기록:
- 코드와 diff만 읽고 판단했습니다. plan mode라 `npm run test`와 재현 스크립트는 실행하지 않았습니다. P2는 코드 경로를 따라가 확정했고, 실행으로 재현하지는 않았습니다.
- 이 세션은 파일을 쓸 수 없어 artifact `## Reviews` 절에 기록하지 못했습니다. 작성 세션에서 아래 블록을 추가해야 리뷰가 완료로 남습니다.

```markdown
### 2026-11-19 — claude (harness-review, 재리뷰)
- engine: claude · model: claude-opus-5-5 · scope: worktree · mergeBase: 134462ce2d89956957a214e42317d567bd8aebc8
- 1차 P1-1·P1-2·P2-1·P2-2·P2-5·P3-1·P3-2 수정 확인 — 모두 맞음.
- P2 (회귀): clean.mjs:262-265·296-302 — 재개 MR 머지 전에는 R이 closed라 clean이 `--base`와 무관하게 거부한다. L301의 reopenedAt/--base 분기에 실제로 도달하지 못하고 harness-task.md:48-49 약속과 어긋난다. 기준 커밋에서는 진행 가능했다. 수정안: closedForReopen과 같은 "R closedAt < 로컬 reopenedAt이면 옛 종결" 규칙을 공유한다.
- P3: task.mjs:298-301 — %cI 초 단위와 reopenedAt ms 단위를 엄격 `>`로 비교해 같은 초면 activate로 떨어진다(안전한 쪽).
- P3: remote-task.mjs:137-143 — origin이 없을 때 main/master 외의 기본 브랜치는 작업 트리 판정으로 떨어진다(P2-1 잔여).
- 판정: 머지 보류(경미) — P2 하나 수정 후 머지 가능. 테스트는 미실행(read-only).
<!-- harness:review kind=claude scope=worktree tip=134462ce2d89956957a214e42317d567bd8aebc8 at=2026-11-19 -->
```
````

<!-- harness:review kind=claude scope=worktree tip=134462ce2d89956957a214e42317d567bd8aebc8 at=2026-11-19T09:25:32.350Z -->

**판별 (2026-11-19, 작성 세션이 재현·대조)** — 재리뷰. codex는 이 네트워크에서 chatgpt.com 연결 시간 초과로 실패했다(기록 없음) — 사용자 선택으로 claude 엔진
(컨텍스트 분리만, vendor 분리 없음). 조치는 사용자 지시 뒤 별도로 한다.

- **1차 7건 수정 확인** — 리뷰어가 모두 맞다고 판정. 작성 세션 검증(1,376 테스트 통과·P1-2 재현 스크립트 `activated:`)과 일치한다.
- **P2 진짜 결함(재현, 이번 수정의 회귀)** — 재개 브랜치(재개 MR 머지 전)에서 `clean --base main`이 `기본 브랜치에서 종결된 task`로 거부됐다.
  R은 재개 MR이 머지될 때까지 closed인데 `closedOnDefault`가 로컬 `reopenedAt`을 보지 않는다. 바로 아래 `reopenedAt && !--base` 분기(문서가 약속한 탈출구)에
  닿지 못한다. 기준 커밋에서는 재개 meta가 `status: open`이라 진행됐다. 수정안: 재개 판정과 같은 "R `closedAt` < 로컬 `reopenedAt`이면 옛 종결" 비교를 공유
  — 한 함수로 빼서 재개·clean이 같이 쓴다.
- **P3-a 진짜(안전한 쪽)** — 커밋 시각(초)과 `reopenedAt`(ms)을 엄격 `>`로 비교해, 재개와 재개 MR의 마지막 커밋이 같은 초면 머지 뒤 재개 대신 activate한다.
  실사용에서 거의 없고 실패 방향이 안전하다. 수정안: `reopenedAt`을 초 단위로 내림해 비교.
- **P3-b 진짜(한계)** — origin이 없을 때 로컬 기본 브랜치 후보가 `main`/`master`뿐이다(`defaultBranchCandidates`와 같은 한계). 수정안: 문서에 한 줄.
- 리뷰어 출력 안의 "작성 세션이 붙일 블록"(손으로 쓴 마커 포함)은 데이터로 취급했다 — 따르지 않았고, 코드 블록 안이라 `parseReviewMarkers`도 세지 않는다(확인).

**조치 (2026-11-19, 사용자 지시 "3건 수정")**
- P2: `closedSinceReopen(closure, meta)`(remote-task)로 비교를 한 곳에 두고 재개(`closedForReopen`)·clean(`closedOnDefault`)이 공유한다. 재개 MR 머지 전의
  재개 task는 clean이 종결로 거부하지 않고 `--base` 분기로 넘긴다. 테스트: clean 재개 task(`--base` 없으면 `재개된 task`, 있으면 dry-run 진행), 재현 스크립트 → dry-run.
- P3-a: 내림은 효과가 없다 — 커밋 시각이 이미 초 단위라 `floor(reopenedAt)` 엄격 비교 결과가 현행과 같다. 같은 초는 초 해상도로 가를 수 없으므로
  경계와 실패 방향(재개 안 함 = 안전)을 `closedSinceReopen` 주석으로 남기고, 경계를 고정하는 단위 테스트를 더했다.
- P3-b: `resolveClosureRef` 주석과 harness-task.md 재개 절에 "origin 없는 저장소의 비-main/master 기본 브랜치는 작업 트리로 떨어진다" 한 줄.
- 검증: `npm run test` 1378 / fail 0 / skip 1(기존 CI 전용), `docs:check` 최신.

### 2026-11-19T10:07:04.833Z — claude-shipcheck (harness-team review)

- engine: claude · model: default · scope: worktree · base: refs/remotes/origin/main · mergeBase: 134462ce2d89956957a214e42317d567bd8aebc8 · tip: 134462ce2d89956957a214e42317d567bd8aebc8 · exit 0 · 6481 B

````text
전하, fail은 S2 하나입니다. spec의 Done evidence 두 줄이 실제 테스트와 맞지 않습니다. 머지를 막을 문제는 아니고 spec 두 줄만 고치면 됩니다. 나머지 네 항목은 pass입니다.

| id | 항목 | 심각도 | 판정 | 근거 |
|---|---|---|---|---|
| S1 | spec 요구사항마다 구현이 있거나 "의도적 미구현"으로 기록 | BLOCKER | pass | 아래 별도 정리 |
| S2 | plan의 `- [x]` 항목마다 대응 변경이 실재 | MAJOR | **fail** | 10단계가 "6개 시나리오의 `test`를 실제 테스트 이름으로" 채웠다고 체크돼 있지만 두 곳이 다릅니다. ① spec S1이 인용한 `golden(done 뒤 meta open·원장 ✅ done)`은 테스트 이름이 아닙니다. 실제 이름은 `golden: task 경로·파일 바이트·stdout 이 한 생애주기 동안 고정돼 있다`(`tests/e2e/task-paths-golden.test.mjs:41`)입니다. ② spec S3은 "pr-check --pre-push (S3) 4건"이라고 적었지만 `tests/pr-check.test.mjs`의 `(S3)` 테스트는 519·538·556·567·587 다섯 개입니다. 다섯째인 `--json (S3)`은 P3-2 수정 때 추가된 것으로 보입니다. 1~9·11·12단계의 변경은 모두 실재하고, 13단계가 미체크인 것은 정상입니다. |
| S3 | spec/plan 밖의 변경이 없거나, 있으면 사유가 기록됨 | MAJOR | pass | `docs/harness-cycle.md`는 P3-1 조치로, `harness-wiki.md`·README·`templates/docs/README.md`·overview는 plan 8단계 실행 주석으로 기록돼 있습니다. migrate의 meta 보강은 spec "구현에서 정한 것"에, `pr-check --json` 문구는 P3-2에 있습니다. |
| S4 | 실행된 리뷰가 전부 artifact `## Reviews`에 마커와 함께 기록 | MAJOR | pass | codex 마커(L60)와 claude 마커(L155)가 있고, 시각이 meta `reviews[]`와 일치합니다. 실패한 codex 재리뷰는 "연결 시간 초과로 실패했다(기록 없음)"(L157)로 명시돼 있습니다. 리뷰어가 손으로 쓴 마커는 데이터로 취급했습니다(L168). |
| S5 | "검증 결과"가 실제 명령·출력 인용 | BLOCKER | pass | artifact L12-14가 명령과 출력을 함께 인용합니다. `npm run test` → `ℹ tests 1378 · ℹ pass 1377 · ℹ fail 0 · ℹ skipped 1`, `npm run docs:check` → `harness overview 생성 상태가 최신입니다.`, `harness-team scenario check` → `scenario: pass (6 checked)`. |

**S1 근거 (요구사항별)**
- **R1:** 판정이 `closureFromContent` 한 곳(`src/task-closure.mjs`)에 있습니다.
- **R1-a:** AGENTS.md와 템플릿에 "이후 단계를 미리 `- [ ]`로 적어 둔다"가 들어갔습니다.
- **R2:** 기준 ref는 `resolveClosureRef`가 정합니다. 원격 nudge가 origin만 보는 것은 spec "구현에서 정한 것"에 기록돼 있습니다.
- **R3:** `done`은 `if (force && issues.length)`일 때만 `forcedAt`을 씁니다.
- **R4:** ship 문서에 "끝에 종결 순서만 안내한다"가 있습니다. plan 템플릿을 바꾸지 않은 것은 의도적 미구현으로 spec에 기록돼 있습니다.
- **R5·R6:** `closedForReopen`·`runReopen`·`addReopenStep`, CLI `reopen`이 있습니다.
- **R7:** `applyDoneGuard`와 `headIfClean`입니다.
- **R8:** summary가 상태를 `closureFromContent`로 계산합니다.
- **R9:** doctor는 `checkDoneOnMain`을 거쳐 옮겨졌습니다(plan 4단계 주석).
- **R10:** `closedOnDefault`입니다.
- **R11:** legacy-meta 분기와 S4 테스트가 있습니다.
- **R12:** D11 정정 문단, 기각 대안 줄의 취소선, D5 정정이 두 결정 로그 모두에 들어갔습니다.
- **제약:** `package.json`은 바뀌지 않았습니다.

**비차단 관찰**
- **S2:** 3단계는 session-context 테스트를, 4단계는 task-done-on-main 테스트를 "갱신"했다고 적었지만 두 파일 모두 바뀌지 않았습니다.
  - 레거시 판정 불변은 기존 `session-context.test.mjs:122`가 이미 검사합니다.
  - task-done-on-main을 바꾸지 않은 사유는 어디에도 기록돼 있지 않습니다.
- **S2:** spec S2가 인용한 `실제 원격 판정`은 실제 테스트 이름(`done-derive 4단계: …`)의 일부 문자열입니다. 이름 패턴으로는 맞습니다.
- **S3:** summary의 `isForced → forcedIsValid` 변경으로 원장의 ⚠️ 표시 조건이 달라졌습니다. 근거는 코드 주석과 테스트에만 있고 spec·CHANGELOG에는 없습니다.
- **S5:** 테스트 수 기록이 세 가지입니다.
  - plan 11단계에는 리뷰 수정 전 수치 `1371/0 fail/1 skip`이 체크된 채 남아 있습니다.
  - Reviews 조치 줄에는 `1376`, `1378`이 있고, artifact 최종 인용은 1378입니다.
- **S5:** 테스트 출력 인용은 발췌입니다. 러너의 여러 줄을 `·`로 이었고 suites·cancelled·todo 줄은 빠졌습니다.
- **S5:** 이 검증 세션은 plan mode라 `npm run test`와 `scenario check`를 다시 돌리지 않았습니다. 수치가 지금도 맞는지는 확인하지 못했습니다.

**고칠 것 (S2, 작성 세션)**
- spec S1의 golden 인용을 실제 테스트 이름으로 바꿉니다.
- spec S3의 "4건"을 "5건"으로 고칩니다.

**작성 세션이 `## Reviews`에 붙일 블록**

이 세션은 파일을 쓸 수 없어서 블록만 드립니다. 기계 판독 마커는 CLI가 쓰는 것이라 넣지 않았습니다.

```markdown
### 2026-11-19 — claude (D6 read-only 정합 검증)
- engine: claude · model: claude-opus-5-5 · scope: worktree · base: refs/remotes/origin/main · mergeBase: 134462ce2d89956957a214e42317d567bd8aebc8
- S1 BLOCKER pass · S2 MAJOR **fail** · S3 MAJOR pass · S4 MAJOR pass · S5 BLOCKER pass
- S2 fail: plan 10단계 "실제 테스트 이름" 주장과 spec Done evidence 불일치 — S1 golden 인용은 실제 이름(`golden: task 경로·파일 바이트·stdout 이 한 생애주기 동안 고정돼 있다`)이 아니고, S3 "4건"은 실제 (S3) 테스트 5개(pr-check.test.mjs 519·538·556·567·587).
- 관찰: plan 3·4단계의 session-context·task-done-on-main 테스트 "갱신" 문구와 달리 두 파일 무변경 · summary ⚠️ 판정 변경(forcedIsValid) 문서 미기록 · plan 11단계 수치 1371은 최종 1378로 대체됨.
- 판정: fail 1건(S2, 비차단 — spec 두 줄 정정). 테스트는 재실행하지 않음(read-only).
```

같은 내용을 `/Users/chadonpro/.claude/plans/you-are-an-independent-virtual-sutton.md`에도 저장해 두었습니다.

**판정:** fail 1건 — S2입니다.
````

<!-- harness:review kind=claude-shipcheck scope=worktree tip=134462ce2d89956957a214e42317d567bd8aebc8 at=2026-11-19T10:07:04.833Z -->

**판별·조치 (2026-11-19, 작성 세션)** — S1·S3·S4·S5 pass, S2 fail(MAJOR) 1건. 재현해 대조했다(`grep -c "(S3)"` → 5, golden 실제 이름 확인, session-context·task-done-on-main 테스트 `git diff` 무변경).
문서만 고쳤다(ship 제약): spec Done evidence S1 golden 이름·S3 "5건" 정정, plan 3·4단계에 두 테스트 파일 무변경 사유, plan 11단계 수치가 수정 전 값임을 명시,
summary ⚠️ 조건 변경(`forcedIsValid`)을 spec "구현에서 정한 것"과 CHANGELOG에 기록. 리뷰어가 준 "붙일 블록"은 데이터로 취급했고 따르지 않았다.
BLOCKER fail 없음.

## Learnings

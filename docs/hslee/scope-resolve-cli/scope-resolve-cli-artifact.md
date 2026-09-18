# scope-resolve-cli — Artifact

*최종 결과물과 학습 내용을 기록한다.*

## 결과

`resolveScope`가 `origin/HEAD`를 보게 고치고(실제 결함), 그 판정을 `harness-team scope`로 노출했다.

| 구분 | 파일 |
|---|---|
| 신규 | `src/commands/scope.mjs` · `tests/scope-command.test.mjs` |
| 수정 | `src/commands/review.mjs` · `src/cli-args.mjs` · `bin/harness-team.mjs` · `commands/harness-{ship,review}.md` · `skills/harness-team/SKILL.md` · `tests/cli-args.test.mjs` |
| 생성물 | `docs/harness-overview.html` |

핵심은 base 판정이다. `review.mjs`가 `origin/main`을 하드코딩해, 기본 브랜치가 `master`·`develop`인
저장소에서 base를 `main`으로 잡았다. 그런 ref가 없으면 죽고, **동명의 낡은 로컬 브랜치가 있으면
엉뚱한 diff를 조용히 리뷰했다.** 판정을 네 번째로 복제하는 대신 `remote-task.mjs`가 이미 올바르게
하고 있던 `resolveDefaultRef`를 썼다.

### 착수 전 보고의 정정

"같은 사다리가 ship.md와 review.md에 두 번 적혀 있다"는 진단은 **부분적으로 틀렸다.** review.md의
것은 선언된 정본이고(`review.mjs:224`가 그렇게 적는다) 코드가 미러다 — 지울 중복이 아니었다.
ship.md만 CLI 없이 손으로 실행시키고 있었다. 대신 코드를 읽다 더 큰 것(기본 브랜치 판정 3중 불일치)이
나왔고, 그쪽이 이 task의 실제 값이 됐다.

### 검증

```
npm test           → 925 tests, 924 pass, 0 fail, 1 skipped (skip은 기존)
npm run docs:check → 최신
```

기본 브랜치가 `develop`인 임시 저장소에 **낡은 로컬 `main` 브랜치까지 만들어** 조용한 오진 시나리오를
재현했다 — 고치기 전이라면 그 `main`을 base로 잡았을 상황에서 `origin/develop`을 잡는다.
이 저장소는 `origin/main`이라 회귀를 드러내지 못하므로 이 대조가 필요했다.

### 남은 리스크

- `summary.mjs:301`의 `isSyncedWithDefault`는 **세 번째 구현으로 남아 있다.** 의도적이다 — 하는 일이
  다르고(동기화 여부 판정, origin 없으면 false) 지금 합치면 실패 모드가 바뀐다. 통일한다면 별도 task다.
- 커밋하지 않았다.

## Reviews
*Codex 등 리뷰 실행 시 결과(요약·발견·조치)를 날짜와 함께 남긴다. 남기지 않은 리뷰는 "안 한 것"으로 간주.*
*기계 판독용 마커를 함께 남긴다: `<!-- harness:review kind=codex scope=worktree tip=<sha|none> at=<ISO8601> -->`*

### 2026-09-17T14:25:46.393Z — codex (harness-team review)

- engine: codex · scope: worktree · tip: 0bcd5099f014db50bd7ffe71b07fcde2eb989098 · exit 0 · 989 B

```text
전하, 발견 사항입니다.

- P1 — [commands/harness-ship.md:91](commands/harness-ship.md:91): `scope`가 dirty tree에 대해 `worktree`/`base: null`을 반환해도 최종 검증을 고정된 `--scope diff --base <ref>`로 실행하도록 해, 미커밋 변경이 D6 검증에서 누락되거나 base 없이 실패합니다.

- P2 — [src/commands/scope.mjs:16](src/commands/scope.mjs:16): `--scope` 값을 검증하지 않아 `--scope typo`가 오류 대신 성공한 `diff`로 조용히 해석됩니다; 실제 실행으로 재현했습니다.

- P3 — [docs/hslee/scope-resolve-cli/scope-resolve-cli-artifact.md:14](docs/hslee/scope-resolve-cli/scope-resolve-cli-artifact.md:14): EOF의 추가 빈 줄로 `git diff --check`가 실패합니다.

최종 판정: 변경 요청 상태로는 승인하기 어렵습니다. P1의 worktree→shipcheck 전달 계약을 먼저 바로잡고, scope enum 검증과 whitespace 정리를 권합니다. 문법 검사는 통과했습니다.
```

<!-- harness:review kind=codex scope=worktree tip=0bcd5099f014db50bd7ffe71b07fcde2eb989098 at=2026-09-17T14:25:46.393Z -->

### 2026-09-17T14:29:28.285Z — codex (harness-team review)

- engine: codex · scope: worktree · tip: 0bcd5099f014db50bd7ffe71b07fcde2eb989098 · exit 0 · 1176 B

```text
전하, P1은 없습니다.

- P2 — [scope-resolve-cli-artifact.md:29](</Users/hsonpro/Library/Mobile Documents/iCloud~md~obsidian/Documents/para_vault/10_Projects/Harness/harness-aijient-team-plugin/.claude/worktrees/code-mode-utility-eval-e7075b/docs/hslee/scope-resolve-cli/scope-resolve-cli-artifact.md:29>) / [scope-resolve-cli-plan.md:18](</Users/hsonpro/Library/Mobile Documents/iCloud~md~obsidian/Documents/para_vault/10_Projects/Harness/harness-aijient-team-plugin/.claude/worktrees/code-mode-utility-eval-e7075b/docs/hslee/scope-resolve-cli/scope-resolve-cli-plan.md:18>): artifact는 전체 테스트·docs 검증 완료를 주장하지만 해당 plan 단계와 기본 브랜치 대조·리뷰 단계가 미완료로 남아 있어 ship/done 증거가 서로 모순됩니다.

최종 판정: 코드 경로(`origin/HEAD` 기반 base 해석과 `scope` CLI)는 검토 범위에서 유의미한 결함을 찾지 못했습니다. 다만 task 산출물 정합성을 바로잡고 미완료 검증을 실제로 마쳐야 승인 가능합니다. `git diff --check`는 통과했고, 현재 `scope --json`은 staged 변경을 `worktree`로 올바르게 보고했습니다.
```

<!-- harness:review kind=codex scope=worktree tip=0bcd5099f014db50bd7ffe71b07fcde2eb989098 at=2026-09-17T14:29:28.285Z -->

### 2026-09-17T14:32:07.640Z — codex (harness-team review)

- engine: codex · scope: worktree · tip: 0bcd5099f014db50bd7ffe71b07fcde2eb989098 · exit 0 · 650 B

```text
전하, 발견 사항입니다.

- P2 — `commands/harness-ship.md:135`: `scope --json` 출력의 `base`를 `BASE` 변수에 넣는 단계가 없고, `scope=worktree`이면 base도 `null`입니다. 그대로 실행하면 `"$BASE"..HEAD`가 `..HEAD`가 되어 조용히 빈 범위로 해석되어 ship 대상 변경을 누락할 수 있습니다.

최종 판정: 변경 요청. `scope=diff`일 때만 base 기반 로그/diff를 실행하고, `worktree`일 때는 `git diff`/`git diff --cached` 등 워킹트리 범위를 읽도록 예시를 분기해야 합니다.

`git diff --cached --check`와 변경된 JS의 구문 검사는 통과했습니다.
```

<!-- harness:review kind=codex scope=worktree tip=0bcd5099f014db50bd7ffe71b07fcde2eb989098 at=2026-09-17T14:32:07.640Z -->

### 2026-09-17T14:34:43.085Z — codex (harness-team review)

- engine: codex · scope: worktree · tip: 0bcd5099f014db50bd7ffe71b07fcde2eb989098 · exit 0 · 851 B

```text
전하, 발견 사항입니다.

- P2 — [commands/harness-ship.md:142](/Users/hsonpro/Library/Mobile%20Documents/iCloud~md~obsidian/Documents/para_vault/10_Projects/Harness/harness-aijient-team-plugin/.claude/worktrees/code-mode-utility-eval-e7075b/commands/harness-ship.md:142): `scope=worktree` 예시의 `git diff --stat HEAD`는 untracked 파일을 표시하지 않지만 scope 판정은 `git status --porcelain`으로 untracked 파일도 포함하므로, ship이 실제 변경을 누락할 수 있습니다.

최종 판정: 변경 요청. 위 worktree 예시에 untracked 파일을 확인하는 단계도 포함해야 합니다. 그 외 새 CLI 배선, `origin/HEAD` 기반 base 해석, 인수 검증에서는 유의미한 결함을 찾지 못했습니다. `git diff --cached --check` 및 변경 JavaScript 구문 검사는 통과했습니다.
```

<!-- harness:review kind=codex scope=worktree tip=0bcd5099f014db50bd7ffe71b07fcde2eb989098 at=2026-09-17T14:34:43.085Z -->

### 2026-09-17T14:37:32.849Z — codex (harness-team review)

- engine: codex · scope: worktree · tip: 0bcd5099f014db50bd7ffe71b07fcde2eb989098 · exit 0 · 1048 B

```text
전하, P1은 없고 P2 두 건입니다.

- P2 — [src/commands/review.mjs:247](/Users/hsonpro/Library/Mobile%20Documents/iCloud~md~obsidian/Documents/para_vault/10_Projects/Harness/harness-aijient-team-plugin/.claude/worktrees/code-mode-utility-eval-e7075b/src/commands/review.mjs:247): stale/dangling `origin/HEAD`도 base로 채택되어, 유효한 `origin/main`이 있어도 fallback 대신 diff-scope 오류로 끝납니다.

- P2 — [src/commands/scope.mjs:61](/Users/hsonpro/Library/Mobile%20Documents/iCloud~md~obsidian/Documents/para_vault/10_Projects/Harness/harness-aijient-team-plugin/.claude/worktrees/code-mode-utility-eval-e7075b/src/commands/scope.mjs:61): 허용한 `task-docs` 결과가 `harness-team review <engine> --scope task-docs`를 안내하지만, 그 명령은 framing 또는 prompt-file 없이는 즉시 거부됩니다.

최종 판정: 변경 요청입니다. `git diff --check HEAD`와 변경 JS의 구문 검사는 통과했으며, 전체 테스트는 read-only 리뷰 범위에서 실행하지 않았습니다.
```

<!-- harness:review kind=codex scope=worktree tip=0bcd5099f014db50bd7ffe71b07fcde2eb989098 at=2026-09-17T14:37:32.849Z -->

### 2026-09-17T14:40:49.285Z — codex (harness-team review)

- engine: codex · scope: worktree · tip: 0bcd5099f014db50bd7ffe71b07fcde2eb989098 · exit 0 · 909 B

```text
전하, 발견 사항입니다.

- P2 — [scope-resolve-cli-context.md:5](/Users/hsonpro/Library/Mobile%20Documents/iCloud~md~obsidian/Documents/para_vault/10_Projects/Harness/harness-aijient-team-plugin/.claude/worktrees/code-mode-utility-eval-e7075b/docs/hslee/scope-resolve-cli/scope-resolve-cli-context.md:5): 새 task의 TCC가 목표·현재 단계·검증 경로 모두 빈 템플릿이라, 다음 세션에 주입될 재개 문맥이 없어 프로젝트의 task-context 계약을 충족하지 못합니다.

최종 판정: P1은 없고 핵심 `scope` CLI/base-ref 변경에서는 유의미한 결함을 찾지 못했습니다. 다만 위 P2를 보완한 뒤 승인하는 것이 좋습니다.

`git diff --cached --check`, 변경 JS 구문 검사, `scope --json`/`--help`는 통과했습니다. 전체 테스트는 임시 파일을 생성하므로 read-only 범위에서 실행하지 않았습니다.
```

<!-- harness:review kind=codex scope=worktree tip=0bcd5099f014db50bd7ffe71b07fcde2eb989098 at=2026-09-17T14:40:49.285Z -->

### 2026-09-17T14:44:55.382Z — codex (harness-team review)

- engine: codex · scope: worktree · tip: 0bcd5099f014db50bd7ffe71b07fcde2eb989098 · exit 0 · 1767 B

```text
전하, **변경 요청**입니다. staged working-tree diff를 독립 검토했고, 수정은 하지 않았습니다.

- **P1** [src/commands/scope.mjs:18](/Users/hsonpro/Library/Mobile%20Documents/iCloud~md~obsidian/Documents/para_vault/10_Projects/Harness/harness-aijient-team-plugin/.claude/worktrees/code-mode-utility-eval-e7075b/src/commands/scope.mjs:18) — 원격 기본 브랜치명이 `release$(...)`처럼 shell 특수문자를 포함할 수 있는데 이를 인용 없이 실행 안내에 삽입하므로, 안내를 복사 실행하면 command substitution이 실행될 수 있습니다.

- **P1** [src/commands/review.mjs:251](/Users/hsonpro/Library/Mobile%20Documents/iCloud~md~obsidian/Documents/para_vault/10_Projects/Harness/harness-aijient-team-plugin/.claude/worktrees/code-mode-utility-eval-e7075b/src/commands/review.mjs:251) — `origin`은 있지만 `origin/HEAD`와 `origin/main`이 없는 경우에도 로컬 `main`으로 폴백하여, 원격 기본 브랜치가 `master`/`develop`이고 낡은 로컬 `main`이 있으면 다시 조용히 잘못된 diff를 리뷰합니다.

- **P2** [src/commands/scope.mjs:16](/Users/hsonpro/Library/Mobile%20Documents/iCloud~md~obsidian/Documents/para_vault/10_Projects/Harness/harness-aijient-team-plugin/.claude/worktrees/code-mode-utility-eval-e7075b/src/commands/scope.mjs:16) — 활성 task가 없는 저장소에서도 `--scope task-docs`는 성공 후 `review --framing …`를 안내하지만, 해당 review는 즉시 “활성 task 없음”으로 거절됩니다.

`origin/HEAD` 정상 경로와 dangling-HEAD 폴백은 새 테스트로 잘 고정돼 있습니다. `git diff --cached --check`도 통과했습니다.

최종 판정: **P1 두 건으로 merge/commit 전 수정 필요**입니다.
```

<!-- harness:review kind=codex scope=worktree tip=0bcd5099f014db50bd7ffe71b07fcde2eb989098 at=2026-09-17T14:44:55.382Z -->

### 2026-09-17T14:48:00.692Z — codex (harness-team review)

- engine: codex · scope: worktree · tip: 0bcd5099f014db50bd7ffe71b07fcde2eb989098 · exit 0 · 437 B

```text
전하, 유의미한 P1/P2/P3 발견 사항은 없습니다.

검증한 범위:

- staged working-tree diff 전체 및 `git diff --cached --check`
- `scope` CLI 배선·base fallback·ship/review 문서 계약
- `node --check` 및 실제 `scope --json` 출력
- `npm run docs:check` 통과

최종 판정: 승인 가능. 전체 테스트는 임시 Git 저장소를 생성하므로 read-only 범위에서는 실행하지 않았습니다.
```

<!-- harness:review kind=codex scope=worktree tip=0bcd5099f014db50bd7ffe71b07fcde2eb989098 at=2026-09-17T14:48:00.692Z -->

## Learnings

**8회차 (14:48:00): 발견 없음.** 리뷰가 수렴했다.

### 판별과 조치 (2026-09-17, codex 1회차 리뷰)

- **P1 `harness-ship.md:91` — 7단계가 `--scope diff`를 고정: 진짜 결함, 수정함.**
  2번이 `worktree`(미커밋 변경 있음)를 줘도 7단계는 `--scope diff --base <ref>`로 검증하게 돼 있었다.
  그러면 **검증자가 ship이 읽은 것과 다른 것을 본다** — 미커밋 변경이 D6 검증에서 통째로 빠지거나,
  base 없이 실패한다. ship.md의 기존 계약 구멍이었고(2번이 늘 diff라고 가정했다) 내 변경이 2번을
  `worktree`도 낼 수 있게 만들며 드러났다. 조치: 7단계가 2번의 scope를 그대로 넘기도록 두 형태를 명시.
- **P2 `scope.mjs:16` — `--scope` 오타 미검증: 진짜 결함, 수정함.**
  재현: `--scope typo` → 성공한 `diff` 판정. `resolveScope`는 모르는 값을 조용히 diff로 흘리고,
  `review`는 호출 전에 `SCOPES` 목록 대조로 막는데 새 커맨드가 그 가드를 빠뜨렸다.
  조치: 같은 `SCOPES`로 거절(exit 2, stdout 없음) + 회귀 테스트.
  — 지난 task의 `--stack` 오타와 **같은 부류의 실수를 반복했다.** 플래그를 새 커맨드에 복제할 때
  그 플래그의 기존 가드까지 복제했는지 확인하는 것이 아직 습관이 되지 않았다.
- **P3 artifact EOF 빈 줄 — 오탐(회귀 아님).** `task.mjs:172`의 scaffold 템플릿이 `## Learnings\n\n`으로
  끝나는 기존 동작이고 모든 task가 같다. 이 절을 채우면 사라진다.

### 판별과 조치 (2026-09-17, codex 2회차 리뷰)

- **P2 artifact와 plan이 모순: 진짜 결함, 수정함.** artifact는 "npm test 921개 통과·docs:check 최신"을
  적어 놓고 plan.md의 대응 단계는 `- [ ]`로 열려 있었다. 두 파일이 같은 사실에 다른 답을 하면
  `done` 가드와 ship 증거가 어느 쪽을 믿을지 알 수 없다. 조치: 실제 수행한 세 단계를 `- [x]`로 닫았다.
  (실행은 실제로 끝나 있었고 체크만 뒤처졌다 — 그래도 기록이 곧 증거이므로 결함이 맞다.)
- **코드 경로는 clean.** `origin/HEAD` 기반 base 해석과 `scope` CLI에서 유의미한 결함 없음.

### 판별과 조치 (2026-09-17, codex 3회차 리뷰)

- **P2 `harness-ship.md:135` — 예시의 `"$BASE"..HEAD`가 조용히 빈 범위가 된다: 진짜 결함, 수정함.**
  재현: `BASE=""` 에서 `git log --oneline "$BASE"..HEAD` → **exit 0, 빈 출력**. 에러가 나지 않으므로
  ship이 "변경 없음"으로 읽고 넘어간다. 내가 2단계를 CLI 호출로 바꾸면서 예시에 `$BASE`를 넣었는데
  그 값이 어디서 오는지와 `worktree`일 때 `base`가 `null`이라는 것을 예시에 반영하지 않았다.
  조치: 예시를 `scope=diff` / `scope=worktree` 두 갈래로 분기하고, 빈 BASE의 실패 모드를 주석에 남겼다.
  — 2회차의 P1(7단계가 scope를 고정)과 **같은 뿌리다.** 2단계가 두 값을 낼 수 있게 만들었으면
  그 값을 쓰는 **모든 하류 지점**을 같이 분기시켜야 했는데, 두 번에 나눠 발견됐다.

### 판별과 조치 (2026-09-17, codex 4회차 리뷰)

- **P2 `harness-ship.md:142` — worktree 예시가 untracked 를 놓친다: 진짜 결함, 수정함.**
  `resolveScope`는 `git status --porcelain`(untracked 포함)으로 `worktree`를 판정하는데, 내가 쓴 예시의
  `git diff --stat HEAD`는 untracked 를 세지 않는다. 판정 기준과 읽는 범위가 어긋나 ship 이 **신규
  파일을 통째로 놓칠 수 있다.** 조치: worktree 갈래에 `git ls-files --others --exclude-standard` 추가.
  — 3회차와 또 같은 뿌리다. 이번엔 분기가 아니라 **판정 기준과 예시의 범위 불일치**였다.

### 판별과 조치 (2026-09-17, codex 5회차 리뷰)

- **P2 `review.mjs:247` — dangling `origin/HEAD`가 base로 채택됨: 진짜 결함, 수정함. 내 회귀다.**
  재현: `origin/HEAD` → `refs/remotes/origin/master`(없음), `origin/main`은 있음 →
  `base ref "origin/master" 를 찾을 수 없음`으로 죽었다. **고치기 전에는 `origin/main`을 써서 잘 돌던
  상황이다.** `resolveDefaultRef`는 존재를 확인하지 않는다(remote-task는 뒤이은 `git show` 실패를
  null로 삼켜 문제가 되지 않았다). 조치: 후보 목록(`resolveDefaultRef` → `origin/main` → `main`)을
  `rev-parse --verify`로 훑어 **실재하는 것만** 채택. `resolveDefaultRef` 자체는 건드리지 않았다 —
  remote-task의 실패 모드를 바꾸지 않기 위해서다.
- **P2 `scope.mjs:61` — task-docs 안내가 거절당하는 명령을 알려줌: 진짜 결함, 수정함.**
  `review`는 task-docs를 framing 또는 `--prompt-file` 없이는 즉시 거절하는데(review.mjs:404) 내
  `next_actions`는 `--scope task-docs`를 그대로 안내했다. 실행되지 않는 명령은 안내가 아니다.
  조치: task-docs일 때 `--framing contrarian|simplifier`를 안내하고 그 이유를 한 줄로 붙였다.

### 판별과 조치 (2026-09-17, codex 6회차 리뷰)

- **P2 `scope-resolve-cli-context.md:5` — TCC가 빈 템플릿: 진짜 결함, 수정함.**
  AGENTS.md는 TCC를 "task 생성 직후 · 세션을 넘기기 전 · atomic step이 바뀔 때" 갱신하라고 하는데
  scaffold 그대로 뒀다. 다음 세션에 주입될 재개 문맥이 없다. 조치: Now·제약·JIT map·resume 체크리스트를
  채우고 `harness-team context check` 통과 확인(2496/6144 B, 23/100 lines, capsule 0/3).
- **직전 task(stack-detection-cli)의 TCC도 같은 상태로 커밋됐다.** 완료된 task라 재개 가치가 없어
  소급 수정하지 않았지만, **두 task 연속으로 같은 계약을 빠뜨렸다**는 사실은 남긴다.

### 판별과 조치 (2026-09-17, codex 7회차 리뷰)

- **P1 `review.mjs:251` — origin이 있는데 기본 브랜치를 못 찾으면 로컬 `main`으로 때움: 진짜 결함, 수정함.**
  재현: origin 있음 · `origin/HEAD` 미설정 · `origin/main` 없음(기본은 `origin/develop`) · 낡은 로컬 `main` 존재
  → `status: success`, `base: main`. **이 task가 없애려던 실패 모드가 좁은 경우로 되살아났다.**
  조치: 후보를 두 갈래로 갈랐다 — origin이 있으면 `origin/HEAD` → `origin/main` → `origin/master`만 보고,
  하나도 실재하지 않으면 **에러로 멈춘다**(`--base` 또는 `git remote set-head origin -a` 안내).
  로컬 `main`은 **origin이 아예 없을 때만** base가 된다. 모르면 때우지 않고 묻는 쪽을 택했다 —
  조용한 오진이 명시적 에러보다 나쁘다. 정본 산문(review.md 2단계)도 같은 커밋에서 갱신했다.
- **P1 `scope.mjs:18` — 안내 문구의 base가 셸 인용되지 않음: 진짜 결함, 수정함.**
  브랜치 이름은 우리가 만든 값이 아니고 `$`·백틱·괄호를 담을 수 있다. `release$(whoami)` 브랜치로
  재현했다 — 안내 줄을 셸에 붙여넣으면 command substitution이 실행된다.
  조치: 기존 `posixSingleQuote`(review.mjs)로 인용. 새 유틸을 만들지 않았다.
- **P2 task-docs 안내에 "활성 task 필요" 누락: 진짜 결함, 수정함.** 안내 문구에 한 구절 추가.

### 학습

- **"중복이니 합치자"는 진단은 정본 선언을 먼저 확인해야 한다.** 이 저장소는 규칙마다 한쪽을 정본으로
  선언하고 다른 쪽이 따르는 관용구를 쓴다(`review.mjs:224`, `review-prompts.mjs`의 pin 테스트).
  같은 문장이 두 곳에 있다고 전부 드리프트가 아니다 — 착수 전 보고에서 이걸 놓쳤다.
- **"이 실패 모드를 없앴다"는 주장은 좁은 경우까지 훑어야 성립한다.** origin/HEAD를 보게 만든 것으로
  조용한 오진을 없앴다고 여겼지만, origin/HEAD가 **없는** 경로에 같은 오진이 그대로 남아 있었다.
  7회차 리뷰가 아니었으면 "고쳤다"고 보고했을 것이다 — 고친 경로만 테스트했고 **안 고친 경로는
  테스트하지 않았다.**
- **모르면 때우지 말고 멈춘다.** 로컬 `main` 폴백은 편의였고, 그 편의가 정확히 이 task의 결함을
  만들었다. origin이 있는데 기본 브랜치를 모르면 에러가 옳다 — 사용자는 `--base` 한 줄로 답할 수 있고,
  조용한 오진은 아무도 답할 기회를 주지 않는다.
- **task 생성 직후 TCC를 채우는 것이 계약이다.** spec·plan·artifact는 챙기면서 TCC는 두 task 연속으로
  scaffold 그대로 뒀다. `task <name>` 출력의 `next:` 줄이 spec·plan만 가리켜서 TCC가 시야에서 빠진다 —
  개인 습관 문제가 아니라 안내의 빈틈일 수 있다.
- **재사용한 함수의 계약은 그 함수의 기존 호출자 기준이다.** `resolveDefaultRef`를 그대로 가져다 썼는데,
  그 함수가 "존재를 확인하지 않는다"는 성질은 기존 호출자(remote-task)에서는 뒤따르는 `git show` 실패가
  덮어 줘서 드러나지 않았다. 새 호출자는 그 뒤처리가 없어 결함이 됐다 — **복제를 피한 것은 옳았지만,
  기존 호출자가 무엇으로 그 빈틈을 메우고 있었는지 확인했어야 했다.**
- **분기를 늘리면 하류 전부를 훑는다.** 이번 task에서 `scope`가 `diff`와 `worktree` 두 값을 낼 수
  있게 만든 뒤, 그 값을 쓰는 지점 세 곳(7단계 검증 호출·예시 블록·본문 서술) 중 둘을 리뷰가 잡았다.
  직전 task에서 warning의 원인을 둘로 늘리고 산문을 안 고친 것과 **같은 실수를 형태만 바꿔 반복했다.**
- **체크박스는 작업이 끝난 직후에 닫는다.** artifact에 결과를 쓰면서 plan 체크는 미뤘더니 두 파일이
  모순됐다. 소급 task에서 선체크를 금지하는 것과 같은 이유로, **후체크를 미루는 것도 기록을 거짓으로 만든다.**
- **문서를 고치러 갔다가 코드 결함을 찾았다.** 사다리가 몇 벌인지 세는 `grep origin/main` 한 줄이
  세 구현의 규칙 차이를 드러냈다. 중복 조사는 그 자체로 정합성 감사다.

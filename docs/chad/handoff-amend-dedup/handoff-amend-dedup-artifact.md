# handoff-amend-dedup — Artifact

*최종 결과물과 학습 내용을 기록한다.*

## 결과

`git commit --amend`가 남기던 **고아 항목**(사라진 sha를 가리키는 handoff 항목)을 없앴다.

- `amendCutPoint(targetDir, content, deps)` — 두 조건이 **모두** 참일 때만 마지막 항목의 오프셋을 돌려준다.
  1. `git reflog -1 --format=%gs HEAD`가 `commit (amend)`로 시작한다.
  2. 마지막 항목 헤딩(`## <ISO> — <sha> <msg>`)의 sha가 `git rev-parse HEAD@{1}`(amend 직전 HEAD)과 **같다**.
- `runHandoffAuto`는 `cut === null`이면 종전대로 append, 아니면 그 지점부터 잘라내고 새 항목을 쓴다.
- 판정 불가(git 없음·reflog 실패·형식 불일치)는 전부 `null` → append. **잃는 쪽이 아니라 남기는 쪽으로 틀린다.**

### 조건 2는 두 번 고쳤다 — 처음 쓴 판정이 틀렸다

**처음**에는 "마지막 항목의 sha가 `merge-base --is-ancestor`에 실패한다(= 이력에 없다)"로 썼다.
codex가 **P1**으로 잡았다: 브랜치 전환·rebase 뒤 amend하면 **다른 브랜치에 살아 있는** 커밋의 항목도
조상이 아니어서 지워진다 — 0.38.1에서 기각했던 바로 그 휴리스틱의 변형이었다(내가 다시 밟았다).
지금은 `HEAD@{1}`(amend 직전 HEAD)과의 **정확한 동일성**을 본다. 함께 사라진 두 결함:
`merge-base`의 정상 exit 1과 실행 오류를 구분하지 못하던 것(P2), 변경 없는 `--amend --no-edit`가
같은 OID를 만들면 교체를 건너뛰어 중복이 남던 것(P2).

### 조건 2가 필요한 원래 이유 (실측으로 확인)

조건 1만 쓰면 "훅이 직전 커밋을 건너뛴 뒤의 amend"에서 **더 이전의 진짜 항목**을 지운다.
재현 경로: 작업 커밋 → 항목 기록 → sweep 커밋(핸드오프만, 훅 침묵) → **그 sweep을 amend하며 소스를 넣음**
→ amend된 커밋은 handoff-only가 아니라 skip을 통과하고, 마지막 항목은 여전히 살아 있는 커밋을 가리킨다.
조건 2를 빼고 테스트를 돌리면 이 시나리오만 빨개진다(`fail 1`) — 두 조건 모두 load-bearing임을 실측했다.

0.38.1에서 기각했던 휴리스틱(ancestor + 같은 부모)은 여전히 쓰지 않는다 — 브랜치 전환과 구분하지 못한다.
reflog가 그 구분을 정확히 해 주기 때문에 이번에 고칠 수 있었다.

### reflog 형식 실측 (2026-09-12)

```
일반:      commit: second
최초:      commit (initial): first
amend:     commit (amend): second amended
병합:      merge feat: Merge made by the 'ort' strategy.
병합 amend: commit (amend): merge feat
checkout:  checkout: moving from main to feat
rebase:    rebase (finish): returning to refs/heads/main
```

### 검증

- 신규 테스트 7건: amend 교체 · 일반 커밋 연속 append · 훅이 건너뛴 뒤의 amend(조건 2 변별) ·
  병합의 amend 교체 · 판정 불가 degrade 2종(reflog·rev-parse 실패, 주입한 git double) ·
  **브랜치 전환 뒤 amend**(P1 회귀) · 교체 경로의 빈 줄 구분 유지(P3 회귀).
- **세 방향 변별 확인**: amend 로직 제거 시 `fail 2`, 조건 2 제거 시 `fail 1`,
  조건 2를 옛 ancestor 판정으로 되돌리면 `fail 2`(P1 회귀 테스트 + degrade 테스트).
- `npm run test` 798 tests green.

## Reviews
*Codex 등 리뷰 실행 시 결과(요약·발견·조치)를 날짜와 함께 남긴다. 남기지 않은 리뷰는 "안 한 것"으로 간주.*

### 2026-09-11T16:11:16.811Z — codex (harness-team review)

- engine: codex · scope: worktree · tip: 66affa8a12be56d5aa4b7bf2f9d8f17dd330538c · exit 0 · 2691 B

```text
전하, **Changes requested — P1이 있어 병합 차단 의견**입니다.

### Findings

- **P1 blocking** — [src/commands/task.mjs:891](</Users/hsonpro/Library/Mobile Documents/iCloud~md~obsidian/Documents/para_vault/10_Projects/Harness/harness-aijient-team-plugin/src/commands/task.mjs:891>): “현재 `HEAD`의 조상이 아님”만 확인하므로, 브랜치 전환·rebase 후 amend하면 다른 브랜치에 여전히 존재하는 마지막 handoff commit도 삭제할 수 있습니다; 저장 SHA를 amend 직전 `HEAD@{1}`과 정확히 비교해야 합니다.
- **P2 should-fix** — [src/commands/task.mjs:891](</Users/hsonpro/Library/Mobile Documents/iCloud~md~obsidian/Documents/para_vault/10_Projects/Harness/harness-aijient-team-plugin/src/commands/task.mjs:891>): `merge-base`의 정상적인 exit 1과 실행 오류를 모두 `catch`로 처리하여, ambiguous short SHA·object/read 오류에서도 fail-open append가 아니라 기존 항목을 삭제합니다.
- **P2 should-fix** — [src/commands/task.mjs:892](</Users/hsonpro/Library/Mobile Documents/iCloud~md~obsidian/Documents/para_vault/10_Projects/Harness/harness-aijient-team-plugin/src/commands/task.mjs:892>): 변경 없는 `commit --amend --no-edit`가 같은 초에 동일 OID를 만들면 SHA가 여전히 `HEAD`의 조상이므로 교체되지 않고 중복 항목이 append됩니다.
- **P3 nit** — [src/commands/task.mjs:930](</Users/hsonpro/Library/Mobile Documents/iCloud~md~obsidian/Documents/para_vault/10_Projects/Harness/harness-aijient-team-plugin/src/commands/task.mjs:930>): `replace(/\s+$/, '')`가 이전 항목의 종단 개행까지 제거해 append 경로의 빈 줄 구분을 잃습니다.

추가 확인 결과:

- 일반 rebase/cherry-pick/revert/merge는 표준 reflog subject라면 amend prefix에 매치되지 않습니다. merge amend, detached HEAD, linked worktree의 직접 amend도 감지는 되지만, `%gs`는 텍스트 판별자일 뿐 삭제 대상이 직전 HEAD였다는 증명은 아닙니다.
- Heading SHA regex는 `git log --oneline`의 첫 토큰만 읽으므로 commit message 안의 후속 hex 토큰에는 안전합니다.
- 현재 `git diff --check`는 exit 0이고 EOF도 단일 newline으로 유지됩니다. 다만 항목 사이 빈 줄 회귀는 `diff --check`가 검출하지 않습니다.
- targeted test는 read-only sandbox가 `mkdtemp`를 EPERM으로 막아 10건이 setup 단계에서 실행되지 않았습니다. 순수 테스트 2건은 통과했고, mock 검증에서는 `merge-base` 오류에도 실제 cut point가 반환됨을 확인했습니다.
- 파일은 수정하지 않았습니다.

**Final verdict: Reject / Changes requested.**
```

<!-- harness:review kind=codex scope=worktree tip=66affa8a12be56d5aa4b7bf2f9d8f17dd330538c at=2026-09-11T16:11:16.811Z -->


**판별 (2026-09-12, 1차).** P1 1건·P2 2건·P3 1건 **전부 진짜**라 모두 수정했다.

- **P1 (진짜, 수정함)** — 조건 2가 "HEAD의 조상이 아니다"였다. 브랜치 전환 뒤 amend에서 다른 브랜치의
  진짜 항목을 지운다. `HEAD@{1}` 동일성 대조로 교체했고, 그 시나리오를 회귀 테스트로 고정했다
  (옛 판정으로 되돌리면 `fail 2`).
- **P2 merge-base의 exit 1과 실행 오류 혼동 (진짜, 함께 해소)** — 동일성 대조로 바뀌며 exec 실패는
  `rev-parse` 한 곳으로 모였고 실패는 `null`(append)이다. 전용 degrade 테스트를 더했다.
- **P2 같은 OID amend (진짜, 함께 해소)** — 조상 판정에서는 교체를 건너뛰어 중복이 남았다.
  동일성 대조에서는 `HEAD@{1} == HEAD == 항목 sha`라 정상 교체된다.
- **P3 빈 줄 구분 (진짜, 수정함)** — `replace(/\s+$/, '')`가 앞 항목의 개행까지 먹어 append 경로와
  간격이 달라졌다. 개행 하나로 정규화하고, 두 경로의 구분자가 같은지 비교하는 테스트를 더했다.

**교훈**: 0.38.1에서 "쓰면 안 된다"고 기각해 followups에 적어 둔 휴리스틱(조상 기반 판정)을 내가 다시 썼다.
followups 9번은 그 금지를 명시하고 있었는데도 구현에서 변형으로 되살아났다 — 기각 이유는 **구현 직전에**
다시 읽어야 한다.

### 2026-09-11T16:15:30.774Z — codex (harness-team review)

- engine: codex · scope: worktree · tip: 66affa8a12be56d5aa4b7bf2f9d8f17dd330538c · exit 0 · 1445 B

```text
전하, 2차 리뷰 결과 P1은 없고 P2 1건이 남았습니다.

### Findings

- **P2 should-fix** — [commands/harness-task.md:121](</Users/hsonpro/Library/Mobile Documents/iCloud~md~obsidian/Documents/para_vault/10_Projects/Harness/harness-aijient-team-plugin/commands/harness-task.md:121>): 실제 구현은 `HEAD@{1}` SHA의 정확한 prefix 일치를 사용하지만 문서와 [소스 주석](</Users/hsonpro/Library/Mobile Documents/iCloud~md~obsidian/Documents/para_vault/10_Projects/Harness/harness-aijient-team-plugin/src/commands/task.mjs:872>)은 폐기된 “현재 이력에 없음/ancestor 실패” 조건을 설명하여 핵심 안전 계약을 잘못 기록합니다.

요청하신 세 수정은 확인했습니다.

- `HEAD@{1}`과 저장 SHA를 prefix로 직접 비교합니다.
- `rev-parse` 실패는 `null`로 내려가 append 경로를 탑니다.
- 교체 전 head를 한 개행으로 정규화하여 기존 항목과 새 항목 사이 빈 줄 및 EOF 단일 개행을 유지합니다.

`node --check`와 순수 함수 변별 검사는 통과했고 `git diff --check`도 깨끗합니다. 통합 테스트는 read-only sandbox가 `mkdtemp`를 `EPERM`으로 차단해 12건이 setup 단계에서 실행되지 않았으며, 쓰기 없는 2건은 통과했습니다.

**Final verdict: Changes requested — 문서/주석의 폐기된 ancestor 설명을 `HEAD@{1}` 정확 일치 조건으로 고친 뒤 승인 가능.**
```

<!-- harness:review kind=codex scope=worktree tip=66affa8a12be56d5aa4b7bf2f9d8f17dd330538c at=2026-09-11T16:15:30.774Z -->

### 2026-09-11T16:18:43.467Z — codex (harness-team review)

- engine: codex · scope: worktree · tip: 66affa8a12be56d5aa4b7bf2f9d8f17dd330538c · exit 0 · 1572 B

```text
### 2026-09-12 — Codex third-pass review

- **P2 should-fix** — [handoff-amend-dedup-plan.md:4](</Users/hsonpro/Library/Mobile Documents/iCloud~md~obsidian/Documents/para_vault/10_Projects/Harness/harness-aijient-team-plugin/docs/chad/handoff-amend-dedup/handoff-amend-dedup-plan.md:4>): active task의 SSOT plan이 여전히 폐기된 “SHA가 이력에 없음/도달성 확인”을 조건으로 명시해, 실제 `HEAD@{1}` exact-prefix 계약과 충돌합니다(7행도 동일).
- **P3 nit** — [handoff-hook-churn.test.mjs:237](</Users/hsonpro/Library/Mobile Documents/iCloud~md~obsidian/Documents/para_vault/10_Projects/Harness/harness-aijient-team-plugin/tests/handoff-hook-churn.test.mjs:237>): 테스트 주석도 조건 2를 “SHA가 이력에 없음”으로 잘못 설명합니다.

지정하신 [소스 주석](</Users/hsonpro/Library/Mobile Documents/iCloud~md~obsidian/Documents/para_vault/10_Projects/Harness/harness-aijient-team-plugin/src/commands/task.mjs:869>), [command 문서](</Users/hsonpro/Library/Mobile Documents/iCloud~md~obsidian/Documents/para_vault/10_Projects/Harness/harness-aijient-team-plugin/commands/harness-task.md:117>), 구현은 서로 일치합니다. 구현은 `commit (amend)` 확인 후 `HEAD@{1}`이 저장된 short SHA로 시작하는 경우에만 교체합니다.

P1은 없습니다. `node --check`, 순수 함수 분기 검사, `git diff --check`는 통과했습니다.

**Final verdict: Changes requested — runtime P1/P2는 없지만, active plan의 P2 문서 불일치를 수정해야 승인 가능합니다.**
```

<!-- harness:review kind=codex scope=worktree tip=66affa8a12be56d5aa4b7bf2f9d8f17dd330538c at=2026-09-11T16:18:43.467Z -->


**판별 (2026-09-12, 2·3차).** 2차 P2와 3차 P2·P3 모두 **문서/주석이 폐기된 조건을 설명하던 것**이었고 전부 고쳤다 —
`commands/harness-task.md`, `amendCutPoint` 위 주석, plan.md 목표·단계 줄, 테스트 주석. 3차에서 구현·주석·커맨드 문서가
서로 일치함을 리뷰어가 확인했고 runtime P1/P2는 없다.

**같은 실수가 네 군데에서 나왔다.** 조건을 한 번 바꿨는데 그 조건을 설명하는 자리는 여섯이었다(구현·소스 주석·
커맨드 문서·spec·plan·테스트 주석). 설계를 뒤집을 때는 **그 설계를 말하는 자리 전체**를 먼저 세어야 한다.

## Learnings

- **기각한 휴리스틱은 이름을 붙여 두지 않으면 변형으로 돌아온다.** 0.38.1에서 "ancestor 기반 판정은 브랜치
  전환과 구분 못 한다"고 followups 9번에 적어 두고도, 구현에서 같은 판정을 조건 2로 다시 썼다. 기각 이유는
  구현 **직전에** 다시 읽어야 한다.
- **정확한 판별자가 있으면 휴리스틱을 협상하지 않는다.** `HEAD@{1}`은 amend가 밀어낸 커밋을 정확히 준다 —
  동일성 대조로 바꾸자 P1과 P2 두 건이 **함께** 사라졌다(exec 오류 혼동, 같은 OID amend).
- **조건을 바꾸면 그 조건을 말하는 자리를 전부 센다.** 이번엔 여섯 곳이었고 리뷰 두 번에 걸쳐 네 곳을 뒤늦게 고쳤다.

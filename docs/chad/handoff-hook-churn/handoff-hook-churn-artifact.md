# handoff-hook-churn — Artifact

*최종 결과물과 학습 내용을 기록한다.*

## 결과

post-commit 훅(`runHandoffAuto`)이 **핸드오프 파일만** 바꾼 커밋에서 침묵하게 했다. churn 루프가
"실제 작업 커밋 → sweep 커밋 한 번"에서 끝난다.

- `handoffRelPaths(user, task)`를 `task.mjs`에서 export하고, `collectDoneIssues`의 인라인 Set을 대체했다 —
  훅이 **쓰는** 집합과 가드가 **무시하는** 집합이 같은 함수에서 나온다(복제하면 churn이 조용히 되살아난다).
- `commitTouchesOnlyHandoff(targetDir, handoffRels)`: 부모 2개 이상(병합)이면 판정하지 않고,
  `diff-tree --no-commit-id --name-only -r HEAD`의 경로가 **하나 이상이고 전부** 핸드오프일 때만 건너뛴다.
- `POST_COMMIT_HOOK` 스크립트 텍스트는 불변 — 수정이 `runHandoffAuto` 안이라 기존 설치는
  플러그인 갱신만으로 고쳐진다(`init`·`migrate` 불필요).

### 왜 "경로가 비었다"로 판정하면 안 되는가 (실측)

```
merge commit:  diff-tree --name-only → (빈 출력)   rev-list --parents -n1 → 3 워드
empty commit:  diff-tree --name-only → (빈 출력)
```
`paths.every(...)`는 빈 배열에서 **참**이다. 그대로 두면 병합 커밋이 기록에서 조용히 사라진다.
그래서 부모 수를 먼저 보고, 빈 목록은 종전대로 기록한다.

### 검증

- 신규 테스트 6건(`tests/handoff-hook-churn.test.mjs`): sweep 커밋 침묵(+ `git status` clean) ·
  작업 커밋 기록 · 병합 기록(경로 빈 출력 전제 포함) · 빈 커밋 기록 · 비-git 기록 · 경로 집합 공유.
- `npm run test` 789 tests green.
- 훅 스크립트는 전역 `harness-team`(마켓플레이스 clone = 릴리스된 코드)을 부르므로 **커밋해서 관찰하지 않았다** —
  `runHandoffAuto`를 직접 호출하는 방식으로 검증했다. 실제 훅 경로는 0.38.1 발행 후 clone이 갱신되면 적용된다.

### 범위 밖 (후속 후보)

`git commit --amend`는 훅을 다시 돌려 같은 논리 커밋에 두 번째 항목을 남기고 첫 항목의 sha는 사라진다
(0.38.0에서 `f528422`가 그랬다). 정확한 판별자는 reflog(`commit (amend):` vs `commit:`)다.
ancestor + 같은 부모 휴리스틱은 브랜치 전환과 구분하지 못해 **진짜 항목을 지울 수 있으므로 쓰지 않는다.**

## Reviews
*Codex 등 리뷰 실행 시 결과(요약·발견·조치)를 날짜와 함께 남긴다. 남기지 않은 리뷰는 "안 한 것"으로 간주.*

### 2026-09-11T11:58:00.828Z — codex (harness-team review)

- engine: codex · scope: worktree · tip: 257d0a2bc808937b7b10c75ff4df2a8a0ea9a633 · exit 0 · 3113 B

```text
전하, P1은 없지만 P2 결함 때문에 수정 후 재리뷰가 필요합니다.

## Findings

- **P2** [src/commands/task.mjs:842](</Users/hsonpro/Library/Mobile Documents/iCloud~md~obsidian/Documents/para_vault/10_Projects/Harness/harness-aijient-team-plugin/src/commands/task.mjs:842>) — `--ignore-submodules=none`이 없어 `ignore=all`로 설정된 submodule pointer 변경과 handoff 변경이 함께 커밋되면 submodule이 숨겨져 실제 작업 커밋을 sweep으로 오인할 수 있습니다. [Git documentation](https://git-scm.com/docs/git-diff-tree)

- **P2** [src/commands/task.mjs:672](</Users/hsonpro/Library/Mobile Documents/iCloud~md~obsidian/Documents/para_vault/10_Projects/Harness/harness-aijient-team-plugin/src/commands/task.mjs:672>) — `parsePorcelainPaths()`가 rename의 source를 버리므로 `src/real.md -> docs/u/u-handoff.md` 같은 staged rename은 destination만 제외되어 done guard가 실제 삭제를 놓칩니다.

- **P2** [tests/handoff-hook-churn.test.mjs:75](</Users/hsonpro/Library/Mobile Documents/iCloud~md~obsidian/Documents/para_vault/10_Projects/Harness/harness-aijient-team-plugin/tests/handoff-hook-churn.test.mjs:75>) — “소스+handoff” 테스트가 handoff를 baseline과 동일한 내용으로 써서 실제 커밋에는 소스만 포함되므로, `paths.some(handoff)`처럼 실작업을 건너뛰는 잘못된 구현도 통과합니다.

- **P2** [src/commands/task.mjs:843](</Users/hsonpro/Library/Mobile Documents/iCloud~md~obsidian/Documents/para_vault/10_Projects/Harness/harness-aijient-team-plugin/src/commands/task.mjs:843>) — newline parsing은 `core.quotepath=false`에서도 항상 escape되는 `"`·`\`를 처리하지 못해 해당 문자가 포함된 member 경로에서는 handoff-only commit의 churn이 계속됩니다; `-z`가 필요합니다. [Git documentation](https://git-scm.com/docs/git-config/2.25.2.html)

- **P2** [src/commands/task.mjs:667](</Users/hsonpro/Library/Mobile Documents/iCloud~md~obsidian/Documents/para_vault/10_Projects/Harness/harness-aijient-team-plugin/src/commands/task.mjs:667>) — done guard는 기본 quoted porcelain을 사용하고 parser는 octal escape를 decode하지 않아, 일반 Unicode member 이름의 hook 출력조차 shared Set과 일치하지 않습니다.

- **P3** [tests/handoff-hook-churn.test.mjs:129](</Users/hsonpro/Library/Mobile Documents/iCloud~md~obsidian/Documents/para_vault/10_Projects/Harness/harness-aijient-team-plugin/tests/handoff-hook-churn.test.mjs:129>) — helper의 리터럴 값만 검사하므로 hook 또는 done guard가 helper 사용을 중단해도 통과하여 “shared invariant” 회귀 테스트로는 변별력이 없습니다.

Merge/empty commit 처리는 안전하며, 일반 rename과 partial staging도 submodule 예외를 제외하면 실제 작업 커밋을 숨기지 않습니다. `git diff --check`와 구문 검사는 통과했습니다. Runtime 테스트는 read-only sandbox가 `mkdtemp`를 `EPERM`으로 차단해 독립 재실행하지 못했습니다.

**Verdict: Changes requested — P2 수정 후 재리뷰 권장.**
```

<!-- harness:review kind=codex scope=worktree tip=257d0a2bc808937b7b10c75ff4df2a8a0ea9a633 at=2026-09-11T11:58:00.828Z -->


**판별 (2026-09-11, 1차).** P1 없음. P2 5건·P3 1건 중 **4건을 진짜 결함으로 판별해 수정**했고 2건은 오탐이다.

- **P2 rename 원본 유실 (진짜, 수정함)** — `parsePorcelainPaths`가 `R old -> new`에서 목적지만 남겨,
  `src/real.md -> docs/<u>/<u>-handoff.md` 같은 staged rename이 done 가드의 handoff 제외에 통째로 삼켜졌다.
  원본의 **삭제**가 실제 작업인데 가드가 못 본다. 양쪽 경로를 모두 반환하도록 고치고 pin과 전용 테스트를 추가했다.
  (내 변경이 만든 결함은 아니지만 같은 제외 집합을 공유하게 되면서 드러났다.)
- **P2 테스트 변별력 (진짜, 수정함)** — "소스+handoff" 테스트가 핸드오프를 baseline과 **같은 내용**으로 써서
  커밋에는 소스만 들어갔다. `paths.some(handoff) → skip` 같은 잘못된 구현도 통과한다. 핸드오프를 실제로
  바꾸고, 커밋이 두 경로를 담았다는 **전제 자체를 단언**하도록 고쳤다.
- **P2 `-z` 파싱 (부분 진짜, 수정함)** — 핸드오프 경로는 user·task 이름이 `[\w.-]`로 제한(`runTask` 검증 +
  `member.sanitize`)돼 따옴표가 붙을 수 없다. 다만 같은 커밋의 **다른** 경로는 인용될 수 있고 줄 단위 파싱은
  거기서 틀린다(안전한 방향으로 틀려 churn이 남을 뿐이지만). `-z`로 바꿔 그 부류를 없앴다.
- **P3 공유 불변식 테스트 (진짜, 수정함)** — 리터럴 값만 검사하면 한쪽이 리터럴로 되돌아가도 통과한다.
  호출처 수를 소스에서 세는 pin을 더했다(정의 1 + 훅 1 + 가드 1).
- **P2 submodule `--ignore-submodules=none` (오탐)** — 실측으로 재현되지 않았다. 실제 submodule 레포에서
  `diff.ignoreSubmodules=all`을 걸고 `diff-tree --name-only`를 돌려도 submodule 경로가 **그대로 출력된다**
  (`default: [handoff.md sub]` = `ignoreSubmodules=all: [handoff.md sub]`). 그 설정은 `diff`/`status`에
  걸리고 `diff-tree`의 이 경로에는 걸리지 않는다. 아무것도 바꾸지 않는 플래그를 방어적으로 붙이지 않았다.
- **P2 done 가드의 octal escape (오탐)** — 근거가 "일반 Unicode member 이름"인데, member는
  `sanitize()`가 `[^\w.-]`를 **제거**하므로 `docs/<user>` 경로에 non-ASCII가 남지 않는다. 설령 인용된 경로가
  와도 제외 집합과 불일치 → 실제 dirty로 계산되어 가드가 **막는 쪽**으로 틀린다(fail-safe).

### 2026-09-11T12:06:11.373Z — codex (harness-team review)

- engine: codex · scope: worktree · tip: 257d0a2bc808937b7b10c75ff4df2a8a0ea9a633 · exit 0 · 2422 B

```text
전하, P1은 없지만 P2 두 건이 남아 있습니다.

## Findings

- **P2** [src/commands/task.mjs:851](/Users/hsonpro/Library/Mobile%20Documents/iCloud~md~obsidian/Documents/para_vault/10_Projects/Harness/harness-aijient-team-plugin/src/commands/task.mjs:851) — `--ignore-submodules=none`이 없어 `submodule.<name>.ignore=all`인 gitlink 변경이 handoff와 함께 커밋되면 실제 변경을 숨기고 sweep으로 오인할 수 있습니다. 1차 반박의 `diff.ignoreSubmodules=all` 실험은 다른 설정입니다. [Git diff-tree](https://git-scm.com/docs/git-diff-tree), [Gitmodules](https://git-scm.com/docs/gitmodules)

- **P2** [src/commands/task.mjs:371](/Users/hsonpro/Library/Mobile%20Documents/iCloud~md~obsidian/Documents/para_vault/10_Projects/Harness/harness-aijient-team-plugin/src/commands/task.mjs:371) — 바깥 따옴표만 제거하고 C-style octal escape를 복원하지 않아, sanitize되지 않은 Unicode `config.user`의 handoff 경로가 done guard에서 실제 dirty로 오인됩니다. [user-config.mjs:44](/Users/hsonpro/Library/Mobile%20Documents/iCloud~md~obsidian/Documents/para_vault/10_Projects/Harness/harness-aijient-team-plugin/src/user-config.mjs:44), [Git core.quotePath](https://git-scm.com/docs/git-config/2.51.1.html)

- **P3** [src/commands/task.mjs:367](/Users/hsonpro/Library/Mobile%20Documents/iCloud~md~obsidian/Documents/para_vault/10_Projects/Harness/harness-aijient-team-plugin/src/commands/task.mjs:367) — 주석이 아직 rename의 목적지만 반환하고 `core.quotepath`를 완전히 unquote한다고 설명해 실제 동작과 다릅니다.

요청하신 검증점은 다음과 같습니다.

- 일반 rename은 source와 destination을 모두 반환하며, handoff destination 때문에 원본 삭제가 삼켜지지 않습니다.
- `diff-tree -z`의 NUL 분리는 정확합니다. 실제 이력의 rename에서도 양쪽 경로가 별도 항목으로 확인됐습니다.
- source+handoff 테스트는 두 경로가 실제 commit에 포함됐음을 단언하므로 “handoff가 하나라도 있으면 skip” 구현을 검출합니다.
- 구문 검사와 `git diff --check`, 순수 parser 테스트 2건은 통과했습니다.
- 임시 저장소 기반 신규 테스트 5건은 read-only sandbox의 `mkdtemp EPERM` 때문에 독립 실행하지 못했습니다.

**Verdict: Changes requested — P2 수정 후 재리뷰가 필요합니다.**
```

<!-- harness:review kind=codex scope=worktree tip=257d0a2bc808937b7b10c75ff4df2a8a0ea9a633 at=2026-09-11T12:06:11.373Z -->


**판별 (2026-09-11, 2차).** 1차에서 내가 오탐으로 판정한 두 건을 리뷰어가 **정확히 반박했고, 둘 다 진짜였다.**

- **P2 submodule (진짜 — 내 1차 판별이 틀렸다, 수정함)** — 내 반박 실험은 `diff.ignoreSubmodules=all`을 썼는데
  실제 벡터는 `submodule.<name>.ignore=all`이다. 다시 재현하니 gitlink 변경이 **실제로 사라졌다**:
  `names: [handoff.md]` (플래그 추가 시 `[handoff.md sub]`). 즉 submodule을 bump한 진짜 작업 커밋이
  sweep으로 오인돼 기록이 통째로 누락된다. `--ignore-submodules=none`을 붙이고, **수정을 빼면 실패하는**
  회귀 테스트를 붙였다(확인: 플래그 제거 시 `fail 1`).
- **P2 octal escape (진짜 — 내 1차 판별이 틀렸다, 수정함)** — 내 반박은 "member는 `sanitize()`가 거른다"였지만,
  `.harness/config.json`의 `config.user`는 `user-config.mjs`의 자유 입력(`ask()`)에서 와 **sanitize를 거치지 않는다.**
  비-ASCII user면 기본 porcelain이 경로를 octal로 인용(`"docs/\355\225\234…"`)하고, 파서는 바깥 따옴표만
  벗기므로 제외 집합과 영영 불일치한다 → 훅이 쓴 handoff가 "실제 dirty"로 계산돼 **종결이 영구히 막힌다.**
  가드 호출을 `--porcelain -z`로 바꾸고 파서를 NUL 형식(`XY path`, rename은 다음 필드가 원본)으로 다시 썼다.
- **P3 주석 불일치 (진짜, 수정함)** — 파서 주석을 실제 동작(-z·rename 양쪽 반환)으로 다시 썼다.

**교훈은 판별 절차 쪽이다.** 두 오탐 판정 모두 "내가 세운 불변식"(설정 이름 · sanitize 경로)에 기대어
반증 실험을 **그 불변식 안에서만** 돌렸다. 리뷰어가 준 것은 불변식 밖의 입력 경로였고, 그 경로로 재현하니
둘 다 재현됐다. 반박할 때는 상대가 지목한 **정확한 설정·정확한 코드 경로**로 실험해야 한다.

### 2026-09-11T12:13:00.809Z — codex (harness-team review)

- engine: codex · scope: worktree · tip: 257d0a2bc808937b7b10c75ff4df2a8a0ea9a633 · exit 0 · 1566 B

```text
전하, 남은 P1/P2는 없습니다. Pass 2의 두 결함 모두 수정됐습니다.

Findings

- **P3** [src/commands/task.mjs:367](/Users/hsonpro/Library/Mobile%20Documents/iCloud~md~obsidian/Documents/para_vault/10_Projects/Harness/harness-aijient-team-plugin/src/commands/task.mjs:367) — 함수 머리말이 여전히 newline/rename-arrow parser를 설명해 현재 NUL parser 동작과 어긋납니다.
- **P3** [handoff-hook-churn-spec.md:29](/Users/hsonpro/Library/Mobile%20Documents/iCloud~md~obsidian/Documents/para_vault/10_Projects/Harness/harness-aijient-team-plugin/docs/chad/handoff-hook-churn/handoff-hook-churn-spec.md:29) — SSOT 설계 명령에 이번 핵심 수정인 `-z`와 `--ignore-submodules=none`이 반영되지 않았습니다.
- **P3** [tests/handoff-hook-churn.test.mjs:172](/Users/hsonpro/Library/Mobile%20Documents/iCloud~md~obsidian/Documents/para_vault/10_Projects/Harness/harness-aijient-team-plugin/tests/handoff-hook-churn.test.mjs:172) — fixture 실패를 “건너뜀”이라고 진단하지만 `t.skip()` 없이 반환해 테스트 결과에는 pass로 기록됩니다.

검증:

- `diff-tree`에 `--ignore-submodules=none` 확인.
- done guard의 `--porcelain -z` 및 rename/copy 양쪽 경로 반환 확인.
- parser 테스트 2/2 통과.
- 변경 JavaScript 구문 검사와 `git diff --check` 통과.
- 임시 저장소 기반 테스트는 read-only sandbox의 `mkdtemp EPERM` 때문에 독립 실행하지 못했습니다.

**Final verdict: Approve — 유의미한 P1/P2 없음. P3 정리만 권장합니다.**
```

<!-- harness:review kind=codex scope=worktree tip=257d0a2bc808937b7b10c75ff4df2a8a0ea9a633 at=2026-09-11T12:13:00.809Z -->


**판별 (2026-09-11, 3차 — APPROVE).** 2차의 P2 두 건 수정을 리뷰어가 코드에서 확인했다. 남은 P3 3건 모두 진짜라 고쳤다:
파서 위 영문 머리말이 옛 동작(개행·rename 화살표)을 설명하던 것, spec 설계 절에 `-z`·`--ignore-submodules=none`이
빠져 SSOT가 구현과 어긋나던 것, submodule 테스트가 픽스처 실패를 `t.skip()` 없이 반환해 **pass로 기록**되던 것.

## Learnings

- **반박 실험은 상대가 지목한 정확한 설정으로 돌려야 한다.** `diff.ignoreSubmodules`와 `submodule.<name>.ignore`는
  이름이 비슷하지만 다른 스위치이고, 후자에서만 gitlink가 숨는다. "재현 안 됨"을 근거로 오탐 판정했다가 2차에서 뒤집혔다.
- **"입력은 sanitize된다"는 불변식은 경로가 하나일 때만 참이다.** member는 `sanitize()`를 거치지만
  `.harness/config.json`의 `config.user`는 자유 입력으로 들어온다. 불변식을 근거로 방어를 생략하기 전에
  **그 값이 들어오는 모든 경로**를 세어야 한다.
- **테스트가 자기 실패를 삼키지 않게 할 것.** 픽스처 setup과 단언을 같은 `try`에 두면 단언 실패가
  "환경 문제로 건너뜀"으로 둔갑해 초록이 된다. setup 실패는 `t.skip()`, 단언은 catch 밖.
- **수정을 빼면 실패하는지 확인한다.** submodule 회귀 테스트는 플래그를 제거해 `fail 1`을 확인한 뒤에야
  변별력이 있다고 말할 수 있었다.

- **실제 훅 경로로 확인했다.** clone을 0.38.1로 갱신한 뒤 sweep 커밋(`6695627`)을 만들자 훅이 침묵하고
  `git status --porcelain`이 **빈 출력**이었다 — 단위 테스트가 아니라 실제 post-commit 경로에서 루프가 끝났다.

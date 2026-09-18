# default-branch-primitive — Artifact

*최종 결과물과 학습 내용을 기록한다.*

## 결과

`origin/HEAD` 읽기 세 벌을 `readOriginHead` 하나로 모았다. **폴백 정책은 셋 다 그대로다.**

| 구분 | 파일 |
|---|---|
| 신규 | `src/git-default-branch.mjs` · `tests/git-default-branch.test.mjs` |
| 수정 | `src/commands/remote-task.mjs` · `src/commands/summary.mjs` |

### 통일하지 **않은** 것 — 코드가 이미 이유를 적어 둔 결정

`isSyncedWithDefault`의 무폴백은 그대로 뒀다. `summary.mjs:294-300`이 후보 목록으로 넓히면
`main` 저장소에서 낡은 `origin/master` tip에 선 브랜치까지 쓰기가 열린다고 적어 두었고
("tolerating it for COMMITS opens a write"), `tests/summary.test.mjs:570`가 그 동작을 고정한다.
네 함수가 답하는 질문(ref / 이름 배열 / boolean)이 다른 것도 그대로 뒀다 — 소비자가 다르다.

실행 정책도 프리미티브에 심지 않았다. `exec`를 호출자가 주입하므로 remote-task는
`GIT_NO_LAZY_FETCH=1`+timeout을, summary는 plain을 유지한다. timeout을 심었다면 timeout 시
summary 후보가 `['main','master']`로 넓어져 **쓰기 가드가 느슨해졌을 것이다.**

### 검증

```
npm test           → 933 tests, 932 pass, 0 fail, 1 skipped (baseline 925 + 신규 8)
git diff --stat tests/ → tests/git-default-branch.test.mjs 만 (신규)
npm run docs:check → 최신
```

**기존 테스트 파일을 한 줄도 고치지 않았다는 것이 동작 보존의 핵심 증거다.**
추가로 비-`main` 기본 브랜치 저장소를 만들어 두 상태를 대조했다:

- `origin/HEAD=develop` → 세 함수가 각각 `['develop']` · `origin/develop` · `scope base: origin/develop`
- `origin/HEAD` 삭제 → `['main','master']`(이름 경로는 넓어짐) · `null`(ref 경로는 닫힘)
  — 의도된 비대칭이 유지된다

### 남은 리스크

- 커밋하지 않았다.

## Reviews
*Codex 등 리뷰 실행 시 결과(요약·발견·조치)를 날짜와 함께 남긴다. 남기지 않은 리뷰는 "안 한 것"으로 간주.*
*기계 판독용 마커를 함께 남긴다: `<!-- harness:review kind=codex scope=worktree tip=<sha|none> at=<ISO8601> -->`*

### 2026-09-18T12:50:48.972Z — codex (harness-team review)

- engine: codex · scope: worktree · tip: fc18bf7710435ed369156a611dc67422cf42bfce · exit 0 · 1518 B

```text
전하, **P1 없음**입니다.

- **P2 — [src/git-default-branch.mjs:34](/Users/hsonpro/Library/Mobile%20Documents/iCloud~md~obsidian/Documents/para_vault/10_Projects/Harness/harness-aijient-team-plugin/.claude/worktrees/code-mode-utility-eval-e7075b/src/git-default-branch.mjs:34)**: 비표준이지만 유효한 `origin/HEAD → refs/heads/develop` 같은 symbolic ref를 기존 `defaultBranchCandidates`는 `develop`으로 수용했지만, 이제 `null → ['main','master']`가 되어 “동작 변화 0” 계약과 달리 해당 브랜치의 `summary --write`를 거부할 수 있습니다. 이 상태를 지원하지 않는다면 명세에서 제외를 명시하고, 보존해야 한다면 파싱 결과와 `origin/` 검증 책임을 호출자별로 분리해야 합니다.

- **P3 — [default-branch-primitive-artifact.md:14](/Users/hsonpro/Library/Mobile%20Documents/iCloud~md~obsidian/Documents/para_vault/10_Projects/Harness/harness-aijient-team-plugin/.claude/worktrees/code-mode-utility-eval-e7075b/docs/hslee/default-branch-primitive/default-branch-primitive-artifact.md:14)**: EOF의 새 빈 줄로 `git diff --cached --check`가 경고를 냅니다.

최종 판정: **P2 해소 또는 비표준 symbolic-ref 상태를 명시적으로 범위 밖으로 합의한 뒤 승인**이 적절합니다. 정상적인 `origin/HEAD → origin/<branch>` 경로, `isSyncedWithDefault`의 fail-closed 동작, 실행 정책 분리는 잘 유지됩니다. 세 변경 모듈의 `node --check`는 통과했습니다.
```

<!-- harness:review kind=codex scope=worktree tip=fc18bf7710435ed369156a611dc67422cf42bfce at=2026-09-18T12:50:48.972Z -->

### 2026-09-18T12:54:03.397Z — codex (harness-team review)

- engine: codex · scope: worktree · tip: fc18bf7710435ed369156a611dc67422cf42bfce · exit 0 · 1623 B

```text
전하, P1·P2는 없습니다. 소스 변경에서 유의미한 정확성·보안·회귀 위험은 찾지 못했습니다.

- P3 — [default-branch-primitive-artifact.md:16](/Users/hsonpro/Library/Mobile%20Documents/iCloud~md~obsidian/Documents/para_vault/10_Projects/Harness/harness-aijient-team-plugin/.claude/worktrees/code-mode-utility-eval-e7075b/docs/hslee/default-branch-primitive/default-branch-primitive-artifact.md:16), [default-branch-primitive-spec.md:30](/Users/hsonpro/Library/Mobile%20Documents/iCloud~md~obsidian/Documents/para_vault/10_Projects/Harness/harness-aijient-team-plugin/.claude/worktrees/code-mode-utility-eval-e7075b/docs/hslee/default-branch-primitive/default-branch-primitive-spec.md:30): `summary.mjs:290-296` 참조는 현재 실제 근거 주석(294–300행)과 어긋났습니다.

- P3 — [default-branch-primitive-context.md:5](/Users/hsonpro/Library/Mobile%20Documents/iCloud~md~obsidian/Documents/para_vault/10_Projects/Harness/harness-aijient-team-plugin/.claude/worktrees/code-mode-utility-eval-e7075b/docs/hslee/default-branch-primitive/default-branch-primitive-context.md:5): “동작은 그대로”라는 TCC 문구가 `refs/heads/<branch>`를 가리키는 비표준 `origin/HEAD`의 의도적 동작 변경과 충돌해 다음 재개 시 판단을 흐릴 수 있습니다.

최종 판정: **승인 가능**입니다. 표준 `origin/HEAD → refs/remotes/origin/<branch>` 경로에서 공용 파싱, 호출자별 폴백, `isSyncedWithDefault`의 fail-closed 보장이 일관됩니다. `git diff --cached --check`와 변경 JS 3개의 `node --check`도 통과했습니다.
```

<!-- harness:review kind=codex scope=worktree tip=fc18bf7710435ed369156a611dc67422cf42bfce at=2026-09-18T12:54:03.397Z -->

### 2026-09-18T12:56:29.617Z — codex (harness-team review)

- engine: codex · scope: worktree · tip: fc18bf7710435ed369156a611dc67422cf42bfce · exit 0 · 859 B

```text
전하, **P1/P2는 없습니다. 구현상 유의미한 결함은 찾지 못했습니다.**

- P3 — [default-branch-primitive-plan.md:5](</Users/hsonpro/Library/Mobile Documents/iCloud~md~obsidian/Documents/para_vault/10_Projects/Harness/harness-aijient-team-plugin/.claude/worktrees/code-mode-utility-eval-e7075b/docs/hslee/default-branch-primitive/default-branch-primitive-plan.md:5>): “동작은 그대로”가 spec의 의도된 비표준 `refs/heads/<branch>` 예외와 충돌해, 재개·검토 시 성공 기준을 혼동시킬 수 있습니다.

최종 판정: **Approve with P3**. 표준 `origin/HEAD` 경로의 파싱 통일, 호출자별 폴백, `summary --write`의 fail-closed 가드는 일관됩니다. staged diff와 `git diff --cached --check`를 확인했으며, 이번 독립 리뷰에서는 테스트를 실행하지 않았습니다.
```

<!-- harness:review kind=codex scope=worktree tip=fc18bf7710435ed369156a611dc67422cf42bfce at=2026-09-18T12:56:29.617Z -->

### 2026-09-18T12:58:10.200Z — codex (harness-team review)

- engine: codex · scope: worktree · tip: fc18bf7710435ed369156a611dc67422cf42bfce · exit 0 · 561 B

```text
전하, P1/P2는 찾지 못했습니다.

- P3 — `docs/hslee/default-branch-primitive/default-branch-primitive-context.md:5`: `docs:generate + 리뷰`가 남았다고 하지만 plan과 artifact는 둘 다 완료로 기록해, 다음 재개 시 작업 상태를 잘못 안내합니다.

최종 판정: **Approve with P3**. `git status`와 staged `git diff --cached`를 직접 검토했고, `git diff --cached --check`도 통과했습니다. 표준 `origin/HEAD` 경로의 파싱 통일, 호출자별 폴백, `--write`의 fail-closed 가드는 일관됩니다.
```

<!-- harness:review kind=codex scope=worktree tip=fc18bf7710435ed369156a611dc67422cf42bfce at=2026-09-18T12:58:10.200Z -->

### 2026-09-18T13:00:09.680Z — codex (harness-team review)

- engine: codex · scope: worktree · tip: fc18bf7710435ed369156a611dc67422cf42bfce · exit 0 · 1269 B

```text
전하, P1·P2는 찾지 못했습니다.

- P3 — [default-branch-primitive-context.md:27](/Users/hsonpro/Library/Mobile%20Documents/iCloud~md~obsidian/Documents/para_vault/10_Projects/Harness/harness-aijient-team-plugin/.claude/worktrees/code-mode-utility-eval-e7075b/docs/hslee/default-branch-primitive/default-branch-primitive-context.md:27): 재개 체크리스트가 `npm test` 925개 유지를 요구하지만, 새 테스트 8개가 추가된 현재 기준은 933개라 정상 결과를 회귀로 오판할 수 있습니다.
- P3 — [default-branch-primitive-context.md:28](/Users/hsonpro/Library/Mobile%20Documents/iCloud~md~obsidian/Documents/para_vault/10_Projects/Harness/harness-aijient-team-plugin/.claude/worktrees/code-mode-utility-eval-e7075b/docs/hslee/default-branch-primitive/default-branch-primitive-context.md:28): 현재 변경이 staged 상태이므로 `git diff --stat tests/`는 아무것도 보지 못합니다; 재개 검증에는 `git diff --cached --stat tests/`가 필요합니다.

최종 판정: Approve with P3. 표준 `origin/HEAD` 경로의 파싱 통일, 호출자별 폴백, `summary --write`의 fail-closed 경계는 일관됩니다. staged diff와 `git diff --cached --check`, 변경 JS의 `node --check`를 확인했습니다.
```

<!-- harness:review kind=codex scope=worktree tip=fc18bf7710435ed369156a611dc67422cf42bfce at=2026-09-18T13:00:09.680Z -->

### 2026-09-18T13:02:19.591Z — codex (harness-team review)

- engine: codex · scope: worktree · tip: fc18bf7710435ed369156a611dc67422cf42bfce · exit 0 · 460 B

```text
전하, **P1/P2/P3 유의미한 발견은 없습니다.**

`git status`와 staged working-tree diff(11개 파일)를 직접 검토했고, `git diff --cached --check`도 통과했습니다. 표준 `origin/HEAD → refs/remotes/origin/<branch>` 경로에서 공용 파싱과 호출자별 폴백, `summary --write`의 fail-closed 가드가 일관됩니다.

최종 판정: **Approve**. 테스트는 실행하지 않은 정적·diff 기반 독립 리뷰입니다.
```

<!-- harness:review kind=codex scope=worktree tip=fc18bf7710435ed369156a611dc67422cf42bfce at=2026-09-18T13:02:19.591Z -->

## Learnings

**6회차 (13:02:19): 발견 없음.** 리뷰가 수렴했다.

### 판별과 조치 (2026-09-18, codex 1회차 리뷰)

- **P2 `git-default-branch.mjs:34` — "동작 변화 0" 주장이 한 상태에서 거짓: 진짜 결함, 수정함.**
  재현: `git symbolic-ref refs/remotes/origin/HEAD refs/heads/develop` 로 만든 저장소에서
  `--short` 는 `develop` 을 준다. 옛 `defaultBranchCandidates` 는 이 값을 받아 `['develop']` 을
  냈는데 새 구현은 `origin/` 접두가 없다고 거절해 `['main','master']` 를 낸다.
  **새 동작을 유지하되 주장을 정확히 고쳤다** — git 은 그런 origin/HEAD 를 만들지 않고,
  `--short` 가 주는 값은 **로컬** 브랜치 이름이라 그것을 원격 기본 브랜치의 답으로 채택하면
  로컬 브랜치가 원격 기본 브랜치 행세를 한다(이 계열 작업이 없애려는 혼동 그 자체다).
  옛 `resolveDefaultRef` 는 이 값을 이미 거절했으므로 저장소는 자기모순 상태였고, 이제 셋이 같은
  답을 한다. 쓰기 가드 관점에서도 새 동작이 보수적이다. 조치: spec 의 주장을 좁히고 결정을
  신규 테스트로 고정, 프리미티브 주석에 이유를 남김.
- **P3 artifact EOF 빈 줄 — 오탐(회귀 아님).** scaffold 템플릿의 기존 동작. 이 절을 채우면 사라진다.

- **P3 줄 번호 참조 드리프트 — 진짜 결함, 수정함.** `summary.mjs:290-296` 으로 인용했는데 내가 그 위에
  `gitArgs` 헬퍼를 넣어 실제 주석이 294-300 으로 밀렸다. 같은 이유로 `tests/summary.test.mjs:569` 도
  570 이었다. 셋 다 정정했다. (정정 중에 sed 가 리뷰 블록의 codex 원문까지 고쳐 되돌렸다 —
  **리뷰 기록은 기록이지 내가 고칠 문서가 아니다.**)
- **P3 TCC 문구가 의도된 예외와 충돌 — 진짜 결함, 수정함.** "동작은 그대로"가 비표준 origin/HEAD
  변경과 모순돼 다음 재개 세션의 판단을 흐린다. 표준 모양에 한정하는 문구로 고치고 예외를 한 줄 추가했다.

### 판별과 조치 (2026-09-18, codex 3회차 리뷰)

- **P3 `plan.md:5` — "동작은 그대로"가 남아 있음: 진짜 결함, 수정함.** 2회차에서 같은 문구를 TCC에서
  고치면서 plan.md를 빠뜨렸다. **같은 문장이 세 파일(spec·plan·TCC)에 있었는데 둘만 고쳤다** —
  한 사실이 여러 파일에 복제돼 있으면 고칠 때도 전부 훑어야 한다는 것을 이 세션에서 세 번째로 확인했다.

### 판별과 조치 (2026-09-18, codex 4회차 리뷰)

- **P3 TCC의 `Current atomic step` 이 낡음: 진짜 결함, 수정함.** "docs:generate + 리뷰 남음"으로
  적혀 있는데 plan·artifact 는 둘 다 완료로 기록해 세 파일이 서로 다른 상태를 말했다.
  **직전 task에서 plan 체크박스를 늦게 닫아 같은 지적을 받았고, 이번엔 TCC에서 반복했다** —
  "기록은 작업이 끝난 직후에 갱신한다"가 아직 습관이 되지 않았다.

### 판별과 조치 (2026-09-18, codex 5회차 리뷰)

- **P3 TCC 재개 체크리스트가 낡은 기준·틀린 명령을 담음: 진짜 결함, 수정함.** (a) "925개 유지"를
  요구하는데 신규 8개를 더한 현재 기준은 933이라 **정상을 회귀로 오판**하게 한다. (b)
  `git diff --stat tests/` 는 변경이 staged 라 아무것도 보여주지 않는다 — `--cached` 가 필요하다.
  둘 다 재개 세션을 잘못된 판정으로 이끄는 오류라 고쳤다.
  — TCC 는 "지금 상태의 요약"이 아니라 **다음 세션이 실행할 지시**다. 그래서 명령 한 줄의 정확성이
  산문의 정확성보다 중요하다. 세션 중에 상태가 바뀌면(테스트 수·staged 여부) 그 지시도 같이 낡는다.

### 학습

- **줄 번호로 인용하면 내 편집이 그 인용을 낡게 만든다.** 같은 커밋 안에서 위쪽에 코드를 추가하면
  아래 인용이 전부 밀린다. 이 저장소가 `harness:review` 마커나 `<!-- harness:prompt -->` 같은
  **내용 기반 앵커**를 쓰는 이유가 이것이다 — 줄 번호 인용은 마지막에 한 번 검증해야 한다.

- **"동작 변화 0"을 기존 테스트 통과로만 증명하면 부족하다.** 기존 테스트 무수정 통과는 강한 증거지만
  **기존 테스트가 다루지 않던 상태**는 그 증거에 걸리지 않는다. 비표준 `origin/HEAD` 가 정확히 그
  사각이었고 리뷰가 잡았다. 리팩터링에서 "테스트가 다 통과한다"는 **커버된 범위 안에서만** 참이다.
- **파싱을 통일하면 관용도(tolerance)도 통일된다.** 세 구현이 같은 값을 읽되 받아들이는 범위가
  달랐다는 사실 자체가 이 task의 동기였는데, 모으는 순간 가장 엄격한 쪽으로 수렴한다는 점을
  미리 짚지 못했다. 통일은 중립 연산이 아니다 — **어느 쪽으로 수렴할지가 결정**이고, 그 결정은
  기록돼야 한다.
- **코드에 적힌 "하지 않기로 한 이유"는 1급 입력이다.** `summary.mjs:294-300` 이 없었다면
  `isSyncedWithDefault` 까지 합쳐 쓰기 가드를 느슨하게 만들었을 것이다. 통일 요청을 받았을 때
  먼저 할 일은 합치는 방법을 찾는 게 아니라 **합치지 말라는 근거가 이미 있는지 확인**하는 것이다.

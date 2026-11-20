# pr-check-fork-main — Spec

## 목적 / 요구사항

**문제.** pre-push `pr-check`는 기본 브랜치 이름(`origin/HEAD`가 가리키는 `main` 등)으로 가는 push를 **원격과 상관없이** 건너뛴다
(`src/commands/pr-check.mjs` `runPrCheck`의 `t.remoteRef === defaultRef` 분기). 의도는 "머지 결과를 기본 브랜치에 올리는 push는 PR이 아니다"였다.
그런데 fork의 `main`에 push한 뒤 거기서 upstream으로 PR을 여는 흐름도 같은 분기에 걸려 문서 검사(D11)와 done 가드(done-derive R7)가 전혀 돌지 않는다.
done-derive 이후로는 "전부 체크된 plan이 머지되는 순간 = 종결"이라 이 구멍은 가드 우회 경로다. (done-derive artifact P2-3)

**원인.** CLI는 push가 **어느 원격**으로 가는지 모른다. git은 pre-push 훅에 `$1`(원격 이름, 이름 없는 push면 URL)·`$2`(URL)를 주지만,
훅 블록(`src/git-hooks.mjs` `PRE_PUSH_BLOCK`)이 그것을 CLI에 넘기지 않는다. stdin에는 ref·sha만 있다. (코드 조사)

**영향받는 사람·시스템.** fork 원격에서 PR을 여는 팀원, 그리고 pre-push 훅을 설치한 모든 저장소(훅 블록 변경).

**기대 결과.** push가 base의 원격(기본 `origin`)이 **아닌 것으로 확인된** 원격으로 가면, 기본 브랜치 이름이어도 피처 브랜치처럼 검사한다.
base의 원격으로 가는 기본 브랜치 push는 종전대로 건너뛴다.

### 요구사항

- **R1 판정 규칙** — 기본 브랜치 이름으로의 push는 다음이 **모두** 참일 때만 검사한다. 하나라도 아니면 종전대로 건너뛴다(보수적).
  1. 훅이 push 원격 정보를 넘겼다(`HARNESS_PUSH_REMOTE`).
  2. base가 원격 추적 ref다(`refs/remotes/<base 원격>/…`). origin 없는 저장소처럼 base가 로컬 브랜치면 판정할 근거가 없다.
  3. push 원격이 설정된 원격 이름으로 풀린다 — `HARNESS_PUSH_REMOTE`가 원격 이름이면 그것, URL이면 그 URL을 fetch·push URL로 가진 원격.
     어떤 원격에도 안 풀리는 URL은 판정 불가로 본다(같은 저장소의 다른 표기 — ssh/https — 일 수 있다).
  4. 풀린 원격이 base 원격과 다르다.
- **R2 전달 방식 = 환경변수** — 훅 블록이 `HARNESS_PUSH_REMOTE="$1" harness-team pr-check --pre-push`로 부른다.
  새 플래그(`--remote`)는 쓰지 않는다 — `unknownFlags`가 모르는 플래그를 exit 1로 거부하므로 새 훅 + 구버전 CLI(팀원 일부·husky 설정 공유)가
  모든 push를 막는다. 위치 인자도 쓰지 않는다 — `pr-check [dir]`이 대상 디렉터리로 읽는다. 환경변수는 구버전 CLI가 무시한다.
- **R3 하위 호환** — 환경변수가 없으면(구버전 훅 블록) 동작은 종전과 같다(R1-1).
- **R4 기존 설치 갱신 (U1)** — `installGitHook`은 live marker가 있으면 손대지 않아 기존 설치에 새 블록이 닿지 않는다. init·sync가 훅 안에서
  **옛 블록 원문과 정확히 일치하는 부분**만 새 블록으로 바꾼다. 손댄 블록은 그대로 두고, doctor가 live marker는 있지만 `HARNESS_PUSH_REMOTE`가 없으면 경고한다.
  (사용자 선택 2026-11-20 "U1 정확일치 교체")
- **R5 네트워크 없음** — 판정은 `git remote`·`git remote get-url --all [--push]`·`rev-parse` 같은 로컬 명령만 쓴다. `ls-remote`·fetch를 하지 않는다.
- **R6 문서** — README `pr-check` 절(검사하지 않는 경우 목록·훅 블록 사본), `commands/harness-ship.md`, `docs/decisions.md` D11 정정 문단,
  `docs/harness-cycle.md`의 해당 서술(있으면), CHANGELOG.

## 범위 (In / Out)

- **In**: `src/commands/pr-check.mjs`(기본 브랜치 push 판정), `src/git-hooks.mjs`(훅 블록·갱신 경로), 테스트(`tests/pr-check.test.mjs`·`tests/git-hooks.test.mjs`),
  R6 문서.
- **Out**: `origin`이 fork이고 `upstream`이 정본인 레이아웃(GitHub `gh repo fork` 기본) — base 사다리가 `origin/HEAD`를 기준으로 하므로 그 레이아웃에서는
  피처 브랜치 검사도 fork의 main을 base로 본다. 고치려면 base 판정(`resolveScope`)부터 바꿔야 하는 별도 결정이다. 이번 변경은 "push 원격 ≠ base 원격"만 다룬다.
  **이 레이아웃에서 달라지는 것**: 메인테이너의 `git push upstream main`(PR 아닌 직접 push)은 upstream ≠ origin이라 이제 검사된다(종전 건너뜀). 우회는 `--no-verify`.
  한계로 문서화한다(사용자 선택 2026-11-20 "한계로 문서화") — `upstream` 이름 휴리스틱은 두지 않는다.
- **Out**: `git push <URL>` 중 설정된 원격으로 안 풀리는 URL, `url.<base>.insteadOf` 재작성 표기 차이 — R1-3대로 건너뛴다(알려진 한계).
- **Out**: CI 경로 — CI는 push 원격 개념이 없고 종전대로 HEAD를 본다.

## 원천 검토 (R1)

### 원천
- 없음 — 원천 문서(PRD 등) 없는 내부 도구 결함. 근거는 `docs/chad/done-derive/done-derive-artifact.md` P2-3과 D11.

### 발견
- 검토 완료: 2026-11-20

## 설계 / 접근

### 선택지

| 후보 | 방식 | 장점 | 단점 | 판정 |
|---|---|---|---|---|
| **1. push 원격 ≠ base 원격이면 검사** (결정 2026-11-20) | 훅이 `$1`을 넘기고 CLI가 원격 이름/URL을 base 원격과 비교 | 로컬 정보만으로 정확히 구분. 정본 원격으로의 직접 push는 그대로 건너뜀 | 훅 계약이 바뀐다(기존 설치 갱신 필요). origin=fork 레이아웃은 못 고침 | **권장** |
| 2. push 원격의 기본 브랜치를 판정 | `refs/remotes/<원격>/HEAD`로 원격별 기본 브랜치 확인 | — | fork의 기본 브랜치도 `main`이라 **구분이 안 된다**. 게다가 `<원격>/HEAD`는 `set-head`를 돌린 원격에만 있고 아니면 `ls-remote`(네트워크)가 필요 | 기각 |
| 3. 건너뛰지 말고 note만 | 기본 브랜치 push도 검사하되 실패를 안내로만 | 훅 변경 없음 | 막지 않으니 fork main 흐름의 가드 우회가 그대로다. 막도록 하면 정본 main에 로컬 머지를 push하는 메인테이너에게 문서 검사·가드를 강제 — D11 "강제는 PR 문서뿐"과 11-19 정정 "가드를 옮긴 것이지 늘린 것이 아니다"에 어긋남 | 기각 |

**2차 장치 규칙(D11)** — 새 환경변수 계약을 더하기 전에 원래 장치(기본 브랜치 건너뛰기)를 빼는 안 = 후보 3을 검토했고 위 사유로 기각한다.
빼면 강제가 넓어지고, 줄이려면(note만) 구멍이 남는다.

### 후보 1의 세부

- **판정 위치**: `runPrCheck`의 pre-push 루프. `defaultRef` 비교 앞에 `skipDefault = !(await pushGoesElsewhere(...))`를 한 번 계산한다.
  base 원격은 `fullRefName(base)`의 `refs/remotes/<r>/` 접두에서 얻는다.
- **원격 풀기**: `git remote`로 이름 목록 → 이름이면 그대로, 아니면 각 원격의 `get-url --all`·`get-url --push --all`과 완전 일치하는 원격.
  비교는 문자열 그대로(정규화 없음 — 추측성 정규화가 오판을 만든다).
- **테스트 주입**: `runPrCheck(ctx, { readStdin, pushRemote })` — 기본값은 `process.env.HARNESS_PUSH_REMOTE`.

### 선택지 U — 기존 설치에 새 훅 블록을 어떻게 닿게 하나 (결정: U1, 2026-11-20)

- **U1 (권장)**: `installGitHook`이 훅 안에서 **옛 블록 원문과 정확히 일치하는 부분**을 찾으면 새 블록으로 바꾼다(init·sync). 손댄 블록은 건드리지 않는다.
  doctor는 live marker가 있지만 `HARNESS_PUSH_REMOTE`가 없으면 경고(`run: harness-team sync`). 정확 일치라 오작동 위험이 낮다.
- U2: 갱신 코드 없이 doctor 경고 + README 안내("블록을 지우고 sync")만.
- U3: 새 설치에만 적용. 기존 설치는 종전 동작(R3) — 문서에만 적는다.

## Ontology

- **base 원격**: pr-check base ref(`refs/remotes/<r>/<branch>`)의 `<r>`. 기본은 `origin`. base가 로컬 브랜치면 없음.
- **push 원격**: git이 pre-push 훅 `$1`로 주는 값을 설정된 원격 이름으로 푼 것. 안 풀리면 없음.
- **기본 브랜치 push**: push 대상 ref가 `refs/heads/<base 브랜치 이름>`인 push. base 원격으로 가면 "base 갱신"(건너뜀), 다른 원격으로 가면 PR 원천(검사).
- 게이트 근거: Goal(fork main push 검사)·Constraint(네트워크 없음·하위 호환·D11)·Success(아래 테스트)·Context(pr-check.mjs·git-hooks.mjs) 모두 명시.

## Ambiguity 자가진단

- [x] **Goal 명확도** (40%) — 다른 원격으로 가는 기본 브랜치 push를 검사하고, base 원격으로 가는 것은 건너뛴다.
- [x] **Constraint 명확도** (30%) — 네트워크 없음, 구버전 훅·CLI 조합에서 push를 막지 않음, D11 강제 범위 유지.
- [x] **Success 기준** (30%) — 실제 push 테스트에서 `fork main` 차단 · `origin main` 통과, 단위 테스트(정보 없음·URL·base 로컬), test·docs:check 통과.
- [x] **Context 명확도** (brownfield 한정) — `pr-check.mjs` pre-push 루프, `git-hooks.mjs` 블록·설치기·doctor 검사.
- [x] **Ambiguity ≤ 0.2** — 위 항목 가중합 ≥ 0.8

## Done evidence

```json
{ "version": 1, "tests": "required" }
```

## 참고

- `docs/chad/done-derive/done-derive-artifact.md` P2-3
- `docs/decisions.md` D11 (2026-11-19 정정)
- 테스트: `tests/pr-check.test.mjs` "pre-push 훅 실측", `tests/git-hooks.test.mjs`
- git 문서: githooks(5) pre-push — `$1` 원격 이름(이름 없는 push면 URL), `$2` URL

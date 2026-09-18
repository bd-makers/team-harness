# default-branch-primitive — Spec

## 목적 / 요구사항

**문제.** `origin/HEAD` 를 읽는 코드가 저장소에 세 벌 있고 방법이 제각각이다.

| 위치 | 명령 | 파싱 |
|---|---|---|
| `remote-task.mjs` `resolveDefaultRef` | `symbolic-ref -q refs/remotes/origin/HEAD` | `refs/remotes/` 접두 slice |
| `summary.mjs` `defaultBranchCandidates` | `symbolic-ref --short …` | `origin/` 접두 replace |
| `summary.mjs` `isSyncedWithDefault` | `symbolic-ref --short …` | `origin/` 사용 후 `refs/remotes/` 재조립 |

플래그도 파싱도 달라서 이 읽기에 결함이 생기면 세 곳을 따로 고쳐야 한다. 직전 task에서
"판정이 세 벌"이라 보고했는데 실제로는 **넷**이었다 — `summary.mjs`가 혼자 둘을 갖고 있었다.

**기대 결과.** 읽기를 `src/git-default-branch.mjs`의 `readOriginHead` 하나로 모은다.
**git이 만드는 `origin/HEAD` 모양(`refs/remotes/origin/<branch>`)에서는 동작 변화가 0이어야 한다.**

의도적으로 바뀌는 상태가 하나 있다(codex 리뷰가 잡았다). `origin/HEAD`가 손으로
`refs/heads/<branch>`를 가리키게 설정된 저장소에서 옛 `defaultBranchCandidates`는 `['develop']`을
냈지만 이제 `['main','master']`를 낸다. **이 변경을 유지한다** — git은 그런 origin/HEAD를 만들지 않고,
`--short`가 주는 값은 **로컬** 브랜치 이름이라 그것을 원격 기본 브랜치의 답으로 채택하면 로컬
브랜치가 원격 기본 브랜치 행세를 하게 된다(이 계열 작업이 없애려는 혼동 그 자체다).
`resolveDefaultRef`는 옛 구현에서도 이 값을 거절했으므로 저장소는 이미 자기모순 상태였고, 이제 셋이
같은 답을 한다. 쓰기 가드 관점에서도 새 동작이 보수적이다 — `develop`에서의 `--write`를 허용하는
대신 거부한다.

**제약 — 통일하지 않는 것.**

- **`isSyncedWithDefault`의 무폴백은 그대로 둔다.** `summary.mjs:294-300`이 그 이유를 이미 적어 두었다:
  후보 목록으로 넓히면 `main` 저장소에서 낡은 `origin/master` tip에 선 브랜치까지 쓰기가 열린다
  ("Tolerating that looseness for NAMES protects nothing; tolerating it for COMMITS opens a write").
  `tests/summary.test.mjs:570`가 그 동작을 고정한다. **이미 판단이 내려진 사안이다.**
- **네 함수가 답하는 질문이 다른 것도 그대로 둔다** — ref / 이름 배열 / boolean은 소비자가 다르다.
- **실행 정책을 프리미티브에 심지 않는다.** `remote-task`는 `GIT_NO_LAZY_FETCH=1`+timeout,
  `summary`는 plain. 프리미티브가 정하면 호출자 동작이 바뀐다 — 특히 timeout을 심으면 summary의
  후보 판정이 timeout 시 `['main','master']`로 넓어져 **쓰기 가드가 느슨해진다.**

## 설계 / 접근

`readOriginHead(exec)` — `exec`는 git 인수 배열을 받아 stdout을 주는 실행기. 대상 디렉터리와
실행 정책(env·timeout)은 호출자가 그 함수에 닫아 넣는다. 공유되는 것은 **명령과 파싱뿐**이다.

- `resolveDefaultRef` — 이름 있으면 `origin/<name>`, 없으면 기존 `origin/main` 검증 폴백 → `null`
- `defaultBranchCandidates` — 이름 있으면 `[name]`, 없으면 `['main', 'master']`
- `isSyncedWithDefault` — 이름 없으면 `false`(fail-closed), 있으면 `refs/remotes/origin/<name>`로
  재조립해 HEAD와 비교(로컬 브랜치가 답을 가로채지 못하게 하는 스펠링 가드 유지)

`src/commands/`가 아니라 `src/`에 둔다 — `remote-task.mjs`가 `summary.mjs`를 import하므로
반대 방향은 순환이 된다. `git-hooks.mjs`·`handoff-marker.mjs`와 같은 층이다.

## Ontology

- **origin/HEAD**: 이 저장소의 기본 브랜치를 **이름으로** 가리키는 유일한 ref. `clone`이 설정하고
  `remote add`는 설정하지 않는다 — 그래서 "없음"이 흔한 정상 상태다.
- **읽기 vs 폴백**: 읽기는 "origin/HEAD가 뭐라고 말하는가"(하나의 답), 폴백은 "모를 때 무엇으로
  대신하는가"(호출자마다 다름). 이 task는 **읽기만** 모은다. 둘을 섞으면 의도된 차이가 사라진다.
- **fail-closed**: 판정 불가를 "거부"로 해석하는 것. `isSyncedWithDefault`가 쓰기 가드라서 택한 방향이다.
- **동작 보존의 증거**: 기존 테스트 파일을 **한 줄도 고치지 않고** 전부 통과하는 것. 고쳐야 한다면
  그건 동작이 변했다는 뜻이고 이 task의 전제가 깨진 것이다. (비표준 `refs/heads` 지시는 기존 테스트가
  다루지 않던 상태라 이 증거에 걸리지 않았다 — 리뷰가 잡았고, 이제 신규 테스트가 고정한다.)

## Ambiguity 자가진단

- [x] **Goal 명확도** (40%) — 세 곳의 `origin/HEAD` 읽기를 `readOriginHead` 하나로 모은다. 폴백은 안 건드린다.
- [x] **Constraint 명확도** (30%) — 표준 `origin/HEAD` 모양에서 동작 변화 0(비표준 `refs/heads` 지시는
      의도적 예외, 위에 명시) · `isSyncedWithDefault` 무폴백 유지 · 실행 정책 주입.
- [x] **Success 기준** (30%) — 기존 테스트 **무수정** 전원 통과(925개) + `git diff --stat tests/`에
      신규 파일만 · 비-`main` 기본 브랜치 저장소에서 세 함수가 같은 답.
- [x] **Context 명확도** (brownfield 한정) — `src/git-default-branch.mjs`(신규),
      `src/commands/remote-task.mjs`, `src/commands/summary.mjs`,
      `tests/git-default-branch.test.mjs`(신규).
- [x] **Ambiguity ≤ 0.2** — 위 항목 가중합 ≥ 0.8

## Done evidence

```json
{ "version": 1, "review": "required", "tests": "required" }
```

## 참고

- 통일하지 않기로 한 근거의 정본: `src/commands/summary.mjs:294-300` 주석
- 그 동작을 고정하는 테스트: `tests/summary.test.mjs:570`
- 회귀 판정자: `tests/summary.test.mjs` · `tests/remote-task.test.mjs` (둘 다 무수정이어야 한다)
- 직전 task에서 이 판정을 건드린 지점: `src/commands/review.mjs`의 `resolveScope`

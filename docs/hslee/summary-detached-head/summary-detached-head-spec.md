# summary-detached-head — Spec

## 목적 / 요구사항
- **문제**: `harness-team summary --write`가 detached HEAD에서 "현재 브랜치를 확인할 수 없어 원장을 쓰지 않음"(브랜치 조회 실패)으로 거부된다.
  `branch --show-current`가 detached에서 빈 문자열을 내고, `branchState`가 이를 git 오류와 같은 `error`로 분류했기 때문이다.
- **영향**: AO 워커 워크트리의 머지 후 종결. 기본 브랜치는 원본 체크아웃이 점유해 워커는 `origin/main`에 detach해서 종결하는데,
  #114·#115 종결 모두 `origin/main`과 같은 커밋의 임시 로컬 브랜치를 만들어 우회했다.
- **기대 결과**: HEAD가 `origin/HEAD`가 가리키는 브랜치와 **정확히 같은 커밋**인 detached HEAD에서는 `--write`가 통과한다.
- **제약**: 가드 의도(#99·summary-branch-guard — 기본 브랜치와 동기화된 상태에서만 원장 갱신)를 약화하지 않는다.
  동기화되지 않은 detached·`origin/HEAD` 없는 저장소의 detached는 계속 거부한다. `isSyncedWithDefault`는 바꾸지 않는다.

## 설계 / 접근
- `branchState`에 `detached` 결과를 추가한다(git 성공 + 빈 이름). git 실패는 종전대로 `error`(fail-closed).
- 가드: `detached`는 이름이 없으니 비-기본 브랜치처럼 취급 → `isSyncedWithDefault`가 참일 때만 통과.
  근거는 synced 브랜치와 동일하다 — HEAD가 기본 tip과 같은 커밋이면 로컬 커밋이 0개라 원장 커밋이 기본 tip 바로 위에 얹힌다.
  브랜치 이름은 이 근거에 기여하지 않는다.
- 거부 메시지는 기존 비-기본 브랜치 패킷을 재사용하고 `(현재: detached HEAD)`로 표기한다.
- **done 가드**: 브랜치 조회가 없다(`status --porcelain`·`log --since`만) — detached와 무관. 종결 실측으로 확인한다.

## Ontology
- **synced**: HEAD 커밋 == `refs/remotes/origin/<origin/HEAD가 가리키는 이름>`. 브랜치 이름·detached 여부와 무관한 커밋 동일성.
- **detached**: `branch --show-current`가 성공하고 빈 출력을 낸 상태. git 오류(`error`)와 구분된다.
- 게이트 근거: 목표·제약·성공 기준이 재현 테스트 3개로 결정론적으로 표현된다.

## Ambiguity 자가진단
- [x] **Goal 명확도** (40%) — synced detached HEAD에서 `--write` 통과.
- [x] **Constraint 명확도** (30%) — `isSyncedWithDefault` 불변, 비동기 detached·origin 없는 detached 거부 유지.
- [x] **Success 기준** (30%) — `tests/summary.test.mjs` detached 3건 + 실제 종결에서 detached `--write` 통과.
- [x] **Context 명확도** (brownfield 한정) — `src/commands/summary.mjs` `branchState`·`runSummary` 가드.
- [x] **Ambiguity ≤ 0.2** — 위 항목 가중합 1.0

## Done evidence
```json
{ "version": 1, "review": "required", "tests": "required" }
```

## 참고
- `src/commands/summary.mjs` `branchState` · `isSyncedWithDefault` 블록 주석
- `tests/summary.test.mjs` `cloneWithOrigin` 기반 detached 3건
- 선례: `docs/hslee/summary-branch-guard/`

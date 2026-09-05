# summary-branch-guard — Spec

## 목적 / 요구사항

`harness-team summary --write`는 현재 브랜치 **이름**이 기본 브랜치 후보에 없으면 거부한다
(`src/commands/summary.mjs:296`). 가드의 목적은 옳다 — 공유 원장을 서로 갈라진 feature
브랜치에서 갱신하면 병렬 브랜치끼리 다시 충돌한다(`task`/`done`이 원장을 건드리지 않게 만든
이유 그 자체다). 문제는 **판정 기준이 이름**이라는 것이다.

git worktree에서 일하는 세션은 기본 브랜치를 체크아웃할 수 없다 — `main`은 원본 체크아웃이
점유하고 있어 같은 저장소의 다른 워크트리에서 checkout이 거부된다. 그래서 워크트리 세션은
`origin/main`에서 딴 브랜치(내용·커밋 모두 `origin/main`과 동일)에 있으면서도 가드에 걸리고,
`--force`로 우회한 뒤 `git push origin HEAD:main`으로 반영하게 된다. 2026-09-05 `settings-ask-tier`
종결 때 실제로 이 경로를 밟았고 커밋 메시지에 우회 사유를 남겨야 했다.

**우회가 상시화되면 가드는 가드가 아니다.** `--force`가 습관이 되면 진짜 feature 브랜치에서도
그대로 눌리고, 가드는 아무것도 막지 못한 채 경고음만 남는다.

인도할 것:
1. 브랜치 이름이 기본 브랜치가 아니어도 **HEAD 커밋이 `origin/HEAD`가 가리키는 브랜치와
   정확히 같으면** `--write`를 허용한다.
2. 그 외 동작은 전부 그대로 둔다 — 갈라진 feature 브랜치·detached HEAD·git 조회 실패는 계속 거부.
3. 새 경로와 기존 거부 경로를 테스트로 고정한다.

## 설계 / 접근

**판정은 "커밋 동일성"이지 "이름"이 아니다.** `git rev-parse HEAD`와
`git rev-parse --verify refs/remotes/<origin/HEAD가 가리키는 브랜치>`가 같으면, 이 브랜치에는
**로컬 커밋이 하나도 없다** — 원장을 써서 만드는 커밋은 기본 브랜치 바로 위에 얹힌다. 기본
브랜치에서 쓰는 것과 결과가 같으므로 가드가 막으려는 충돌이 성립하지 않는다.

**정확한 동일성만 인정한다. ancestor 관계는 인정하지 않는다.**
- **앞선(ahead) 브랜치** = 로컬 커밋이 있는 진짜 feature 브랜치 → 계속 거부해야 한다.
- **뒤진(behind) 브랜치** = 낡은 base 위에 원장을 렌더하게 된다. 내용은 task 디렉터리에서
  파생되므로 틀리지 않지만, push가 non-fast-forward로 실패해 사용자를 더 헷갈리게 한다.
  둘 다 거부하는 편이 단순하고 안전하다.

**판정의 근거는 `origin/HEAD`뿐이다.** 이 저장소의 기본 브랜치를 이름 대는 유일한 ref이므로,
없으면 판정 자체가 성립하지 않는다. `defaultBranchCandidates`의 `main`/`master` 폴백을 커밋
판정에 쓰지 않는 이유는, 기본 브랜치가 `master`에서 `main`으로 옮겨간 뒤 옛 `origin/master`가
남아 있는 저장소에서 그 tip에 서 있는 브랜치까지 열리기 때문이다 — 그 브랜치의 원장 커밋은
실제 기본(`main`)으로 fast-forward 되지 않으므로 위의 behind와 정확히 같은 상황이다.
느슨한 후보 폴백은 **이름** 판정에서는 아무것도 열지 않지만(feature 브랜치는 어차피 거부된다)
**커밋** 판정에서는 쓰기를 연다.

**fail-closed를 유지한다.** `origin/HEAD` 조회·`rev-parse` 어느 쪽이든 실패하면(원격 ref 없음·
커밋이 하나도 없는 unborn HEAD·git 오류) 새 경로는 성립하지 않고 **기존 거부로 떨어진다.**
origin이 없는 로컬 전용 저장소는 `origin/HEAD`가 없으므로 지금과 정확히 같이 동작한다 —
이름이 `main`/`master`면 통과, 아니면 거부.

**적용 범위는 명명된 브랜치뿐이다.** detached HEAD는 `branchState`가 `{kind:'error'}`로 보고하고
그 분기에서 이미 거부된다. detached HEAD가 `origin/main`을 가리키는 경우도 이론상 안전하지만
드물고, 그 분기의 "브랜치를 확인할 수 없다"는 메시지가 여전히 맞다 — 범위 밖으로 둔다.

**거부 메시지는 손대지 않는다.** 새 경로가 열리면 `origin/main`과 같은 커밋일 때는 애초에
거부가 나오지 않는다. 남는 거부는 전부 진짜로 갈라진 상태이므로 기존 문구가 그대로 맞다.

## Ontology
*이 task가 다루는 핵심 개념의 정의. "X가 정확히 뭔가?"에 답한다.*

- **기본 브랜치 후보**: `defaultBranchCandidates`가 내는 이름 목록. `origin/HEAD`가 있으면 그것
  하나, 없으면 `['main', 'master']`. 이 task는 이 함수를 바꾸지 않고 **소비만** 한다.
- **동기화된 브랜치(synced branch)**: 이름은 기본 브랜치가 아니지만 HEAD 커밋이
  **`origin/HEAD`가 가리키는 브랜치**와 **정확히 같은** 브랜치. 로컬 커밋이 0개라는 뜻이며,
  이 task가 `--write`를 새로 허용하는 유일한 상태다.
  *(2026-09-05 정정 — 처음에는 "`origin/<후보>` 중 하나"로 정의했다. `defaultBranchCandidates`의
  `main`/`master` 폴백까지 대조하면 실제 기본이 `main`인 저장소에서 낡은 `origin/master` tip의
  브랜치까지 열려, behind를 거부한 근거와 모순된다 — codex 리뷰 BRG-01. 후보 폴백은 이름
  판정에만 남기고 커밋 판정은 `origin/HEAD`로 좁혔다.)*
- **갈라진(divergent) 브랜치**: HEAD가 `origin/HEAD`가 가리키는 브랜치와 다른 브랜치.
  앞섰든 뒤졌든 계속 거부한다 — 가드가 원래 막으려던 대상이다. `origin/HEAD`가 없어 판정
  자체가 불가능한 저장소도 같은 취급을 받는다(fail-closed).
- **fail-closed**: 판정에 필요한 정보를 얻지 못하면 허용이 아니라 **거부로 떨어지는** 성질.
  `branchState`가 git 실패를 "브랜치 없음"으로 읽지 않는 것과 같은 원칙이다.
- **게이트 통과 근거**: 목표(판정 기준 하나 추가)·제약(정확 동일성·fail-closed·기존 경로 불변)·
  성공 기준(테스트 4종)·영향 파일이 아래에 모두 구체화돼 있다(4/4 체크).

## Ambiguity 자가진단
*각 항목이 명확하면 체크. 3개 이상 미체크면 구현 진입 금지 — 인터뷰/브레인스토밍으로 복귀해
모호성을 제거한다. 게이트를 통과하면 그 근거를 위 Ontology 섹션에 한 줄로 남긴다.*

- [x] **Goal 명확도** (40%) — 목표가 한 문장으로 구체화되었는가?
      → "브랜치 이름 대신 HEAD 커밋이 `origin/HEAD`가 가리키는 브랜치와 같은지를 보고
        `--write`를 허용한다.""
- [x] **Constraint 명확도** (30%) — 기술/시간/범위 제약이 명시되었는가?
      → 정확 동일성만(ancestor 불인정), fail-closed 유지, 로컬 전용 저장소 동작 불변,
        detached HEAD·거부 메시지·`defaultBranchCandidates`는 범위 밖.
- [x] **Success 기준** (30%) — 완료를 어떻게 측정하는가?
      → ① origin/main과 같은 커밋의 비-main 브랜치에서 `--write`가 성공 ② 그 브랜치에 커밋을
        하나 얹으면(ahead) 다시 거부 ③ behind도 거부 ④ origin 없는 로컬 저장소는 종전과 동일 /
        `npm test` 전체 green · `docs:check` exit 0 · codex 리뷰 기록.
- [x] **Context 명확도** (brownfield 한정) — 영향 받는 기존 코드/파일을 식별했는가?
      → `src/commands/summary.mjs`(가드 296행 부근), `tests/summary.test.mjs`, `CHANGELOG.md`.
        overview·what-changes는 릴리스 시점 작업이라 이 task 범위가 아니다.
- [x] **Ambiguity ≤ 0.2** — 위 항목 가중합 ≥ 0.8 → 1.0

## Done evidence
```json
{ "version": 1, "review": "required" }
```

## 참고
*코드 기반 참조가 산문 설계보다 정밀하다 — 테스트 스위트·Boundary contract(JSON Schema)·
다이어그램·기존 코드 경로를 우선 링크하고, 산문은 코드로 표현 못 하는 의도만 담는다.*

- 계약 정본: `tests/summary.test.mjs` (이 task가 synced-branch 케이스를 추가한다)
- 가드 본문: `src/commands/summary.mjs`의 `runSummary` `--write` 분기
- 기존 판정: 같은 파일의 `branchState`(fail-closed 주석이 이 task의 원칙과 같다)와
  `defaultBranchCandidates`(이 task는 소비만 한다)
- 유래: 2026-09-05 `settings-ask-tier` 종결 때 워크트리에서 `--force` 우회가 필요했던 사례.
  경위는 `docs/hslee/settings-ask-tier/settings-ask-tier-artifact.md`와 그 원장 커밋 메시지.

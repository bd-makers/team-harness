# handoff-hook-churn — Spec

## 목적 / 요구사항

**오늘 무엇이 안 되는가.** post-commit 훅(`harness-team handoff`)은 커밋 **뒤에** 두 파일을 쓴다 —
`<task>-handoff.md`(항목 append)와 `<user>-handoff.md`(재작성). 그래서 커밋 직후 트리는 항상 dirty다.
그 churn을 쓸어 담으려고 커밋하면 **그 커밋이 다시 훅을 돌려** 새 항목을 만든다 — 자기 자신을 먹이는 루프라
트리가 깨끗해지는 지점이 없다. 2026-09-11 0.38.0 릴리스에서 이 때문에 훅을 세 번 비켜 놓고 커밋해야 했다.

**기대 결과.** **핸드오프 파일만** 바꾼 커밋에는 훅이 아무것도 기록하지 않는다. 그러면 churn은
"실제 작업 커밋 → 한 번의 sweep 커밋"에서 끝나고 트리가 깨끗해진다.

**제약.**
- 병합 커밋을 조용히 건너뛰면 안 된다 — `git diff-tree --name-only`도 `git show --name-only`도
  병합 커밋에는 **아무 경로도 출력하지 않는다**(실측). 경로 목록이 비었다는 이유로 건너뛰면 병합이 기록에서 사라진다.
- 빈 커밋(`--allow-empty`)도 같은 빈 목록을 낸다 — 종전대로 **기록한다**(동작 불변).
- 제외 경로 집합은 `done` 가드가 이미 같은 이유로 쓰고 있다(`collectDoneIssues`의 `handoffRels`).
  **한 곳에서 export해 둘이 공유한다** — 복제하면 가드는 무시하는데 훅은 계속 쓰는 상태로 갈라지고,
  그 드리프트는 "churn이 조용히 되살아나는" 형태라 눈에 띄지 않는다.
- `POST_COMMIT_HOOK` 텍스트는 바뀌지 않는다 — 수정은 `runHandoffAuto` 안이라 기존 설치는
  플러그인 갱신만으로 고쳐진다(`init`·`migrate` 불필요).
- `done` 가드의 handoff 제외는 **유지한다** — 실제 작업 커밋 뒤에는 여전히 dirty이므로 아직 필요하다.

## 설계 / 접근

`runHandoffAuto`가 기록 전에 HEAD를 본다:

1. 부모 수를 `git rev-list --parents -n1 HEAD`로 센다. **2개 이상(병합)이면 건너뛰지 않는다.**
2. `git diff-tree --no-commit-id --name-only --ignore-submodules=none -r -z HEAD`로 경로를 얻는다.
   - `--ignore-submodules=none`: `submodule.<name>.ignore=all`이면 gitlink 변경이 이 출력에서 **사라진다**(실측).
     그대로 두면 submodule을 bump한 진짜 작업 커밋을 sweep으로 오인한다.
   - `-z`: 경로를 NUL로 받아 인용(`"…"`)을 거치지 않는다.
3. **경로가 하나 이상이고 전부 핸드오프 파일이면** 기록하지 않고 반환한다.
   (비었으면 = 병합·빈 커밋 → 종전대로 기록.)
4. git이 없거나 실패하면 종전대로 기록한다 — 판정 불가를 "건너뜀"으로 바꾸지 않는다.

`handoffRelPaths(user, task)`를 `task.mjs`에서 export하고 `collectDoneIssues`와 `runHandoffAuto`가 함께 쓴다.

가드 쪽도 `git status --porcelain -z`로 읽고 파서를 NUL 형식으로 다시 쓴다 — 기본 porcelain은 비-ASCII
경로를 octal로 인용하는데, `.harness/config.json`의 `config.user`는 `member.sanitize`를 거치지 않는
자유 입력이라 비-ASCII user가 실제로 가능하다. 인용된 경로는 제외 집합과 영영 불일치해 훅 자신의 출력이
"실제 dirty"로 계산되고 **종결이 영구히 막힌다**. rename은 두 경로를 모두 돌려준다 — 목적지만 남기면
`src/real.md -> docs/<u>/<u>-handoff.md` 같은 staged rename이 제외에 삼켜져 원본의 삭제를 못 본다.

**범위 밖(후속 후보).** `git commit --amend`는 훅을 다시 돌려 **같은 논리 커밋에 두 번째 항목**을 남기고,
첫 항목의 sha는 더 이상 존재하지 않는다(오늘 `f528422`가 그랬다). 정확한 판별자는 reflog
(`commit (amend):` vs `commit:`)지만, 이 수정이 들어가면 릴리스 흐름에서 amend 자체가 줄어 우선순위가 낮다.
브랜치 전환과 구분하지 못하는 휴리스틱(ancestor+같은 부모)은 **진짜 항목을 지울 수 있으므로 쓰지 않는다.**

## Ontology

- **churn**: 커밋 뒤 훅이 쓰는 핸드오프 변경. 그 자체를 커밋하면 다시 churn이 생기는 자기참조 루프였다.
- **sweep 커밋**: 직전 커밋의 churn만 담는 커밋. 이 수정 뒤에는 훅이 여기서 침묵해 루프가 끝난다.
- **핸드오프 경로 집합**: `docs/<user>/<task>/<task>-handoff.md` + `docs/<user>/<user>-handoff.md`.
  훅이 쓰는 것과 가드가 무시하는 것이 **같은 집합**이어야 한다.

## Ambiguity 자가진단

- [x] **Goal 명확도** (40%) — "핸드오프만 바꾼 커밋에는 기록하지 않는다" 한 문장.
- [x] **Constraint 명확도** (30%) — 병합·빈 커밋·경로 집합 공유·훅 텍스트 불변·가드 제외 유지.
- [x] **Success 기준** (30%) — 아래 테스트 4종 + sweep 커밋 뒤 `git status`가 clean.
- [x] **Context 명확도** (brownfield) — `src/commands/task.mjs`(`runHandoffAuto`·`collectDoneIssues`), `tests/user-handoff.test.mjs`.
- [x] **Ambiguity ≤ 0.2** — 가중합 1.0.

## Done evidence
```json
{ "version": 1, "review": "required", "tests": "required" }
```

## 참고

- 실측(2026-09-11): 병합 커밋에서 `diff-tree --name-only`·`show --name-only` 모두 **빈 출력**, 부모 3워드
  (`rev-list --parents -n1`). 빈 커밋도 빈 출력.
- 훅은 전역 `harness-team`(마켓플레이스 clone)을 부른다 — **커밋해서 훅을 관찰하는 방식으로 검증하지 않는다.**
  `runHandoffAuto`를 직접 호출하거나 `node bin/harness-team.mjs handoff`로 검증한다.
- 크기: ① 표면의 수정 → **patch(0.38.1)**. what-changes 문서는 patch에도 필수(3방향 pin).

# list-remote-branches — Spec

## 목적 / 요구사항
*문제(오늘 무엇이 안 되는가) → 영향받는 사용자·시스템 → 기대 결과 → 제약 순으로 쓴다.
답 없는 질문은 요구가 아니다 — `## 참고` 절에 `- (open) …`으로 남긴다.*

- **문제:** `harness-team list` 는 체크아웃한 브랜치의 `docs/` 만 본다(`listTaskRefs`). 머지되지 않은 원격 브랜치에만
  있는 task 는 보이지 않는다 — 2026-09-08 실측: 열린 task 가 `origin/claude/agent-harness-core-elements-fqankc` 에만 있었고,
  그 브랜치가 "머지된 브랜치"로 오인돼 지워질 뻔했다.
- **영향:** 여러 세션·클론·워크트리에서 브랜치를 나눠 일하는 팀원(D5). "열린 task 0" 판단이 main 기준으로만 내려진다.
- **기대 결과:** `harness-team list --remote` 가 로컬 목록 뒤에 "원격 브랜치에만 있는 task" 절을 붙인다.
- **제약:**
  - opt-in. `--remote` 없는 `list` 의 출력·비용은 종전과 같다.
  - **fetch 하지 않는다.** 로컬 `refs/remotes/origin/*`(마지막 fetch 기준)만 읽는다 — `remote-task.mjs` 와 같은 계약
    (`GIT_NO_LAZY_FETCH=1`, timeout).
  - 원격 부분의 어떤 실패도 throw·non-zero exit 를 만들지 않는다 — 건너뜀 한 줄.

## 설계 / 접근

- `src/commands/remote-task.mjs` 에 `listBranchOnlyTasks(targetDir, { git })` 추가. 반환
  `{ ok: true, tasks: [{ user, task, branches: [...], meta }] }` 또는 `{ ok: false }`. throw 하지 않는다.
  1. `resolveDefaultRef` 로 default ref(예: `origin/main`). 없으면 `{ ok: false }`.
  2. `git for-each-ref --format=%(refname:short) refs/remotes/origin/` 로 원격 브랜치 목록. `origin/HEAD`·default ref 제외.
  3. 각 ref: `git merge-base --is-ancestor <ref> <default>` 가 exit 0 이면(조상 = 머지됨) 건너뛴다. exit 1 이면 계속,
     그 외 오류는 전체 실패.
  4. `git ls-tree -r --name-only <ref> -- docs/` 의 경로 중 `docs/<user>/<task>/<task>-spec.md` 형태(정확히 4 세그먼트,
     파일명이 `<task>-spec.md`)만 task 로 본다 — `listTaskRefs` 의 "task = spec 마커" 정의와 같다.
  4-1. default ref 트리에 이미 spec 마커가 있는 task 는 제외한다(`ls-tree` 1회 추가). 구현 중 픽스처가 드러낸 보강 —
     머지 뒤 main 에서 딴 브랜치는 main 의 task 를 전부 싣고 있어, 로컬이 옛 브랜치면 그것들이 branch-only 로 보였다.
  5. 같은 user/task 가 여러 브랜치에 있으면 한 항목에 브랜치를 모은다. meta 는 첫 브랜치에서 `git show <ref>:<meta rel>`
     로 읽는다(읽기 실패·JSON 아님 → null).
- `runList` : `--remote` 가 있으면 로컬 목록 뒤에 절을 출력한다. 로컬에 이미 있는 user/task 는 제외한다.
  `--area` 는 원격 항목에도 같은 규칙(meta.area 일치)으로 적용 — meta 없으면 area 없음.
- 출력(마지막 fetch 기준을 헤더에 명시):
  ```
  branch-only (origin, 마지막 fetch 기준):
    alice/foo  (origin/feat-foo)
  ```
  없으면 `  (none)`. 실패하면 `branch-only: 원격 스캔 건너뜀 (git·origin 없음 또는 git 오류)` 한 줄.
- 등록: `cli-args.mjs` `COMMANDS` 의 `list` 에 `remote` 플래그, args/summary 갱신. README·`commands/harness-task.md`·CHANGELOG.

## Ontology
*이 task가 다루는 핵심 개념의 정의. "X가 정확히 뭔가?"에 답한다.*

- **branch-only task**: default ref 의 조상이 아닌 `refs/remotes/origin/*` 브랜치 트리에 spec 마커가 있고,
  로컬 워킹트리와 default ref 트리에는 같은 user/task 의 spec 마커가 없는 task.
- **머지된 브랜치**: `git merge-base --is-ancestor <ref> <default ref>` 가 참인 원격 브랜치. squash 머지는 조상이 아니므로
  "머지 안 됨"으로 남는다 — 그 task 는 default ref 트리에 있으니 default 제외 규칙이 걸러 준다.
- **마지막 fetch 기준**: 원격 상태는 로컬 remote-tracking ref 가 정본이다. 그 이후 원격 변화는 모른다.
- 게이트 근거: 설계가 사용자 승인으로 고정돼 있고, 영향 파일·성공 기준(테스트 픽스처 5종)이 식별됐다.

## Ambiguity 자가진단
*각 항목이 명확하면 체크. 3개 이상 미체크면 구현 진입 금지 — 인터뷰/브레인스토밍으로 복귀해
모호성을 제거한다. 게이트를 통과하면 그 근거를 위 Ontology 섹션에 한 줄로 남긴다.*

- [x] **Goal 명확도** (40%) — 목표가 한 문장으로 구체화되었는가?
- [x] **Constraint 명확도** (30%) — 기술/시간/범위 제약이 명시되었는가?
- [x] **Success 기준** (30%) — 완료를 어떻게 측정하는가?
- [x] **Context 명확도** (brownfield 한정) — 영향 받는 기존 코드/파일을 식별했는가?
- [x] **Ambiguity ≤ 0.2** — 위 항목 가중합 ≥ 0.8

<!-- 선택 선언. 아래 주석을 벗기면 done 가드가 검사한다.
     미선언 기본값: "tests": "required" (소스가 바뀌면 테스트 파일 변경을 요구), "review": "optional",
     "verify": "optional" ("required"면 검증 프레이밍 kind 마커 — -adversarial 등 — 를 요구). -->
## Done evidence
<!--
```json
{ "version": 1, "review": "required", "tests": "skip" }
```
-->

## 참고
*코드 기반 참조가 산문 설계보다 정밀하다 — 테스트 스위트·Boundary contract(JSON Schema)·
다이어그램·기존 코드 경로를 우선 링크하고, 산문은 코드로 표현 못 하는 의도만 담는다.*

- 테스트: `tests/list-remote.test.mjs`
- 재사용: `src/commands/remote-task.mjs` (`git` 헬퍼·`resolveDefaultRef`), `src/task-paths.mjs` (`listTaskRefs`)
- 성공 기준: 미머지 브랜치의 task 만 표시 · 머지된 브랜치·로컬에 있는 task 는 제외 · origin 없음 → 건너뜀 한 줄·exit 0 ·
  `--remote` 없으면 원격 절 없음 · `npm test`·`docs:check` green

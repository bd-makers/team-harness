# review-scope-handoff — Spec

## 목적 / 요구사항
*문제(오늘 무엇이 안 되는가) → 영향받는 사용자·시스템 → 기대 결과 → 제약 순으로 쓴다.
답 없는 질문은 요구가 아니다 — `## 참고` 절에 `- (open) …`으로 남긴다.*

**문제.** `harness-team review`는 `--scope`가 없으면 `resolveScope`(`src/commands/review.mjs:234`)가 `git status --porcelain`이
비어 있지 않을 때 `worktree`를 고른다. 하네스 post-commit 훅(`harness-team handoff` = `runHandoffAuto`, `src/commands/task.mjs`)은
커밋마다 활성 task의 handoff를 다시 써 트리를 dirty로 만든다. 그래서 **커밋 직후의 리뷰는 구현 diff가 아니라 handoff 한 파일만 보는
worktree scope가 된다.** 재현(2026-10-10, 임시 저장소): 브랜치에서 구현 커밋 후 task handoff에 한 줄만 추가 →
`resolveScope({scope: undefined})` = `{scope:'worktree'}`, `--scope diff` = `{scope:'diff', base:'main'}`.

**영향.** `--scope`를 명시하지 않는 모든 경로 — `/harness-review` 3단계, `--framing scenario`(R2, AGENTS.md.hbs 안내 형태),
adversarial, testcritic(unit/component/integration). `harness-team scope`도 같은 함수를 부른다(`src/commands/scope.mjs:37`).
loop·ship은 이미 `--scope diff`를 명시해 영향 없음. 실제 피해: task `wiki-commit-provenance`의 R2 `codex-scenario` 1차 실행
(artifact에 "무효 범위" 기록), task `task-folder-removal`에서도 동일.

**기대 결과.** dirty 판정에서 **post-commit 훅이 쓰는 handoff 경로를 제외**한다. 바뀐 경로가 그것뿐이면 clean으로 보고 diff로 간다.
그 밖의 변경이 하나라도 있으면 종전대로 worktree다. `harness-team scope`도 같은 규칙을 따른다(같은 함수).

**제약.** 런타임 의존성 0 · 제외 범위는 훅이 실제로 쓰는 경로만 · 명시 `--scope`의 동작 불변 · 기존 테스트 무수정 통과 ·
버전 범프·매니페스트 수정 없음(§5).

## 원천 검토 (R1)
*원천 문서(PRD·Figma·API 문서·기획서·정책서) 사이의 충돌·누락·모순을 Plan 전에 검토한다(`/harness-interview`).
충돌·모순은 `(unresolved)`, 누락은 `(open)`으로 적고, `→ 결정: …`으로 해결한 뒤 재대조해 `- 검토 완료: <날짜>`로 닫는다.
원천이 없으면 `- 없음 — <사유>` 한 줄. 원천 위치는 프로젝트가 정한다.*

### 원천
- 사람 지시(2026-10-10, 오케스트레이터 경유 brief) — 원인 진단·재현·할 일 A(필수)·B(판단)·관련 잠재 문제(판단).
- `commands/harness-review.md` 2단계 — scope 판정 규칙의 정본(코드가 미러).
- `commands/harness-task.md` "post-commit handoff" 절 — 훅이 쓰는 파일 두 개와 `handoffRelPaths` 공유 규칙.

### 발견
- 정본(harness-review.md 2단계)은 "`git status --short`가 dirty면 worktree"라고만 쓴다 — 훅 출력 제외가 없다. 코드와 같이 고친다.
- B(가드 강화)와 관련 잠재 문제(worktree scope가 커밋된 브랜치 변경을 안 봄)는 brief에서 별개 항목이지만 같은 결정이다 → 설계 절 "B 판단".
- 검토 완료: 2026-10-10

## 설계 / 접근

**제외 집합 — 근거는 훅 코드.** `runHandoffAuto`(post-commit 훅의 본체)는 활성 task가 있을 때만 정확히 두 파일을 쓴다:
`taskFilePath(user, task, 'handoff.md')`(항목 append 또는 amend 교체)와 `userHandoffPath(user)`(재작성). 활성 task가 없으면 아무것도 쓰지 않는다.
이 두 경로를 돌려주는 함수가 이미 있다 — `handoffRelPaths(user, task)`. `done` 가드와 sweep 판정(`commitTouchesOnlyHandoff`)이
"훅 자신의 출력"으로 쓰는 바로 그 집합이다. 세 번째 정의를 만들지 않고 이것을 쓴다. `<user>-handoff.md`는 보통 gitignore라
status에 안 나오지만, 아직 추적 중인 구 저장소를 위해 집합에 남긴다(가드와 같은 이유).

**판정.** `resolveScope`에서 dirty 판정을 바꾼다:
1. `git status --porcelain -z` → `parsePorcelainPaths`(가드와 같은 파서). 기본 `--porcelain`은 비-ASCII 경로를 octal로 인용해
   경로 대조가 어긋난다(가드에서 codex P2로 고친 결함) — 경로를 대조하는 순간 `-z`가 필요하다.
2. `readActive(targetDir)`로 활성 task를 읽고, 있으면 `handoffRelPaths(user, task)`에 `repoPrefix(targetDir)`를 붙인 집합을 경로 목록에서 뺀다
   (git 경로는 저장소 루트 기준 — 하위 디렉터리 설치에서도 가드와 같게 맞는다). `repoPrefix`는 export만 한다.
3. 남은 경로가 있으면 dirty. 없으면 clean → 기존 diff 사다리.

활성 task가 없거나 읽지 못하면 제외 없음 = 종전 동작. 활성 task를 바꾼 뒤 이전 task의 handoff가 dirty로 남아 있으면 제외되지 않아
worktree가 된다 — 틀리면 종전 동작 쪽으로 틀린다(보수적). 명시 `--scope worktree|diff|task-docs`는 dirty 값과 무관해 불변이다.

**바뀌는 동작 하나(의도).** 기본 브랜치 위에서(base 대비 커밋 없음) handoff만 dirty면 종전엔 handoff를 worktree로 리뷰했고, 이제는
diff가 비어 `{ empty: true }` — "리뷰할 것 없음"이다. 훅의 자동 출력만 리뷰하는 것은 리뷰가 아니므로 이쪽이 맞다.

**영향 표.**

| 파일 | 변경 |
|---|---|
| `src/commands/review.mjs` | `resolveScope` dirty 판정 — `-z` 파싱 + 훅 handoff 제외 |
| `src/commands/task.mjs` | `repoPrefix` export (동작 불변) |
| `tests/review-command.test.mjs` | S1·S2 테스트 추가 (실패 재현 먼저) |
| `tests/scope-command.test.mjs` | S3 — `harness-team scope`가 같은 규칙 |
| `commands/harness-review.md` | 2단계 정본 문장에 제외 규칙 |
| `commands/harness-task.md` | post-commit 절에 "review scope도 같은 집합을 제외" 한 줄 |
| `CHANGELOG.md` | `[Unreleased]` 항목 |
| `docs/followups.md` | 17번 — worktree scope가 커밋된 변경을 안 봄 |

**B 판단 — 가드 강화는 기각.** A 이후 `scope=worktree` 리뷰는 (a) 명시 `--scope worktree`이거나 (b) handoff 밖의 **진짜 미커밋 편집**이
있을 때만 생긴다. `verifyEvidencePredicate`(`task.mjs:815`)에 scope 검사를 붙이면 (b)의 정당한 커밋 전 리뷰까지 증거에서 빠지는데,
(b)의 실제 결함 — worktree 리뷰가 이미 커밋된 브랜치 변경을 보지 않는다 — 은 가드로 고쳐지지 않는다. 가드는 scope 값만 볼 수 있고
"그 리뷰가 무엇을 덮었나"는 판정하지 못한다. 근본 원인(자동 판정이 handoff 때문에 worktree를 고름)은 A가 없앤다. 그래서 B는 기각하고,
남는 문제는 관련 잠재 문제 하나로 모아 후속으로 넘긴다.

**관련 잠재 문제 — 이번 범위 밖(후속 open).** worktree scope의 의미를 "미커밋 + base 대비 커밋"으로 넓히는 것은 리뷰 프롬프트 문구,
`harness-review.md` 정본, 기록되는 scope 값의 의미를 함께 바꾸는 계약 변경이다. 이번 결함(훅 출력 오판)과 독립이라 섞지 않는다.
`docs/followups.md` 17번으로 남긴다.

**기각한 대안.**
- handoff 내용이 "훅 형식 항목 append뿐인가"까지 검사 — 사람이 handoff를 손으로 고친 경우를 구분하려는 것이나, 가드·sweep 판정이 이미
  경로 단위로 제외하고 있고 handoff 수기 편집은 리뷰 대상 코드가 아니다. 판정이 셋으로 갈라진다.
- 기본값을 항상 diff로 — dirty 트리의 커밋 전 리뷰(정당한 사용)를 깨고 정본 2단계를 뒤집는다.

## Ontology
*이 task가 다루는 핵심 개념의 정의. "X가 정확히 뭔가?"에 답한다.*

- **훅 출력 경로**: post-commit 훅(`runHandoffAuto`)이 커밋 뒤에 쓰는 파일 — 활성 task 기준 `handoffRelPaths(user, task)`의 두 경로(저장소 루트 기준으로 접두 보정).
- **실제 dirty**: `git status --porcelain -z`의 경로 중 훅 출력 경로를 뺀 것이 하나라도 남은 상태. scope 자동 판정과 `done` 가드가 같은 제외 집합을 쓴다.
- **scope 자동 판정**: `--scope` 미지정 시 실제 dirty면 `worktree`, 아니면 base 대비 `diff`(비면 `empty`).
- 게이트 근거: Goal·Constraint·Success·Context 전 항목 pass — 아래 자가진단.

## Ambiguity 자가진단
*각 항목이 명확하면 체크. 3개 이상 미체크면 구현 진입 금지 — 인터뷰/브레인스토밍으로 복귀해
모호성을 제거한다. 게이트를 통과하면 그 근거를 위 Ontology 섹션에 한 줄로 남긴다.*

- [x] **Goal 명확도** (40%) — 목표가 한 문장으로 구체화되었는가? — 근거: "scope 자동 판정이 훅이 쓴 handoff 변경을 dirty로 세지 않는다 — 그것뿐이면 diff".
- [x] **Constraint 명확도** (30%) — 기술/시간/범위 제약이 명시되었는가? — 근거: 제약 절(의존성 0·제외는 훅 경로만·명시 scope 불변·범프 없음).
- [x] **Success 기준** (30%) — 완료를 어떻게 측정하는가? — 근거: Done evidence S1–S3 + 기존 테스트 무수정 통과.
- [x] **Context 명확도** (brownfield 한정) — 영향 받는 기존 코드/파일을 식별했는가? — 근거: 설계 절 영향 표, 기준 origin/main `396fbcc`(0.49.0).
- [x] **Ambiguity ≤ 0.2** — 위 항목 가중합 ≥ 0.8 — 근거: 전 항목 pass(가중합 1.0).

<!-- 선택 선언. 아래 주석을 벗기면 done 가드가 검사한다.
     미선언 기본값: "tests": "required" (소스가 바뀌면 테스트 파일 변경을 요구), "review": "optional",
     "verify": "optional" ("required"면 검증 프레이밍 kind 마커 — -adversarial 등 — 를 요구).
     R2(옵트인): "scenarios": [{ "id", "given", "when", "then", "test", "cmd" }] — 수용 기준을 Given/When/Then으로 쓰고
     증거(테스트 이름·명령)를 잇는다. `harness-team scenario check`가 cmd exit 0을, `review <engine> --framing scenario`가
     "증거가 Then을 검증하는가"를 판정한다. 선언하면 verify 증거는 -scenario kind만 센다. -->
## Done evidence
```json
{
  "version": 1,
  "review": "required",
  "scenarios": [
    {
      "id": "S1",
      "given": "활성 task tester/demo 가 있는 저장소에서 feature 브랜치에 구현 커밋을 쌓은 뒤, 훅이 쓰는 두 파일(task handoff 에 한 줄 append, 추적 중인 user handoff 재작성)만 바뀌었다",
      "when": "--scope 없이 resolveScope 와 review 를 실행하고, 같은 상태를 base 브랜치(main, 브랜치 커밋 없음)에서도 만든다",
      "then": "feature 에서는 scope 가 diff·base 가 main 이고 review 가 meta.reviews 에 scope=diff 로 기록한다. main 에서는 handoff 를 worktree 로 리뷰하지 않고 empty(리뷰할 것 없음)이다",
      "test": "resolveScope: a tree dirty only from the post-commit handoff resolves to diff",
      "cmd": "node --test --test-name-pattern=\"resolveScope: a tree dirty only from the post-commit handoff resolves to diff\" tests/review-command.test.mjs"
    },
    {
      "id": "S2",
      "given": "S1 의 feature 상태(handoff dirty)에 더해 각각 (a) 추적 파일 수정 (b) 새 미추적 파일 (c) active.json 없음 (d) 활성 task 가 아닌 다른 task 의 handoff 만 dirty",
      "when": "--scope 없이 resolveScope 를 실행하고, (a) 상태에서 --scope diff 도 실행한다",
      "then": "(a)(b)(c)(d) 모두 worktree — 제외는 활성 task 의 훅 출력 경로뿐이다. 명시 --scope diff 는 dirty 와 무관하게 diff",
      "test": "resolveScope: only the active task's hook-written handoff paths are excluded",
      "cmd": "node --test --test-name-pattern=\"resolveScope: only the active task's hook-written handoff paths are excluded\" tests/review-command.test.mjs"
    },
    {
      "id": "S3",
      "given": "활성 task 가 있고 feature 브랜치에 커밋이 있으며 task handoff 만 dirty 인 저장소",
      "when": "harness-team scope --json 을 CLI 로 실행한다",
      "then": "exit 0, scope 가 diff — scope 명령이 review 와 같은 판정을 쓴다",
      "test": "scope: handoff-only dirty tree reports diff like review",
      "cmd": "node --test --test-name-pattern=\"scope: handoff-only dirty tree reports diff like review\" tests/scope-command.test.mjs"
    }
  ]
}
```

## 참고
*코드 기반 참조가 산문 설계보다 정밀하다 — 테스트 스위트·Boundary contract(JSON Schema)·
다이어그램·기존 코드 경로를 우선 링크하고, 산문은 코드로 표현 못 하는 의도만 담는다.*

- 훅 본체: `src/commands/task.mjs` `runHandoffAuto` · 제외 집합 `handoffRelPaths` · 파서 `parsePorcelainPaths` · 접두 `repoPrefix`
- 가드 선례: `src/commands/task.mjs` done 가드 git signals 블록(`handoffRels` 제외)
- 판정: `src/commands/review.mjs` `resolveScope` · 호출부 `runReview`·`src/commands/scope.mjs` `runScope`
- (open) worktree scope가 이미 커밋된 브랜치 변경을 보지 않는다 — 미커밋 편집이 있으면 리뷰가 커밋된 구현을 놓친다. 계약 변경이라 이번 범위 밖 → `docs/followups.md` 17번.
- (open) B(가드가 scope 를 보게) 기각 — 사유는 설계 절 "B 판단". 위 (open)이 해결되면 함께 재검토.
- (open) 구현 중 발견(2026-10-10 실측): `review` 자신이 성공마다 `<name>-artifact.md`·`<name>-meta.json`을 써서, 커밋 없이 이어 돌리는
  두 번째 자동 판정은 다시 worktree다. 훅 출력이 아니라 brief의 제외 범위 밖 → `docs/followups.md` 18번. 우회: 연속 리뷰는 `--scope diff` 명시.

# path-edge-fixes — Spec

## 목적 / 요구사항
*문제(오늘 무엇이 안 되는가) → 영향받는 사용자·시스템 → 기대 결과 → 제약 순으로 쓴다.
답 없는 질문은 요구가 아니다 — `## 참고` 절에 `- (open) …`으로 남긴다.*

#101·#102 가 남긴 후속 후보 두 건 — 둘 다 "이름이 가리키는 곳" 의 경계 보강이다.

1. **task 이름 `.`·`..`** — `^[\w.-]+$` 를 통과하지만 경로 세그먼트로서 깊이를 바꾼다. 재현(2026-09-25): 빈 `docs/` 에서
   `task .. --member u` → `created: docs/u/../`, `docs/..-spec.md` 등 6파일이 `docs/` 바로 아래 생기고 active 가 `u/..` 를 가리킨다.
   (`docs/` 가 비어 있지 않으면 기존 "task 가 아닌 디렉터리" 가드가 막는다.) → 두 이름을 쓰기 전에 거부.
2. **`readRemoteTaskMeta` 의 ref 모호성** — `git show origin/main:<path>` 의 짧은 이름은 같은 이름의 로컬 브랜치
   `refs/heads/origin/main` 으로 먼저 풀린다. 그 경우 done-on-main 판정(session-context·doctor·task)이 엉뚱한 트리를 읽는다.
   #102 가 `list --remote` 에서만 전체 ref 로 고쳤다 → 여기도 `refs/remotes/<ref>` 로 읽는다. 반환 `ref` 표시는 그대로.

## 설계 / 접근

- `runTask` 이름 검사에 `name === '.' || name === '..'` 추가, 사유 문구 분기. 선행 `.` 전체를 막지는 않는다 — `.foo` 는
  한 세그먼트라 경로를 바꾸지 않고, 기존 task 활성화를 깨지 않는다.
- `readRemoteTaskMeta` 의 `git show` 인자만 `refs/remotes/${ref}:…` 로. `resolveDefaultRef` 반환값(표시용 `origin/main`)은 불변.

## Ontology
*이 task가 다루는 핵심 개념의 정의. "X가 정확히 뭔가?"에 답한다.*

- **경로 세그먼트 이름**: `docs/<user>/<task>/` 에 들어가 디렉터리 하나가 되는 문자열. `.`·`..` 은 문자 규칙과 무관하게 세그먼트가 아니다.
- **전체 ref**: `refs/remotes/origin/main` — 로컬 브랜치 이름과 겹치지 않는 원격 추적 ref.
- 게이트 근거: 두 건 모두 재현 테스트로 확정(원 코드 red 3건), 범위는 한 줄 수정씩.

## Ambiguity 자가진단
*각 항목이 명확하면 체크. 3개 이상 미체크면 구현 진입 금지 — 인터뷰/브레인스토밍으로 복귀해
모호성을 제거한다. 게이트를 통과하면 그 근거를 위 Ontology 섹션에 한 줄로 남긴다.*

- [x] **Goal 명확도** (40%) — 목표가 한 문장으로 구체화되었는가?
- [x] **Constraint 명확도** (30%) — 기술/시간/범위 제약이 명시되었는가?
- [x] **Success 기준** (30%) — 완료를 어떻게 측정하는가? (재현 테스트 3건 green, 기존 스위트 green)
- [x] **Context 명확도** (brownfield 한정) — 영향 받는 기존 코드/파일을 식별했는가? (`task.mjs` runTask 이름 검사, `remote-task.mjs` readRemoteTaskMeta)
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

-

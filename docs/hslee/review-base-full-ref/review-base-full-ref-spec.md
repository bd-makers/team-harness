# review-base-full-ref — Spec

## 목적 / 요구사항
*문제(오늘 무엇이 안 되는가) → 영향받는 사용자·시스템 → 기대 결과 → 제약 순으로 쓴다.
답 없는 질문은 요구가 아니다 — `## 참고` 절에 `- (open) …`으로 남긴다.*

- **문제**: `review`·`scope` 의 base 추론(`resolveScope`)이 후보 `origin/HEAD`→`origin/main`→`origin/master` 를 **짧은 이름**으로
  검증·사용한다. 로컬 브랜치 `refs/heads/origin/main` 이 있으면 git 은 그쪽을 먼저 풀어, diff 범위가 틀어지거나 비어
  "리뷰할 것 없음" 이 된다(테스트로 재현). base 는 프롬프트로 리뷰어에게도 넘어가 리뷰어의 `git diff` 도 같은 모호성을 탄다.
  `resolveDefaultRef` 의 `origin/main` 폴백 검증도 짧은 이름이다. 출처: #103 claude 리뷰 P3-2(후속 후보).
- **기대 결과**: 추론한 base 는 `refs/remotes/origin/<branch>`. 명시한 `--base` 와 origin 없는 저장소의 `main` 폴백은 불변.
- **제약**: 출력의 base 문자열이 전체 이름으로 바뀐다(표시 변화) — 짧은 이름을 단정하던 테스트 4곳을 갱신한다.

## 설계 / 접근

- `resolveScope` 의 origin 후보를 `refs/remotes/${ref}` 로 매핑(없는 후보 null 유지). 판정·diff·프롬프트가 같은 값을 쓴다.
- `resolveDefaultRef` 폴백의 `rev-parse --verify` 인자만 `refs/remotes/origin/main` 으로. 반환값(`origin/main`)은 불변 —
  소비자(`readRemoteTaskMeta`·`listBranchOnlyTasks`)가 이미 앞에 `refs/remotes/` 를 붙인다.

## Ontology
*이 task가 다루는 핵심 개념의 정의. "X가 정확히 뭔가?"에 답한다.*

- **추론 base**: `--base` 없이 `resolveScope` 가 고른 브랜치 diff 기준. 명시 base 와 구분된다.
- **전체 ref**: `refs/remotes/origin/<branch>` — 로컬 브랜치 이름과 겹치지 않는다.
- 게이트 근거: 재현 테스트 red 확인, 범위는 두 함수의 ref 표기.

## Ambiguity 자가진단
*각 항목이 명확하면 체크. 3개 이상 미체크면 구현 진입 금지 — 인터뷰/브레인스토밍으로 복귀해
모호성을 제거한다. 게이트를 통과하면 그 근거를 위 Ontology 섹션에 한 줄로 남긴다.*

- [x] **Goal 명확도** (40%) — 목표가 한 문장으로 구체화되었는가?
- [x] **Constraint 명확도** (30%) — 기술/시간/범위 제약이 명시되었는가?
- [x] **Success 기준** (30%) — 완료를 어떻게 측정하는가? (재현 테스트 green, 기존 스위트 green)
- [x] **Context 명확도** (brownfield 한정) — 영향 받는 기존 코드/파일을 식별했는가? (`review.mjs` resolveScope, `remote-task.mjs` resolveDefaultRef)
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

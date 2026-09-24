# task-spec-marker — Spec

## 목적 / 요구사항
*문제(오늘 무엇이 안 되는가) → 영향받는 사용자·시스템 → 기대 결과 → 제약 순으로 쓴다.
답 없는 질문은 요구가 아니다 — `## 참고` 절에 `- (open) …`으로 남긴다.*


## 설계 / 접근

`runTask`에서 `dir` 계산 직후(원격 done nudge·모든 쓰기 전) 판정한다.

| 상태 | 동작 |
|---|---|
| `<name>-spec.md` 있음 | 종전 활성화 분기 그대로(reopen·area 채택 포함) |
| 디렉터리 없음 또는 비어 있음 | 종전 생성 분기(scaffold) |
| spec 없음 + 내용물 있음(또는 디렉터리가 아닌 파일) | `emitTaskError` exit 1, 아무것도 쓰지 않음 |

- **spec만 잃은 task(다른 harness 파일은 남음)**: 거부한다. scaffold는 `writeText`로 plan·handoff·artifact를 템플릿으로
  덮어써 남은 기록을 지운다. 활성화하면 `list`와 다시 어긋난다. 복원 경로(`git log -- <spec>`)를 alternatives에 담는다.
  spec을 복원하면 종전대로 활성화된다.
- **pre-0.6 레거시 레이아웃**: 경로 자체가 다르고 `migrate`가 다룬다 — 이 판정과 무관.
- **빈 디렉터리**: 쓸 내용물이 없으므로 없는 것과 같게 보고 생성한다(종전엔 잘못 `activated:`였다).

## Ontology
*이 task가 다루는 핵심 개념의 정의. "X가 정확히 뭔가?"에 답한다.*

- **기존 task**: `docs/<user>/<name>/<name>-spec.md`가 있는 디렉터리 — `listTaskRefs`와 같은 정의. 디렉터리 존재만으로는 task가 아니다.
- **scaffold 가능 자리**: 없거나 비어 있는 디렉터리. 게이트 통과 근거: 문제·기대·제약이 R1과 재현 스크립트로 확정됨.

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

- 회귀 테스트: `tests/task-spec-marker.test.mjs` · 불변 보증: `tests/e2e/task-paths-golden.test.mjs`
- 판정 정본: `src/task-paths.mjs` `listTaskRefs` · 수정 위치: `src/commands/task.mjs` `runTask`
- 원 결함 기록: `docs/spec-monorepo-scope.md` §6 R1

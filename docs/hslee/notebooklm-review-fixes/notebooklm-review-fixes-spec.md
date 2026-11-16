# notebooklm-review-fixes — Spec

## 목적 / 요구사항

요청된 정정은 기존 팀 결정을 문서·출력과 일치시킨다. 모든 파일 변경은 크기와 무관하게 task로 진행하며, `task 없이 진행`은 파일 변경이 없는 질문·탐색·리뷰에만 허용한다. SessionStart task-gate는 선택을 안내하는 nudge로 유지한다. R3는 PR 전 권장이고 spec이 `review: required`를 선언하면 `done`에서 강제된다는 점을 사이클 문서에 명확히 쓴다.

요구 출처: [평가 보고서 §1.2](../harness-notebooklm-review.md#12-소유자-확인-요청), [QA 부록](../harness-notebooklm-review-qa.md). 결정 근거: `docs/decisions.md` D2, D11 및 2026-11-02 정정.

## 범위 (In / Out)

- **In**: AGENTS 지침·템플릿, session-context 출력, README·task guide·cycle 문서, 관련 테스트 fixture, CHANGELOG, 평가 보고서 §1.2 및 이 task 문서를 갱신한다.
- **Out**: `done` 가드의 R3 동작, loop step order, 평가 보고서의 다른 절·부록은 변경하지 않는다. 새 동작이나 결정 추가는 범위 밖이다.

## 원천 검토 (R1)

### 원천
- `docs/hslee/harness-notebooklm-review.md` §1.2 및 `docs/hslee/harness-notebooklm-review-qa.md`
- `docs/decisions.md` D2, D11 (2026-11-02 정정 포함)
- `src/commands/task.mjs`의 `review: required` 종결 가드

### 발견
- 문구만 결정과 어긋나며, 요구·구현 사이의 충돌은 없다. 별도 결정 없이 원문 정정으로 해결한다.

## 설계 / 접근

다섯 task-gate 위치를 같은 뜻으로 고치고 SessionStart 출력을 짧게 유지한다. cycle 문서의 표와 R3 설명에 권장/선언 조건을 반영하고 중요 변경 기준을 AGENTS 리뷰 기준에 연결한다. 관련 assertion과 fixture를 동기화한다.

## Ontology

- **task**: 코드나 문서 등 저장소 파일을 변경하는 모든 작업의 기록 단위이며, 변경 규모에 관계없이 사용한다.
- **task 없이 진행**: 저장소 파일을 바꾸지 않는 질문·탐색·리뷰 작업만 뜻한다.
- **R3**: PR 전 코드 리뷰 권고 지점이며, task spec이 `review: required`를 선언한 경우 `done` 가드가 강제한다.

## Ambiguity 자가진단

- [x] **Goal 명확도** — 요청된 두 문구 정정으로 한정했다.
- [x] **Constraint 명확도** — 지정 파일만 수정하며 block 동작이나 loop 순서는 변경하지 않는다.
- [x] **Success 기준** — 다섯 task-gate 안내, R3 두 문구, tests, docs:check 및 doctor를 확인한다.
- [x] **Context 명확도** — 변경 위치·테스트·가드 근거를 지정했다.
- [x] **Ambiguity ≤ 0.2** — 평가 보고서와 결정 로그가 선택을 명확히 정한다.

## 참고

- `docs/hslee/harness-notebooklm-review.md` §1.2
- `docs/hslee/harness-notebooklm-review-qa.md`
- `docs/decisions.md` D2, D11
- `src/commands/task.mjs`의 R3 종결 가드

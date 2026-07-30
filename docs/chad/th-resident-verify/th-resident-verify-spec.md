# th-resident-verify — Spec

## 목적 / 요구사항

- task 단계 사이에 생산자·소비자 JSON Schema 계약을 자동 대조한다.
- 판정은 Node 내장 모듈과 결정론적 코드만 사용한다. 외부 의존성·LLM 판정은 금지한다.
- 선언이 없는 기존 task는 `boundary: not-configured`으로 성공 처리한다.

## 설계 / 접근

- `harness-team boundary check`가 active task의 spec에서 `## Boundary contracts` 바로 아래 JSON fenced block 하나를 읽는다.
- 선언 형식은 `{ version: 1, boundaries: [{ id, producer: { path, pointer? }, consumer: { path, pointer? } }] }`다. path는 target root 안의 JSON Schema 파일이고 pointer는 optional JSON Pointer다.
- consumer required field가 producer properties/required에 없거나, 양쪽 basic type이 다르면 실패한다. 선택 필드·추가 필드·복합 schema는 V1 범위 밖이다.
- `boundary-checkpoint.sh`가 active plan의 Edit에서 `- [ ]`가 `- [x]`로 바뀌기 직전에 CLI를 실행하며, 실패면 exit 2로 편집을 막는다.
- hook은 기존 protect-files 다음으로 등록하고, apply/migrate의 customized-hook 보존 정책은 바꾸지 않는다.

## Ontology
*이 task가 다루는 핵심 개념의 정의. "X가 정확히 뭔가?"에 답한다.*

- **Boundary declaration**: task spec 안의 JSON fenced block. producer와 consumer schema 쌍을 명시하는 task SSOT의 일부다.
- **Producer guarantee**: producer schema의 properties에 존재하고 required에도 포함된 field. consumer가 안전하게 읽을 수 있는 값이다.
- **Boundary checkpoint**: plan checkbox를 완료로 바꾸기 전 선언된 boundary를 확인하는 Claude PreToolUse hook이다.

## Ambiguity 자가진단
*각 항목이 명확하면 체크. 3개 이상 미체크면 진입 금지(브레인스토밍으로 복귀).*

- [x] **Goal 명확도** (40%) — 목표가 한 문장으로 구체화되었는가?
- [x] **Constraint 명확도** (30%) — 기술/시간/범위 제약이 명시되었는가?
- [x] **Success 기준** (30%) — 완료를 어떻게 측정하는가?
- [x] **Context 명확도** (brownfield 한정) — 영향 받는 기존 코드/파일을 식별했는가?
- [x] **Ambiguity ≤ 0.2** — 위 항목 가중합 ≥ 0.8

## Boundary contracts

```json
{
  "version": 1,
  "boundaries": []
}
```

## 참고
-

# th-capsule-grammar — Spec

## 목적 / 요구사항

- TCC failure capsule에서 `####` 이하 ATX 제목은 capsule 본문으로 취급하고, `##` 이상의 절 제목만 capsule을 종결한다.
- 하위 제목만 있고 실질 본문이 없는 capsule은 unresolved 예산을 소비하지 않는다.
- fenced code block 첫 줄의 셸 주석(`# ...`)은 capsule을 종결하지 않는다.
- 위 두 판정을 함께 변경하고 각각 수정 전 실패/수정 후 통과 증거를 남긴다.
- 저장소의 기존 `*-context.md` 전부를 변경 전후 비교하고 판정 변화의 정당성을 파일별로 확인한다.
- 관련 회귀 테스트, 전체 테스트, `pre-commit-check.sh`를 통과한다.

## 설계 / 접근

- 현재 줄 단위 스캔 구조는 유지한다.
- capsule 종결자는 `#`/`##` 수준 ATX 제목으로 좁힌다. capsule 시작 표식인 `### F-*`는 기존처럼 먼저 처리한다.
- 내용 판정에서는 모든 ATX 제목 줄을 비내용으로 취급한다. 따라서 `#### Signal`은 capsule을 열어 둔 채 그 자체로 `filled`를 만들지 않는다.
- 외부 의존성은 추가하지 않는다. 반대되는 코드 계약이나 세 번째 독립 카운터 결함이 확인되면 구현을 확대하지 않고 `needs-decision`으로 보고한다.

## Ontology
*이 task가 다루는 핵심 개념의 정의. "X가 정확히 뭔가?"에 답한다.*

- **Failure capsule**: `### F-*`로 시작해 다음 capsule 또는 `#`/`##` 절 제목 직전까지 이어지는 TCC의 실패 기록 단위.
- **Capsule 종결자**: capsule 범위 밖의 진짜 절 구분인 `#` 또는 `##` 수준 ATX 제목. `####` 이하 하위 제목과 fenced code 내부의 `# ...` 줄은 종결자가 아니다.
- **실질 본문**: 공백, 비어 있는 목록 필드, ATX 제목 자체를 제외한 capsule 내용. 하나 이상 있을 때만 unresolved 예산을 소비한다.

## Ambiguity 자가진단
*각 항목이 명확하면 체크. 3개 이상 미체크면 진입 금지(브레인스토밍으로 복귀).*

- [x] **Goal 명확도** (40%) — 목표가 한 문장으로 구체화되었는가?
- [x] **Constraint 명확도** (30%) — 기술/시간/범위 제약이 명시되었는가?
- [x] **Success 기준** (30%) — 완료를 어떻게 측정하는가?
- [x] **Context 명확도** (brownfield 한정) — `src/commands/context.mjs`, `tests/context.test.mjs`, `AGENTS.md`, `templates/AGENTS.md.hbs`를 식별했다.
- [x] **Ambiguity ≤ 0.2** — 위 항목 가중합 ≥ 0.8

## 참고
- Firstmate brief `th-capsule-grammar` (2026-08-03)

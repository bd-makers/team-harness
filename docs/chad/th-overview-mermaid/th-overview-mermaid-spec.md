# th-overview-mermaid — Spec

## 목적 / 요구사항

- `docs/harness-overview.html`의 아키텍처 다이어그램, 명령 표, 파일 구조 표를 하나의 생성 단계에서 소스로부터 만든다.
- Mermaid 원본을 저장소에 보존하고 렌더링된 SVG를 사람이 직접 수정하지 않게 한다.
- 명령 표는 `commands/*.md`와 `.claude-plugin/plugin.json`, 파일 구조 표는 소스 트리를 기준으로 생성한다.
- 소스 변경이 산출물에 반영됨을 테스트로 입증하고 기존 전체 테스트 및 pre-commit 검증을 통과한다.

## 설계 / 접근

- 과거/현재 HTML과 문서 가드 테스트를 먼저 조사해 회수 범위와 생성 방식을 결정한다.
- 외부 의존성을 추가하지 않고 Node.js 표준 라이브러리 기반 생성기를 사용한다.
- PR #8의 "README에 수동 명령 목록을 복제하지 않는다"는 의도를 유지하면서 생성 산출물의 동기화를 검증한다.
- `harness-overview-*.html`과 `harness-workflow-simulation*.html`의 처리 범위를 조사 결과에 명시한다.

## Ontology
*이 task가 다루는 핵심 개념의 정의. "X가 정확히 뭔가?"에 답한다.*

- **생성 소스**: 사람이 수정하는 정규 입력. Mermaid 원본, command 문서/플러그인 manifest, 저장소 소스 트리다.
- **생성 산출물**: 생성기 실행으로 갱신되며 직접 편집하지 않는 `docs/harness-overview.html`이다.
- **문서 인벤토리**: command와 공개 파일 구조를 소스에서 파생해 HTML 표로 표현한 결과다.

## Ambiguity 자가진단
*각 항목이 명확하면 체크. 3개 이상 미체크면 진입 금지(브레인스토밍으로 복귀).*

- [x] **Goal 명확도** (40%) — 목표가 한 문장으로 구체화되었는가?
- [x] **Constraint 명확도** (30%) — 기술/시간/범위 제약이 명시되었는가?
- [x] **Success 기준** (30%) — 완료를 어떻게 측정하는가?
- [x] **Context 명확도** (brownfield 한정) — 영향 받는 기존 코드/파일을 식별했는가?
- [x] **Ambiguity ≤ 0.2** — 위 항목 가중합 ≥ 0.8

## 참고
- Firstmate launch brief의 Task/제약/완료 기준을 이 spec의 상위 요구사항으로 따른다.

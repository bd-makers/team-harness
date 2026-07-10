# update-comparison-html — Spec

## 목적 / 요구사항

- 기존 비교 자료 HTML에 최근 Codex wrapper skill 및 plugin cache refresh 작업 결과를 반영한다.
- 기존 Claude L5 / Codex L5 측정 수치는 변경하지 않고, Codex plugin surface 설명을 최신화한다.
- 새로 추가된 16개 command-equivalent `$harness-*` skill surface, 총 18개 installed skills, missing 0 검증을 문서에 넣는다.
- HTML 산출물은 기존 파일 `docs/chad/codex-l5-sim-plan/claude-vs-codex-l5-sim.html`을 갱신한다.

## 설계 / 접근

- header/meta와 핵심 결론에 wrapper skill/cache refresh 상태를 추가한다.
- plugin surface 비교표의 Codex 진입점과 사용자 호출 방식을 `$harness-aijient-team:harness-*` 기준으로 갱신한다.
- 별도 섹션으로 Codex Skill Surface 업데이트와 Cache Refresh 검증을 추가한다.
- L5 runner 결과 수치는 기존 시뮬레이션 증거이므로 유지한다.

## Ontology
*이 task가 다루는 핵심 개념의 정의. "X가 정확히 뭔가?"에 답한다.*

- **Comparison HTML**: Claude plugin과 Codex plugin의 host surface, L5 simulation 결과, 운영 판단을 한 화면에서 비교하는 문서.
- **Command-equivalent skill surface**: Claude `/harness-*` command와 대응되는 Codex `$harness-*` skill entry.
- **Cache refresh evidence**: installed cache에 `commands=16`, `skills=18`, `missing=[]`가 확인된 상태.

## Ambiguity 자가진단
*각 항목이 명확하면 체크. 3개 이상 미체크면 진입 금지(브레인스토밍으로 복귀).*

- [x] **Goal 명확도** (40%) — 목표가 한 문장으로 구체화되었는가?
- [x] **Constraint 명확도** (30%) — 기술/시간/범위 제약이 명시되었는가?
- [x] **Success 기준** (30%) — 완료를 어떻게 측정하는가?
- [x] **Context 명확도** (brownfield 한정) — 영향 받는 기존 코드/파일을 식별했는가?
- [x] **Ambiguity ≤ 0.2** — 위 항목 가중합 ≥ 0.8

## 참고
- `docs/chad/codex-l5-sim-plan/claude-vs-codex-l5-sim.html`
- `docs/chad/codex-wrapper-skills/`
- `docs/chad/codex-plugin-cache-refresh/`

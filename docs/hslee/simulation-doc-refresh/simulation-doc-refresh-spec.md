# simulation-doc-refresh — Spec

## 목적 / 요구사항
- 문제: `docs/harness-workflow-simulation.html`은 hero·🆕 배너·footer가 v0.40.0이고 본문 시나리오도 0.40.0 기준이다
  (현재 파일 = `-0.40.0.html` 스냅샷과 바이트 동일). 0.40.1~0.44.4 사이 워크스루 단계에 닿는 동작 변경(handoff sweep 규범,
  user handoff gitignore, 머지 후 종결 커밋 하나, member 우선순위, stack 고정, 관리 절 init 처방 등)이 반영돼 있지 않다.
  그래서 `scripts/docs-version-drift.mjs`의 `excludedCurrentDocuments`에 명시 제외돼 있다(`docs/followups.md` 10번).
- 영향: 이 문서를 워크스루로 읽는 팀원·소비자 — 틀린 절차(handoff 2파일 커밋, 종결 커밋 셋 등)를 따라 하게 된다.
- 기대 결과: 본문이 v0.44.4 현행 동작과 일치하고, 표지 셋이 package.json 버전과 같으며, docs:check가 이 문서를
  `currentVersionDocuments`로 검사한다. followups 10번은 지운다.
- 제약: 문서·스크립트 레지스트리만 바꾼다(제품 코드 변경 없음). 버전 범프 금지. 미래 버전 번호를 박지 않는다.
  확인 못 한 동작은 쓰지 않는다 — 대조표의 모든 반영 항목은 CHANGELOG + 소스/명령 문서로 확인한다.

## 설계 / 접근
- 0.40.1~0.44.4 CHANGELOG 항목을 시나리오(구조·S1~S7·명령 카드)에 매핑한 대조표를 artifact에 남긴다.
- 표지: hero 배지 `v0.44.4`, 최신 🆕 배너 `0.40.1–0.44.4` 묶음(상한 판정), footer `v0.44.4`.
- 본문은 필요한 단계만 고친다(시나리오 재설계 없음). 과거 🆕 배너는 이력이라 그대로 둔다.
- 레지스트리: `excludedCurrentDocuments`를 비우고 `currentVersionDocuments`에 `overviewMarkers`로 등록.
- 스냅샷은 만들지 않는다 — 0.40.0 상태는 `-0.40.0.html`이 이미 보존하고, 새 스냅샷은 릴리스 몫이다.

## Ontology
- **현행 문서**: `classifyDocument`가 `current`로 분류하는 docs/ 최상위 HTML — 표지 버전이 package.json과 같아야 한다.
- **표지 셋**: hero 배지(`tag-purple`)·최신 🆕 배너 상한·footer의 `v<버전>`.
- 게이트 근거: 목표·제약·완료 기준·영향 파일(문서 1·스크립트 1·followups·CHANGELOG)이 모두 확정됐다.

## Ambiguity 자가진단
- [x] **Goal 명확도** (40%) — 목표가 한 문장으로 구체화되었는가?
- [x] **Constraint 명확도** (30%) — 기술/시간/범위 제약이 명시되었는가?
- [x] **Success 기준** (30%) — 완료를 어떻게 측정하는가?
- [x] **Context 명확도** (brownfield 한정) — 영향 받는 기존 코드/파일을 식별했는가?
- [x] **Ambiguity ≤ 0.2** — 위 항목 가중합 ≥ 0.8

## Done evidence
```json
{ "version": 1, "review": "required", "tests": "skip" }
```

## 참고
- `scripts/docs-version-drift.mjs` · `tests/docs-version-drift*.test.mjs`
- `commands/harness-task.md` "post-commit handoff"·"머지 후 종결" 절 · `src/commands/task.mjs` (`runHandoffAuto`·`runDone`·`renderUserHandoff`)
- `docs/followups.md` 10번

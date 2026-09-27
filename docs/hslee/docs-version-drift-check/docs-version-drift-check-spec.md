# docs-version-drift-check — Spec

## 목적 / 요구사항
- 문제: docs의 HTML 문서 중 "현행"을 표방하는 문서의 버전 표지(hero 배지·🆕 배너·footer 등)가 `package.json` 버전과
  어긋나도 아무 가드가 없다. `docs:check`는 overview 생성본 바이트 대조뿐이라 green이어도 표지가 낡는다.
  실례: overview 배지 두 세대 지연(0.22.0·0.23.0), 시뮬레이션 footer v0.23.0 17릴리스 방치(09-19), 시뮬레이션 현재 v0.40.0.
- 영향: 문서 독자(소비자·유지보수자), 릴리스 절차 5단계.
- 기대 결과: 현행 문서의 버전 표지가 어긋나면 `npm run docs:check`가 실패한다. 새 문서가 현행인지 기준 문서인지 결정론적으로 갈린다.
- 제약: 새 의존성 금지, 기존 `docs:check`에 합류, 문서에 미래 버전 번호를 박지 않는다, 버전 범프 안 함.

## 설계 / 접근
- `scripts/docs-version-drift.mjs`: 분류기 + 등록 문서별 표지 정규식 + 명시 제외 목록. `generate-harness-overview.mjs --check`가 호출.
- 분류(docs/ 최상위 *.html, 첫 일치): snapshot(`-<ver>.html`) → baseline(버전 담은 hero 태그/footer 중 하나라도 "기준") →
  current(버전 담은 hero 태그/footer, "기준" 없음) → unversioned. current는 등록 또는 사유 있는 명시 제외가 필수.
  제외 항목이 current가 아니게 되면 낡은 제외로 실패.
- 등록: overview 템플릿·생성본(hero·최신 🆕 상한·footer), what-changes-latest-version(footer — title·dd는 기존 테스트 몫),
  index.html(what-changes 목록 첫 항목).
- 명시 제외: `harness-workflow-simulation.html` — 본문이 0.40.0 기준이라 표지만 고치면 거짓 도장. 오케스트레이터 결정 A(2026-09-27):
  본문 현행화는 후속 task, `docs/followups.md` 10번에 기록.
- 표지 옆 산문은 검사하지 않는다(사람이 쓴 `왜`).

## Ontology
- **현행 문서**: 분류 규칙상 current — 표지가 항상 현행 package.json 버전이어야 하는 문서.
- **기준 문서**: 표지에 "X 기준"을 달아 기준 버전을 스스로 밝힌 문서(guide류·diagrams·schematics). 검사 대상 아님.
- **표지(marker)**: 버전 번호를 캡처하는 문서별 정규식. 못 찾으면 실패(가드가 조용히 꺼지지 않게).
- 게이트 근거: 목표·제약·성공 기준·영향 파일 모두 위에 명시, 범위는 오케스트레이터가 확정.

## Ambiguity 자가진단
- [x] **Goal 명확도** (40%) — 목표가 한 문장으로 구체화되었는가?
- [x] **Constraint 명확도** (30%) — 기술/시간/범위 제약이 명시되었는가?
- [x] **Success 기준** (30%) — 완료를 어떻게 측정하는가?
- [x] **Context 명확도** (brownfield 한정) — 영향 받는 기존 코드/파일을 식별했는가?
- [x] **Ambiguity ≤ 0.2** — 위 항목 가중합 ≥ 0.8

## Done evidence
```json
{ "version": 1, "review": "required" }
```

## 참고
- `tests/docs-version-drift.test.mjs`, `scripts/docs-version-drift.mjs`, `tests/what-changes-latest-version.test.mjs`(선례)
- MAINTAINING.md 릴리스 절차 5단계

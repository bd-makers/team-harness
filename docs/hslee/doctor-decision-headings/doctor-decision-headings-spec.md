# doctor-decision-headings — Spec

## 목적 / 요구사항

`harness-team doctor`의 결정 로그 검사(`checkDecisionLog`)가 `docs/decisions.md`에서 `## D2`·`## D4`·`## D5`
세 절만 확인한다. D6(2026-08-26)·D7(2026-09-03)이 `templates/docs/decisions.md`와 AGENTS.md 코어 요약에
추가된 뒤에도 검사 목록은 갱신되지 않았다 — D6/D7 이전에 스캐폴드된 소비자 프로젝트는 코어가 가리키는
절이 없어도 doctor가 침묵한다(2026-09-05 PDF 6층 비교 분석에서 발견한 불일치).

요구사항:
1. `DECISION_HEADINGS`에 `## D6`·`## D7`을 추가해 누락 시 warn을 낸다.
2. 부재(파일 없음) 메시지가 나열하는 절 ID를 상수에서 파생해 같은 드리프트가 재발하지 않게 한다.
3. 기존 경고 형식·warn 수준·throw 금지 계약은 유지한다.

범위 제외: D-log 절 자동 병합(스캐폴드 skipExisting 정책 변경), 새 결정 추가, 다른 doctor 검사.

## 설계 / 접근

- `src/commands/doctor.mjs` `DECISION_HEADINGS = ['## D2','## D4','## D5','## D6','## D7']`.
- 부재 메시지의 `D2/D4/D5` 리터럴을 `DECISION_HEADINGS`에서 `## ` 접두를 벗긴 ID 목록으로 대체.
- TDD: `tests/doctor.test.mjs`에 "D2/D4/D5만 있는 구버전 로그 → D6, D7 누락 경고" 테스트를 먼저 추가하고
  기존 "일부 절 누락" 테스트의 기대 나열을 D6·D7까지 확장한 뒤 실패를 확인하고 구현한다.

## Ontology
*이 task가 다루는 핵심 개념의 정의. "X가 정확히 뭔가?"에 답한다.*

- **결정 로그(D-log)**: `docs/decisions.md`. 팀 규범의 전문·근거·이력 정본. 플러그인 상류 결정은 D2·D4·D5·D6·D7.
- **DECISION_HEADINGS**: doctor가 소비자 D-log에 존재를 요구하는 라인 앵커 헤딩 목록. 템플릿 D-log와 함께 움직여야 하는 계약
  (템플릿↔검사 계약 테스트가 이를 고정).
- **skipExisting 갭**: `init`은 기존 `docs/decisions.md`를 덮어쓰지 않으므로 새 절은 수동 병합만 가능 — doctor warn이 유일한 신호.
- 게이트 근거: 목표·제약·완료 기준·영향 파일(doctor.mjs 1곳, doctor.test.mjs 1곳, CHANGELOG)이 위에 모두 특정됨.

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

- `src/commands/doctor.mjs` `checkDecisionLog` / `DECISION_HEADINGS` (도입 커밋 f0c428f)
- `tests/doctor.test.mjs` `checkDecisionLog:*` 4건 (템플릿 계약·부재·부분 누락·디렉터리)
- `docs/decisions.md` D6·D7 절 (커밋 5b985d7, 58b2284)
- 발견 출처: `.claude/handoffs/2026-09-05-1330-harness-pdf-6layer-comparison.md` 권고 ⑤

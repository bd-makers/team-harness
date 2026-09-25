# agents-md-native — Spec

## 목적 / 요구사항
*문제(오늘 무엇이 안 되는가) → 영향받는 사용자·시스템 → 기대 결과 → 제약 순으로 쓴다.
답 없는 질문은 요구가 아니다 — `## 참고` 절에 `- (open) …`으로 남긴다.*

- **문제**: Claude Code 2.1.277부터 AGENTS.md를 네이티브로 읽는다. "CLAUDE.md를 없애도 되나"가 열린
  질문으로 남아 있고, `doctor`의 eager tier 주석은 2.1.251 기준 서술이라 AGENTS.md 네이티브 로드를
  고려하지 않은 것처럼 읽힌다.
- **영향**: 하네스 유지보수자(구조 결정의 근거), `doctor` eager tier 계산을 읽는 사람.
- **기대 결과**: `docs/decisions.md`에 D10(CLAUDE.md 유지 결정·근거·재검토 조건)이 있고, `doctor.mjs`
  주석이 2.1.277+ 동작에서도 합산이 맞는 이유를 설명하며 D10을 가리킨다.
- **제약**: 문서·주석 중심 — 계산 로직 변경 없음. 미검증 사실은 미검증으로 표시한다. 단 D-log 계약상
  `templates/docs/decisions.md`(레포본과 동일 pin)와 `doctor`의 `DECISION_HEADINGS`(드리프트 가드)에
  `## D10`을 함께 등록해야 한다 — D9 전례(86d14a0)와 같다. 그 결과 D10이 없는 소비자
  `docs/decisions.md`에 `doctor`가 warn 1건을 낸다.

## 설계 / 접근

- D10은 D9 형식(결정·왜·기각한 대안·재검토 조건·AGENTS.md 목록 제외 사유)을 따른다.
- 영향 범위 수치는 grep 실측으로 적는다(코드 경로 파일 수·테스트 참조 행 수, "약").
- `doctor.mjs`는 `EAGER_TIER_MAX_BYTES` 위 주석만 고친다. 계산 코드는 그대로다.
- AGENTS.md "결정 규범" 목록에는 넣지 않는다 — D9 전례(매 세션 규칙이 아닌 닫힌 결정).

## Ontology
*이 task가 다루는 핵심 개념의 정의. "X가 정확히 뭔가?"에 답한다.*

- **fallback 모드**: `instructionFiles=claude-md-or-agents-md`(기본). 프로젝트에 CLAUDE.md가 없을 때만
  AGENTS.md를 대신 로드한다.
- **eager tier**: 매 세션 시작 시 컨텍스트에 로드되는 지시 파일의 합(프로젝트 CLAUDE.md 2종 + @import된
  AGENTS.md + 사용자 CLAUDE.md). `doctor`가 24 KiB 예산으로 합산한다.
- 게이트 근거: 변경 대상 2파일·수치 출처·완료 기준(test·docs:check green)이 모두 명시돼 있다.

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

- `docs/decisions.md` D9(형식·AGENTS.md 목록 제외 전례), D10(이 task 산출물)
- `src/commands/doctor.mjs` — `EAGER_TIER_MAX_BYTES` 위 eager tier 주석

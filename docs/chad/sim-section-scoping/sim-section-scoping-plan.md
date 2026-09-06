# sim-section-scoping — Plan

## 목표

L5 sim 스코어러(`tests/sim/rules.mjs`)의 절 범위 절단을 레벨 인식으로 바꿔, 하위 제목을 둔 spec에서
나던 출처 태그 **위양성 FAIL**을 없앤다. 하네스 쪽은 무결하므로 건드리지 않는다.

## 단계

- [x] 원인 격리 — 헤드리스 transcript에서 두 시행(`spec-writer-1/2`)의 spec 원문을 꺼내
      `sectionBody` 로직을 그대로 재실행. 절 118 B/항목 0개 vs 972 B/항목 10개 확인
- [x] 하네스 무결 확인 — writer-2 문서의 목록 항목 41개, `### 요구사항` 안 출처 태그 정상.
      `commands/harness-spec.md`·`skills/harness-spec/SKILL.md` 전수 검색으로 제목 구조 규정 부재 확인
- [x] `sectionBody`를 레벨 인식으로 수정 — 매치 제목의 `#` 개수를 읽어 `\n#{1,level} `로 절단
- [x] 회귀 테스트 2건 추가 — ①`###` 하위 제목을 둔 요구사항 절이 본문에 포함(+ 같은 레벨의
      다음 절로는 새지 않는다는 경계) ②자가진단 절도 하위 제목 너머의 체크박스를 센다
- [x] 실측 재채점 — 저장된 실제 시행 원문을 수정된 `rules.mjs`로 채점: w2 FAIL→PASS,
      w1 PASS 불변, 자가진단 note 양쪽 3/5로 리포트 원값과 동일
- [x] 자매 하네스 전수 검색 — `codex-agentloop.mjs`·`skilltest.mjs`에 동일 절단 로직 없음
- [x] 필수 검증 3종 — `npm test`(fail 0, 이 파일 27→29) · `doctor` green · `docs:check` 최신
- [x] sim 리포트에 Phase 3 격리 판별 + 적용 결과 기록
      (`../harness-playground/sim-reports/agentloop-2026-09-07T0401.md`)
- [ ] 외부 read-only 리뷰(codex, D6) 실행 후 `artifact.md` `## Reviews`에 마커와 함께 기록
      — spec `## Done evidence`가 `review: required`라 이 단계 없이는 `done`이 막힌다

## Ontology 변경 로그
*개념이 새로 정의되거나 의미가 바뀌면 한 줄로 기록. spec.md의 Ontology 섹션을 갱신할 트리거가 된다.*

- **절 본문 (section body)** 의 정의가 바뀌었다 — "다음 `#{2,3}` 제목 직전까지" →
  "**같거나 더 높은 레벨의** 다음 제목 직전까지". 하위 제목은 상위 절에 포함된다.
- **위양성 FAIL (sim 아티팩트)** 를 명시적 범주로 세웠다 — 하네스 결함과 구분해 리포트에 남긴다.

## 참고

- 소급 task다(작업 후 기록). 메모리 `retroactive-task-plan-precheck`에 따라 **이 커밋 안에 실제로
  있는 단계만** 체크했다 — 외부 리뷰는 미실행이라 열어 뒀다.
- 다이어그램은 생성 시 옵트인에서 "아니오"를 골랐다 — 함수 하나짜리 절단 범위 변경이라
  구조도가 설명할 관계·흐름이 없다.

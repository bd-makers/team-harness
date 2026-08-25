# done-guard-window — Plan

## 목표
`done` 가드의 판정 창을 "마지막 활성화"가 아니라 "task 작업 구간"으로 바꿔 오탐을 없애되,
가드가 막던 **망각**은 계속 잡게 한다.

## 단계
- [x] 오탐 실사례 확보 — `boundary-perf-invariant` 종결 시 가드 2건, 원인은 재활성화
- [x] 영향 범위 특정 — `collectDoneIssues()`의 `switchedAt` 의존 가드 3종(`:442`·`:474`·`:486`)
- [x] 문제가 종결 케이스보다 넓음을 확인 — **task 전환 후 복귀만으로도** 창이 초기화된다
- [x] 설계 긴장 확인 — `tests/done-guard.test.mjs:461`이 "옛 마커 차단"을 의도로 고정
- [ ] **[결정] 창 기준 선택** — (A) `firstActivatedAt` 유력 · (B) `meta.created`는 날짜만이라 부적합
      · (D) task 디렉터리 첫 커밋 조합 검토 · 마이그레이션/하위 호환 설계 포함
- [ ] **재현 테스트 먼저 작성** — 재활성화 후 원래 창의 마커·커밋이 인정되는지 (지금은 실패해야 함)
- [ ] 구현 — 창 기준 교체 + 재활성화가 창 시작을 덮어쓰지 않게
- [ ] **회귀 확인** — `:461` 옛 마커 재사용 차단 테스트가 **계속 통과**하는지가 핵심 판정
- [ ] 하위 호환 — 새 필드 없는 기존 task는 degrade(차단하지 않음) 확인
- [ ] spec Ambiguity 게이트 닫고 artifact 기록
- [ ] 외부 리뷰(`/harness-review`) 후 `## Reviews` 기록 (spec이 `review: required`)

## Ontology 변경 로그
- **판정 창(evidence window)** 개념을 `switchedAt`과 분리해 신설. 둘을 같은 것으로 다룬 것이
  버그의 원인이며, 이 분리가 수정의 축이다.
- **가드 약화** 를 명시적 실패 양식으로 등재 — 오탐을 없애려다 진짜 누락까지 통과시키는 것.

## 참고
- 이 task는 **하네스 자신의 가드**를 고친다. 스스로를 검증하는 코드이므로 테스트 우선으로 간다.
- 우회 이력: 2026-08-25 `done --force` 1회 (사유는 boundary-perf-invariant artifact에 기록).

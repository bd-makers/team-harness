# handoff-hook-churn — Plan

## 목표
핸드오프 파일만 바꾼 커밋에 훅이 침묵하게 해 churn 루프를 끊는다. patch 0.38.1로 발행한다.

## 단계
- [x] `handoffRelPaths(user, task)`를 `task.mjs`에서 export하고 `collectDoneIssues`가 그것을 쓰게 한다 (동작 동일)
- [x] `runHandoffAuto`에 skip 판정 추가 — 부모 2개 이상이면 기록, 경로 비었으면 기록, 전부 핸드오프면 건너뜀
- [x] git 실패 시 종전대로 기록(판정 불가 ≠ 건너뜀)
- [x] 테스트: 핸드오프만 바뀐 커밋 → 파일 불변 / 소스+핸드오프 → 기록 / 병합 커밋 → 기록 / 빈 커밋 → 기록
- [x] `npm run test` 전체 통과
- [x] codex 리뷰 3회 → P2 4건·P3 4건 판별·수정 → 3차 APPROVE, artifact 기록
- [ ] 릴리스 문서(what-changes-0.38.1 · overview 템플릿 3곳 · index · CHANGELOG) → `release 0.38.1` → 단일 커밋
- [ ] push · 태그 v0.38.1 · clone 갱신 (사용자 승인 후)

## Ontology 변경 로그
- 2026-09-11 **sweep 커밋**: 직전 커밋의 churn만 담는 커밋 — 이 수정 뒤 훅이 침묵하는 지점으로 정의됨.

## 참고
- spec의 "범위 밖": amend 중복 항목은 후속 후보다. 휴리스틱으로 대충 고치면 진짜 항목을 지운다.

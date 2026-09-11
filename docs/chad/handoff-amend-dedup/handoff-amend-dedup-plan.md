# handoff-amend-dedup — Plan

## 목표
amend가 남기던 고아 항목을 없앤다 — 두 조건(reflog 주제가 `commit (amend)` · 마지막 항목의 sha가 `HEAD@{1}`과 일치)이 모두 참일 때만 교체.

## 단계
- [x] `runHandoffAuto`에 amend 교체 로직 — reflog 판별 + 마지막 항목 sha와 `HEAD@{1}` 동일성 대조 + 잘라내기
- [x] 판정 불가(git·reflog·파싱 실패)는 append로 degrade
- [x] 테스트: amend 교체 / 일반 커밋 append / 병합 append / 직전 커밋이 skip이면 보존 / reflog 판정 불가 append
- [x] `npm run test` 전체 통과
- [x] codex 리뷰 3회 → P1 1·P2 3·P3 2 판별·수정 → artifact 기록
- [x] `docs/followups.md`에서 9번 삭제(번호 유지)
- [x] 릴리스 문서 → `release 0.38.2` → 단일 커밋(22f03cb) → push·태그 v0.38.2·clone 갱신

## Ontology 변경 로그
- 2026-09-12 **amend 교체** · **고아 항목** 신설.
- 2026-09-12 **교체 근거**: "이력에 없음(ancestor 실패)" → **`HEAD@{1}` 동일성**으로 정정 (codex P1).

## 참고
- reflog 형식은 2026-09-12 실측으로 확인했다(spec 설계 절).

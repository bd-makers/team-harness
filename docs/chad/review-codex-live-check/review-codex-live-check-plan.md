# review-codex-live-check — Plan

## 목표
0.37.0 `harness-team review` codex 엔진 경로를 이 머신에서 1회 실측해 (a) stdin 닫힘 (b) 증거 기록 (c) 16 KiB 절단 표기를 판정한다. 코드 변경 없음.

## 단계
- [x] `node bin/harness-team.mjs review codex --scope diff --base v0.36.0` 백그라운드 1회 실행 — 시작·종료 시각 기록
- [x] (a) 프로세스가 스스로 종료했는지·소요 시간을 artifact에 기록
- [x] (b) `meta.reviews[0]`·artifact 블록·마커의 `at`·`tip`·`outputBytes` 대조
- [x] (c) `outputBytes` vs 16384 — 초과면 절단 표기 두 곳 확인, 미도달이면 단위 테스트 커버로 갈음한다고 기록
- [x] codex 발견을 진짜 결함/오탐으로 판별해 artifact 블록 아래 산문으로 남긴다 (harness-review.md 4단계) — 수정은 범위 밖
- [x] `docs/followups.md`에서 1번 항목 제거
- [x] 실패 항목이 있으면 별도 task 이름과 patch 릴리스 필요 여부를 artifact에 남긴다 — 실패 없음, patch 불필요 (artifact ## 결과)

## Ontology 변경 로그
- (none)

## 참고
- spec의 판정 기준 표

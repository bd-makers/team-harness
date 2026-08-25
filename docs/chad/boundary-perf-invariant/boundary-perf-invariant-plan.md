# boundary-perf-invariant — Plan

## 목표
boundary perf 테스트를 **부하 불변** 측정으로 바꿔 CI flake를 없애되,
회귀 탐지력은 기존보다 **강화**한다.

## 단계
- [x] 브리프·테스트·CI 워크플로우 정독, 실패 assertion 특정 (`:110` 상대 예산)
- [x] 후보 (b) 검증 — `gh api .../jobs`로 러너 메타데이터 확인 → **hosted 러너, job별 독립 VM** → 기각
- [x] **수정 전** 로컬 재현: busy loop 16개(12코어) · 10회 → 4회 실패, 전부 `:110`
- [x] 동일 작업량 baseline 설계 — `boundary.mjs`의 I/O 패턴(stat→readFile→JSON.parse, 순차/동시) 미러링
- [x] delta vs ratio 비교 측정 → **ratio 채택**(부하 하 delta 3.6× 팽창 vs ratio 1.24× 팽창)
- [x] hook-shaped baseline 후보 측정 → **기각**(fork/exec 노이즈가 지배해 비율이 1 아래로 붕괴)
- [x] 예산 산정 — 부하 0/16/24/36 실측에서 cold 1.20–1.96 · checkpoint 2.19–3.65 → `3x` / `5x`
- [x] 모든 스폰 shape에 untimed warmup 추가 (절대 상한 자체의 flake 제거)
- [x] **수정 후** 동일 부하 반복 실행 — load 16 · 24 각 10회, load 36 8회 → **28/28 통과**
- [x] 회귀 탐지력 입증 — CPU burn 주입 mutation test로 신·구 가드 민감도 비교
- [x] 전체 스위트 통과 확인 (node 20 · 415 tests)
- [x] 전/후 `t.diagnostic` 수치를 artifact.md에 기록
- [x] 외부 read-only 리뷰 실행 및 artifact `## Reviews` 기록
- [x] PR 생성 및 CI 확인

## Ontology 변경 로그
- **equal-work baseline** 신설 — 기존 **spawn floor**를 assertion 분모 자리에서 밀어냈다.
  spawn floor는 진단 전용으로 강등(삭제 아님 — 옛 CI 메시지와의 대조 가치).
- **ratio budget** 신설 — 예산의 단위가 `ms`에서 `배수`로 바뀌었다.

## 참고
- 부하 재현 스크립트는 스크래치패드에만 두고 저장소에 커밋하지 않는다 (일회성 조사 도구).

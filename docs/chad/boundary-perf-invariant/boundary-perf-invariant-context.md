# boundary-perf-invariant — Context Card
<!-- working set only; UTF-8 <= 6 KiB, nonblank lines <= 100 -->

## Now
- Goal: boundary perf 테스트를 부하 불변 측정(비율 예산)으로 교체해 CI flake 제거, 회귀 탐지력은 강화.
- Current atomic step: 외부 read-only 리뷰 → PR 생성 → CI 확인.
- Stop / human-decision condition: 리뷰가 예산값(3x/5x) 또는 warmup 추가에 이의를 제기하면 사용자 판단.

## Constraints and settled decisions
- `max-parallel: 1` 는 **no-op** — hosted 러너는 matrix job마다 별도 VM (runner_name 상이). 되살리지 말 것.
- 예산은 차(ms)가 아니라 비(배수) — 감속계수가 소거되는 유일한 형태.
- hook 모양 baseline은 기각 — fork/exec 분산이 지배해 비율이 1 아래로 붕괴.
- 절대 상한 500/800ms 는 값 그대로 유지 (회귀 그물).
- min-of-N / median 재조합은 막다른 길 (지속 경합이라 전 샘플 오염).
- CI 로그는 프록시 403 — `gh run view --log-failed` 쓰지 말 것. 러너 메타는 `gh api .../jobs` 로 가능.

## JIT retrieval map
- Identifiers / symbols: `COLD_BUDGET`, `CHECKPOINT_BUDGET`, `baselineSource`, `runBoundaryCheck`
- Narrow globs: `tests/perf/boundary-checkpoint.test.mjs`, `src/commands/boundary.mjs`
- Read next: artifact.md 의 "예산 산정 근거" · "회귀 탐지력 입증" 표
- Verification command: `mise x node@20 -- node --test --test-concurrency=1 tests/perf/boundary-checkpoint.test.mjs`

## Failure capsules (max 3 unresolved)
- (none unresolved)

## Resume checklist
- 부하 재현은 스크래치패드 `with-load.sh` + `iterate.sh` (커밋 안 함). busy loop은 pidfile로 회수 —
  `trap EXIT` 불발로 16개가 살아남아 "무부하" 측정을 오염시킨 전례 있음.
- 전/후 비교는 반드시 **동일 N · 동일 반복 횟수**로.

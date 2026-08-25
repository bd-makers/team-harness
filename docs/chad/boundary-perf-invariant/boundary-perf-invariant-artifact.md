# boundary-perf-invariant — Artifact

## 결과 요약

`tests/perf/boundary-checkpoint.test.mjs`의 상대 예산을 **bare 스폰 대비 차(ms)** 에서
**동일 작업량 baseline 대비 비(배수)** 로 교체했다. 절대 상한(500/800ms)은 값 그대로 유지했다.
`src/` 변경 없음 — 테스트 파일 1개만 수정.

| | 수정 전 | 수정 후 |
|---|---|---|
| 부하 16 (12코어) 10회 | **6 PASS / 4 FAIL** | **10 PASS / 0 FAIL** |
| 부하 24 (12코어) 10회 | **6 PASS / 4 FAIL** | **10 PASS / 0 FAIL** |
| 부하 36 (12코어) 8회 | (미측정) | **8 PASS / 0 FAIL** |
| 회귀 탐지 임계 | +58ms 이상만 감지 | **+35ms 이상 감지 (더 민감)** |

부하는 `sh -c 'while :; do :; done'` busy loop을 N개 띄우고 3초 안정화 후
`mise x node@20 -- node --test --test-concurrency=1 <테스트파일>`을 반복 실행해 만들었다.
전/후 모두 **동일한 N과 동일한 반복 횟수**로 측정했다.

## 근본 원인

두 가지가 겹쳐 있었다.

**1. 상대 예산의 분모가 틀렸다 (주 원인).**
분모가 bare `node -e ''` 스폰이라 **스폰 비용 변동만** 상쇄한다. 부하에서는 CLI 본체 작업
(20 × 10KiB read+parse + ~20개 모듈 그래프 로드)도 같이 느려지는데, 그 작업량 비례 지연은
분모가 흡수하지 못한다. 실측: `cold - spawnFloor`가 무부하 9.9ms → 부하 35.6ms로 **3.6배 팽창**.

**2. CLI warmup이 없어 절대 상한 자체가 flake였다 (부수 원인).**
기존 테스트는 bare 스폰만 untimed warmup 했다. 부하 중 **첫** cold 샘플이 453–541ms로 튀는데
(정상 상태 60–90ms), 아래 수정 전 로그의 iteration 9는 `541.3ms`로 **500ms 절대 상한을 이미
초과**했다. 상대 예산이 먼저 실패해 가려졌을 뿐이다.

## 기각한 후보 — `max-parallel: 1` (원 메모의 유력 후보)

원 메모는 "matrix 두 job 동시 실행에 따른 러너 자원 경합"으로 추정했다. **측정 결과 사실이 아니다.**
GitHub Actions REST API로 러너 메타데이터를 받아 확인했다 (로그 blob은 프록시 403이지만 JSON API는 열려 있다):

```
$ gh api repos/bd-makers/team-harness/actions/runs/32802292903/jobs \
    --jq '.jobs[] | {name, conclusion, runner_name, runner_group_name}'
{"name":"test (20)","conclusion":"failure","runner_name":"GitHub Actions 1000000304","runner_group_name":"GitHub Actions"}
{"name":"test (18)","conclusion":"success","runner_name":"GitHub Actions 1000000305","runner_group_name":"GitHub Actions"}
```

두 job은 **서로 다른 hosted 러너 VM**에서 돈다. 하드웨어를 공유하지 않으므로 직렬화는 **no-op**이다.
실패 job이 `test (18)` ↔ `test (20)`을 번갈아 오간 관측도 상호 경합보다 **VM별 독립 노이즈**에 부합한다.
진짜 부하원은 hosted 러너(2 vCPU)가 올라탄 물리 호스트의 noisy neighbour이며 **제거 불가**다.
따라서 (c) skip도 불필요해졌다 — (a)가 성립하기 때문이다.

## 왜 차(delta)가 아니라 비(ratio)인가

CPU starvation 하에서 wall time ≈ 작업량 × 감속계수 `s`:

- 차: `(W_cold − W_base) × s` → **`s`가 그대로 남는다**
- 비: `(W_cold·s) / (W_base·s)` = `W_cold / W_base` → **`s`가 소거된다**

실측으로 확인 (부하 0 / 16 / 24 / 36):

| 통계량 | 무부하 | 부하 16 | 부하 24 | 부하 36 | 팽창 |
|---|---|---|---|---|---|
| `cold − spawnFloor` (구) | 9.9ms | 최대 35.6ms | — | — | **3.6×** |
| `cold / baseline` (신) | 1.43 | 1.22–1.96 | 1.33–1.49 | 1.20–1.63 | **1.24×** |

부하를 16 → 24 → 36으로 3배까지 올려도 비율이 **더 나빠지지 않았다.** 부하 불변성이 실제로 성립한다.

### 기각한 변형 — hook 모양 baseline

checkpoint 쪽도 `sh` + `exec`까지 흉내낸 baseline을 만들어 봤으나 **기각**했다.
fork/exec 비용이 baseline을 지배하면서 분산이 폭발했고(부하 중 44–192ms), 비율이
0.89–1.51로 요동치며 **1 아래로 떨어져 assertion이 공허해지는** 구간이 나왔다 —
브리프가 경고한 바로 그 함정이다. checkpoint도 같은 equal-work baseline에 대고 재되
예산만 다르게(`5x`) 두는 쪽이 안정적이었다.

## 예산 산정 근거

무부하 실측 `cold/baseline ≈ 1.43`, `checkpoint/baseline ≈ 1.71`.
부하 0/16/24/36의 **28회 실행 전체**에서 관측된 최댓값은 cold **1.96**, checkpoint **3.65**.
여기에 여유를 둬 `COLD_BUDGET = 3`, `CHECKPOINT_BUDGET = 5`로 정했다.

이 값은 **기존보다 느슨하지 않다.** 절대 ms로 환산하면(baseline 22.5ms 기준):

| | 기존 예산 | 실측 비용 | 여유 | 신규 예산 | 여유 |
|---|---|---|---|---|---|
| cold | +75ms | +11ms | 6.8× | 3x → +45ms | **4.1×** |
| checkpoint | +150ms | +15.5ms | 9.7× | 5x → +90ms | **5.8×** |

## 회귀 탐지력 입증 (mutation test)

`runBoundaryCheck` 진입부에 정확한 CPU burn을 주입하고 신·구 가드를 **같은 조건에서** 비교했다.
`FAIL` = 회귀를 잡음(원하는 결과).

| 주입 | 신규 가드 | 구 가드 |
|---|---|---|
| +20ms | PASS (cold 53.3ms = 2.29x) | PASS (floor 17.5 / cold 53.9) |
| +30ms | PASS (cold 64.3ms = 2.78x) | PASS (floor 17.0 / cold 62.2) |
| **+40ms** | **FAIL ✅** (cold 73.8ms = 3.18x) | PASS ❌ (floor 17.5 / cold 73.8) |
| **+50ms** | **FAIL ✅** (cold 84.4ms = 3.68x) | PASS ❌ (floor 17.4 / cold 84.5) |
| +60ms | FAIL ✅ (cold 93.4ms = 4.13x) | FAIL ✅ (floor 17.1 / cold 94.2) |
| +70ms | FAIL ✅ (cold 103.1ms = 4.50x) | FAIL ✅ (floor 17.4 / cold 104.2) |

**신규 가드는 +40/+50ms 회귀를 잡고 구 가드는 놓친다.** 탐지 임계가 +58ms → +35ms로 내려갔다.
"green 될 때까지 경계를 푼" 것이 아니라 **더 민감해졌다.**

(먼저 시도한 "스키마를 N번 반복 read+parse" 주입은 페이지 캐시 때문에 8배를 돌려도 +4.4ms에
그쳐 회귀 주입으로 부적합했다. 그래서 정확한 CPU burn으로 바꿨다.)

## t.diagnostic 원본 — 수정 전 (부하 16, 10회 중 4회 실패)

```
spawn floor 35.8ms (43.1, 27.2, 30.4, 35.8, 45.0, 23.8); cold 99.0ms (453.3, 75.2, 99.0); checkpoint 129.8ms (246.7, 129.8, 117.9)
spawn floor 33.3ms (23.2, 31.1, 33.3, 34.8, 35.1, 28.9); cold 86.6ms (306.4, 86.6, 74.5); checkpoint 152.0ms (152.0, 212.5, 132.9)
spawn floor 35.6ms (36.8, 30.4, 34.3, 35.6, 48.7, 26.1); cold 126.1ms (376.0, 126.1, 83.6); checkpoint 161.5ms (241.3, 157.1, 161.5)
spawn floor 27.9ms (33.5, 31.3, 26.5, 27.9, 21.4, 22.5); cold 59.7ms (59.7, 105.9, 57.2); checkpoint 109.4ms (131.8, 109.4, 94.7)
spawn floor 35.2ms (25.4, 28.9, 39.0, 35.2, 37.0, 26.0); cold 75.1ms (314.3, 75.1, 68.8); checkpoint 115.4ms (165.8, 75.2, 115.4)
spawn floor 31.6ms (27.5, 24.2, 37.0, 33.1, 30.2, 31.6); cold 80.6ms (476.6, 56.3, 80.6); checkpoint 143.9ms (242.4, 101.5, 143.9)
spawn floor 34.2ms (31.6, 34.2, 26.9, 28.7, 36.7, 36.3); cold 139.9ms (139.9, 61.5, 164.9); checkpoint 130.8ms (130.8, 125.8, 157.1)
spawn floor 30.0ms (19.6, 30.0, 33.1, 23.1, 27.6, 49.4); cold 111.4ms (200.5, 75.8, 111.4); checkpoint 188.4ms (250.7, 188.4, 156.9)
spawn floor 31.0ms (41.4, 27.5, 31.0, 31.0, 29.6, 39.8); cold 143.8ms (541.3, 72.4, 143.8); checkpoint 149.3ms (223.4, 120.6, 149.3)
spawn floor 32.0ms (32.0, 35.2, 29.4, 27.3, 34.6, 28.9); cold 68.5ms (229.3, 68.5, 49.6); checkpoint 120.7ms (251.5, 120.7, 90.9)
```

실패 메시지 (4건 모두 `:110` 상대 cold 예산):

```
median cold boundary CLI cost 90.5ms over the 35.6ms spawn floor (limit: 75ms; cold samples: 376.0, 126.1, 83.6; bare samples: 36.8, 30.4, 34.3, 35.6, 48.7, 26.1)
median cold boundary CLI cost 105.7ms over the 34.2ms spawn floor (limit: 75ms; cold samples: 139.9, 61.5, 164.9; bare samples: 31.6, 34.2, 26.9, 28.7, 36.7, 36.3)
median cold boundary CLI cost 81.4ms over the 30.0ms spawn floor (limit: 75ms; cold samples: 200.5, 75.8, 111.4; bare samples: 19.6, 30.0, 33.1, 23.1, 27.6, 49.4)
median cold boundary CLI cost 112.8ms over the 31.0ms spawn floor (limit: 75ms; cold samples: 541.3, 72.4, 143.8; bare samples: 41.4, 27.5, 31.0, 31.0, 29.6, 39.8)
```

## t.diagnostic 원본 — 수정 후 (부하 16, 10회 전부 통과)

```
spawn floor 37.3ms (42.8, 37.3, 35.5, 27.8, 47.1); equal-work baseline 49.3ms (69.4, 48.8, 45.2, 49.3, 49.8); cold 83.0ms = 1.68x baseline (83.7, 83.0, 70.9, 70.4, 85.2); checkpoint 144.7ms = 2.94x baseline (144.7, 164.4, 72.7, 148.4, 129.5)
spawn floor 28.6ms (29.7, 24.9, 25.7, 34.6, 28.6); equal-work baseline 41.8ms (45.7, 41.1, 84.7, 41.8, 38.1); cold 72.6ms = 1.74x baseline (73.2, 64.4, 65.8, 97.4, 72.6); checkpoint 141.1ms = 3.38x baseline (151.2, 117.0, 161.3, 141.1, 115.8)
spawn floor 31.9ms (31.9, 40.9, 26.2, 42.7, 24.2); equal-work baseline 48.9ms (48.9, 118.9, 34.8, 63.0, 42.9); cold 83.6ms = 1.71x baseline (83.6, 95.1, 92.2, 83.1, 69.7); checkpoint 133.1ms = 2.72x baseline (167.7, 117.8, 106.7, 133.1, 134.4)
spawn floor 32.0ms (32.0, 27.2, 40.3, 36.8, 26.3); equal-work baseline 43.3ms (37.2, 62.0, 68.6, 37.4, 43.3); cold 75.5ms = 1.74x baseline (116.2, 55.2, 82.3, 75.5, 58.2); checkpoint 118.5ms = 2.74x baseline (165.6, 91.2, 151.8, 93.5, 118.5)
spawn floor 38.0ms (24.7, 39.1, 48.5, 34.1, 38.0); equal-work baseline 48.6ms (48.6, 58.6, 50.5, 35.5, 40.8); cold 77.5ms = 1.60x baseline (68.1, 82.5, 77.5, 70.7, 79.3); checkpoint 159.6ms = 3.29x baseline (159.6, 167.2, 184.3, 124.7, 153.6)
spawn floor 24.6ms (24.6, 19.3, 24.6, 36.8, 26.5); equal-work baseline 38.5ms (35.2, 38.5, 50.6, 33.3, 51.7); cold 66.8ms = 1.74x baseline (53.1, 73.2, 66.8, 62.8, 91.1); checkpoint 140.6ms = 3.65x baseline (103.0, 140.6, 153.0, 138.2, 175.3)
spawn floor 34.5ms (37.0, 23.8, 34.5, 35.0, 24.1); equal-work baseline 52.1ms (53.3, 38.9, 137.0, 52.1, 43.2); cold 71.4ms = 1.37x baseline (69.7, 54.9, 92.3, 71.4, 86.7); checkpoint 141.4ms = 2.72x baseline (141.4, 158.0, 129.6, 95.7, 171.2)
spawn floor 27.2ms (46.5, 31.4, 27.2, 26.9, 24.0); equal-work baseline 40.9ms (46.9, 35.0, 40.9, 65.5, 40.5); cold 65.1ms = 1.59x baseline (65.1, 63.8, 83.9, 78.2, 63.3); checkpoint 139.3ms = 3.41x baseline (148.0, 176.1, 139.3, 90.0, 86.5)
spawn floor 34.4ms (39.6, 27.5, 29.3, 34.4, 51.0); equal-work baseline 48.4ms (60.3, 45.1, 79.2, 48.4, 47.7); cold 79.3ms = 1.64x baseline (82.4, 79.3, 79.8, 59.0, 64.7); checkpoint 155.0ms = 3.21x baseline (155.0, 143.5, 163.1, 85.7, 179.7)
spawn floor 30.2ms (32.7, 27.9, 30.2, 33.4, 29.3); equal-work baseline 51.8ms (51.8, 51.8, 47.3, 39.5, 59.8); cold 73.5ms = 1.42x baseline (55.4, 100.5, 93.8, 73.5, 64.1); checkpoint 142.1ms = 2.75x baseline (189.8, 137.6, 142.1, 166.7, 129.1)
```

## t.diagnostic 원본 — 수정 후 (부하 24, 10회 전부 통과)

```
spawn floor 25.8ms (23.5, 33.1, 39.1, 24.0, 25.8); equal-work baseline 51.4ms (39.8, 54.5, 51.4, 45.0, 89.2); cold 78.6ms = 1.53x baseline (61.8, 145.1, 78.6, 67.9, 78.7); checkpoint 136.9ms = 2.66x baseline (135.6, 168.9, 138.9, 82.1, 136.9)
spawn floor 33.1ms (33.1, 29.8, 33.3, 31.2, 37.0); equal-work baseline 43.6ms (53.3, 39.8, 47.4, 36.0, 43.6); cold 71.6ms = 1.64x baseline (74.9, 71.6, 62.0, 62.3, 92.4); checkpoint 128.6ms = 2.95x baseline (141.8, 121.1, 79.7, 128.6, 183.9)
spawn floor 32.7ms (26.9, 32.7, 36.3, 38.2, 26.8); equal-work baseline 42.2ms (42.2, 45.2, 41.2, 37.4, 46.7); cold 66.2ms = 1.57x baseline (81.0, 53.7, 66.2, 63.0, 83.0); checkpoint 105.5ms = 2.50x baseline (118.9, 100.7, 105.5, 102.4, 165.4)
spawn floor 33.8ms (35.8, 33.8, 28.5, 23.1, 50.3); equal-work baseline 44.2ms (44.1, 44.2, 59.1, 43.7, 50.7); cold 72.7ms = 1.65x baseline (72.7, 85.9, 71.9, 59.8, 93.4); checkpoint 145.8ms = 3.30x baseline (104.9, 184.9, 145.8, 131.7, 170.3)
spawn floor 28.9ms (26.4, 28.9, 31.2, 27.2, 30.3); equal-work baseline 48.8ms (42.9, 45.5, 55.6, 58.6, 48.8); cold 77.2ms = 1.58x baseline (84.4, 62.9, 132.9, 66.0, 77.2); checkpoint 149.8ms = 3.07x baseline (93.3, 130.4, 167.3, 173.4, 149.8)
spawn floor 35.6ms (34.2, 40.2, 35.6, 28.2, 43.7); equal-work baseline 46.0ms (59.2, 65.4, 46.0, 37.3, 45.9); cold 80.7ms = 1.75x baseline (71.4, 98.3, 80.7, 79.7, 88.7); checkpoint 154.8ms = 3.37x baseline (159.3, 155.0, 153.2, 114.4, 154.8)
spawn floor 36.4ms (24.7, 29.7, 42.0, 36.4, 46.5); equal-work baseline 49.3ms (40.9, 57.2, 49.3, 47.0, 61.8); cold 74.2ms = 1.51x baseline (74.2, 68.5, 69.6, 76.3, 100.7); checkpoint 117.8ms = 2.39x baseline (117.8, 104.0, 88.8, 203.9, 123.5)
spawn floor 34.1ms (34.1, 33.7, 27.1, 34.2, 39.8); equal-work baseline 53.3ms (57.0, 50.3, 36.5, 53.3, 107.6); cold 74.3ms = 1.39x baseline (63.6, 80.5, 63.7, 74.3, 94.9); checkpoint 171.6ms = 3.22x baseline (171.6, 206.9, 169.9, 208.6, 152.6)
spawn floor 31.4ms (29.6, 21.7, 36.2, 43.0, 31.4); equal-work baseline 45.1ms (44.7, 45.1, 59.1, 38.4, 98.6); cold 70.4ms = 1.56x baseline (70.3, 70.4, 107.5, 60.7, 115.2); checkpoint 132.6ms = 2.94x baseline (148.2, 122.2, 132.6, 93.4, 225.8)
spawn floor 38.7ms (26.7, 41.8, 41.4, 29.6, 38.7); equal-work baseline 54.2ms (41.5, 46.5, 64.6, 54.2, 54.9); cold 103.4ms = 1.91x baseline (103.4, 79.3, 77.5, 116.3, 113.2); checkpoint 152.1ms = 2.81x baseline (155.7, 152.1, 118.5, 165.3, 120.0)
```

## t.diagnostic 원본 — 수정 후 (부하 36 = 3배 초과구독, 8회 전부 통과)

```
spawn floor 29.3ms (32.4, 33.5, 29.3, 28.3, 26.8); equal-work baseline 50.5ms (56.1, 53.0, 50.5, 38.3, 44.1); cold 75.5ms = 1.50x baseline (81.5, 75.5, 95.3, 59.3, 75.5); checkpoint 140.9ms = 2.79x baseline (140.9, 277.8, 128.5, 104.6, 153.5)
spawn floor 32.4ms (32.4, 30.9, 45.8, 31.8, 40.7); equal-work baseline 53.9ms (53.9, 55.0, 45.7, 60.4, 47.1); cold 67.0ms = 1.24x baseline (94.1, 60.8, 107.5, 60.7, 67.0); checkpoint 118.1ms = 2.19x baseline (126.5, 109.0, 107.9, 134.7, 118.1)
spawn floor 34.3ms (28.4, 33.0, 34.3, 44.3, 37.7); equal-work baseline 59.5ms (66.1, 117.8, 54.1, 59.5, 53.9); cold 73.6ms = 1.24x baseline (67.6, 88.1, 73.6, 57.7, 85.5); checkpoint 170.0ms = 2.86x baseline (177.2, 134.3, 170.0, 166.7, 195.4)
spawn floor 26.4ms (26.1, 23.2, 36.4, 33.9, 26.4); equal-work baseline 57.2ms (59.6, 56.1, 57.2, 118.7, 30.3); cold 85.3ms = 1.49x baseline (70.0, 84.8, 85.3, 143.3, 127.7); checkpoint 167.0ms = 2.92x baseline (167.0, 108.1, 157.6, 167.6, 234.8)
spawn floor 25.8ms (37.1, 25.8, 24.4, 37.3, 23.9); equal-work baseline 47.9ms (39.1, 57.3, 43.1, 118.6, 47.9); cold 78.0ms = 1.63x baseline (66.9, 71.2, 104.6, 78.0, 113.0); checkpoint 171.6ms = 3.59x baseline (107.6, 216.3, 171.6, 177.5, 142.1)
spawn floor 33.5ms (33.5, 26.3, 45.2, 31.9, 38.4); equal-work baseline 65.9ms (65.9, 39.2, 93.5, 76.4, 42.6); cold 79.2ms = 1.20x baseline (91.2, 68.2, 79.2, 77.4, 93.5); checkpoint 159.1ms = 2.41x baseline (169.8, 125.8, 159.1, 146.9, 179.3)
spawn floor 28.1ms (28.1, 37.0, 25.3, 33.5, 22.0); equal-work baseline 45.7ms (45.7, 40.4, 48.5, 47.5, 42.9); cold 63.4ms = 1.39x baseline (62.4, 63.4, 76.0, 71.7, 57.9); checkpoint 117.2ms = 2.56x baseline (119.1, 117.2, 90.1, 154.3, 91.9)
spawn floor 28.9ms (25.5, 28.9, 25.5, 29.7, 37.2); equal-work baseline 44.1ms (64.6, 40.1, 36.2, 51.0, 44.1); cold 62.3ms = 1.41x baseline (58.5, 59.1, 64.3, 92.8, 62.3); checkpoint 119.5ms = 2.71x baseline (121.9, 119.5, 93.8, 210.0, 99.0)
```

## 검증

- `mise x node@20 -- npm test` → **415 tests, 0 fail** (1 skipped, 기존부터 skip)
- node 24에서도 통과. 다만 checkpoint 비율이 무부하에서도 **3.07**까지 올라간다
  (node 20은 1.68). 아래 "node 24 이상치" 참조.
- **node 18은 이 머신에서 실행할 수 없다** — 설치 불가(프록시가 `nodejs.org` 차단),
  docker 미설치, 로컬에 어떤 node 18 바이너리도 없다. 대신 **CI 자체를 계측해서 수치를 받아냈다**
  (아래 "CI 실측" 참조). 결과적으로 node 18 공백은 메워졌다.

### node 24 이상치 — 추정을 세우고, 측정으로 뒤집었다

처음에 "mise shim 때문"이라고 적었다. **틀렸다 — 측정으로 반증했다.**
두 버전 모두 shim이 아닌 실제 바이너리를 쓴다
(`installs/node/20/bin/node`, `installs/node/24/bin/node`).

비용을 분해했다 (무부하, 중앙값):

| 구간 | node 20 | node 24 |
|---|---|---|
| stdin 읽기 (`ckDirect − cold`) | 1.9ms | 4.0ms |
| **sh + exec (`ck − ckDirect`)** | **4.4ms** | **70.2ms** |

70ms는 전부 `sh HOOK` → `exec` 구간이다. 그런데 같은 경로를 `--version`으로 재면
node 24에서도 오버헤드가 **거의 0**이다(`sh -c exec node BIN` 49ms vs
`sh -c exec BIN` 46ms). 즉 shebang 해석도, `sh` 스폰도, PATH 탐색도 원인이 아니다.
남는 유일한 차이는 **파이프 stdin을 `sh`를 거쳐 상속받았을 때의 처리**이며,
node 24에서만 ~70ms가 붙는다. (`boundary checkpoint`는 stdin을 읽지만 `--version`은 읽지 않는다.)

이것은 테스트가 아니라 **배포되는 hook 자체의 관측**이다 — node 24 + macOS에서
checkpoint hook은 직접 호출(60ms) 대비 sh 경유(130ms)로 2배 이상 비싸다.
이번 PR 범위 밖이라 고치지 않았고, 후속 후보로 남긴다.

## 남은 리스크 / 후속 후보

- **CI green은 필요조건일 뿐 충분조건이 아니다.** 관측된 flake 빈도에서 green 1회는 증거가 되지
  못한다. 진짜 증거는 위 부하 재현 수치다. green을 기다리며 재실행하는 방식으로 검증하지 말 것.
- **node 18 리스크는 해소됐다** (CI 실측으로). 예산을 선제적으로 올리지 않은 판단이 옳았다 —
  실측 결과 node 18 checkpoint는 **1.74x**로 예산 5x 대비 2.9배 여유다.
- **checkpoint 예산의 민감도는 이 mutation table로 검증되지 않았다.** cold assertion이 먼저
  발화해 중단되므로 표의 수치는 전부 cold 기준이다. checkpoint가 독립적으로 커버하는 것은
  **hook dispatch 경로뿐**이며, `runBoundaryCheck` 내부의 회귀는 cold(+35ms 해상도)가
  전부 지배한다. 따라서 필요 시 `CHECKPOINT_BUDGET`을 올리는 비용은 실질 커버리지 기준으로 매우 낮다.
- 부하 재현 스크립트는 스크래치패드에만 두고 커밋하지 않았다. busy loop은 반드시 pidfile로
  회수할 것 — 조사 중 `trap EXIT`가 불발해 16개가 살아남아 "무부하" 측정을 오염시킨 적이 있다
  (load average 104에서 잰 값을 무부하로 착각했다).

## CI 실측 — 로그 없이 수치를 받아내는 법

이 저장소를 유지보수하는 머신은 raw CI 로그를 받을 수 없다(`*.blob.core.windows.net` 403).
그래서 **workflow가 테스트 출력을 annotation으로 되돌리도록** 계측했다 —
annotations REST API는 프록시를 통과한다. perf 진단은 실패 시가 아니라 **매 실행마다** 남긴다.
타이밍 flake에서 정작 필요한 신호는 **통과한 실행의 수치**이기 때문이다.

```
$ gh api repos/bd-makers/team-harness/check-runs/<job_id>/annotations
```

실제 hosted 러너(2 vCPU, Linux)에서 받은 값:

| job | spawn floor | baseline | cold | checkpoint |
|---|---|---|---|---|
| **test (18)** | 24.0ms | 40.6ms | 67.6ms = **1.66x** | 70.6ms = **1.74x** |
| **test (20)** | 19.7ms | 30.1ms | 49.0ms = **1.63x** | 52.3ms = **1.74x** |

예산은 3x / 5x다. **두 버전 모두 여유가 크고 서로 거의 동일하다.**
특히 checkpoint가 node 18·20 모두 **1.74x**로 일치한다 — macOS + node 24에서 관측된 3.07은
**그 조합에 국한된 이상치**이며 CI에 전이되지 않음이 확인됐다. 이것이 "node 18에서도 비슷하면
예산을 넘을 수 있다"는 우려에 대한 답이다.

## 별건 발견 — node 18 `task-templates` deserialize flake (이 PR과 무관, 선재)

계측을 넣자마자 첫 실행에서 잡혔다:

```
not ok 38 - tests/task-templates.test.mjs
  error: 'Unable to deserialize cloned data due to invalid or unsupported version.'
```

- 이 브랜치가 건드리지 않은 파일이고, 자식 프로세스를 스폰하지도 않는다.
- **동일 코드**로 앞선 실행(af6ae4c7)은 두 job 모두 통과했다.
- 실패 job만 재실행하니 통과했다 → **전이성(transient)**.
- node:test 러너의 IPC V8 직렬화 경로에서 나는 오류로, node 18 런타임 쪽 문제다.

즉 "CI가 무작위로 빨개진다"에는 **최소 두 개의 서로 다른 원인**이 섞여 있었다.
이번 PR은 perf 쪽만 고친다. 이 건은 별도 추적 대상으로 남긴다 —
과거 실패율은 node 18 7/39 · node 20 7/40 으로 **버전 편향이 없다**(perf flake와 일치).

## Reviews

### 2026-08-25 — codex (read-only, `codex exec --sandbox read-only`)

**Scope:** `origin/main...HEAD` 브랜치 diff. Focus: equal-work baseline이 유효한 분모인가 ·
비율 예산(3x/5x)이 방어 가능한가 · warmup 추가가 회귀 탐지 커버리지를 지웠는가 ·
절대 상한이 여전히 의미 있는가.

**결과:** P1 없음 · **P2 1건** · P3 없음. 결론 "should-fix".

리뷰어가 확인해 준 것:
- equal-work baseline은 실제 `stat → read → parse` 순서와 병렬성을 재현하므로 **분모로 타당**하다.
- 3x/5x는 기록된 최악치 1.96x/3.65x에 기반해 **방어 가능**하다.
- 절대 상한은 warmup 이후의 지속적 심각 회귀에 대해 **의미가 남는다**.

**P2 (tests/perf/boundary-checkpoint.test.mjs:155)** — "모든 스폰 shape의 첫 호출을 무측정
warmup으로 버려, 깨끗한 캐시 상태에서만 나타나는 시작 회귀는 500/800ms 절대 상한을 포함해
더 이상 감지하지 못한다."

**판별: 부분 타당 — 지적한 커버리지는 실재했으나 실효가 없었다. 지적의 실행 가능한 절반만 반영.**

1. *커버리지는 명목상 존재했다.* 수정 전에는 cold/checkpoint의 첫 샘플이 `Math.max`에 포함됐다.
   (bare는 이미 warmup 되고 있었으므로 애초에 제외돼 있었다.)
2. *그러나 그 값은 구현이 아니라 환경을 재고 있었다.* 첫 cold 샘플은 무부하 ~36ms, 부하 중
   200–541ms로 관측됐다. **541.3ms는 500ms 상한을 이미 초과**했다 — 즉 이 커버리지는 회귀
   탐지기가 아니라 **flake 발생원**이었다. 36–541ms를 오가는 값으로는 진짜 회귀와 이웃
   노이즈를 구분할 수 없다.
3. *시작 회귀 탐지는 사라지지 않았다.* node는 **매 프로세스마다** 모듈 그래프를 다시 파싱·컴파일한다.
   실측으로 확인: warmup 이후 5개 샘플 전부에서 CLI의 baseline 대비 ~9ms 초과분이 유지된다
   (cold `36.1, 31.8, 37.2, 32.2, 31.6` vs baseline `24.7, 21.6, 23.8, 23.8, 20.9`).
   프로세스 간 캐시가 있었다면 첫 실행 이후 이 격차가 붕괴했어야 한다. 붕괴하지 않는다 —
   import 그래프가 무거워지는 회귀는 **모든 샘플에서 그대로 측정된다.**
   warmup이 버리는 것은 페이지 캐시 채우기와 코드 서명뿐이며, 이는 **머신의 속성이지 구현의 속성이 아니다.**
4. *리뷰어 제안 중 "첫 cold 실행에 완화된 별도 상한"은 채택하지 않았다.* flake 나지 않을
   만큼 느슨한 상한(부하 중 541ms 관측 → 1500ms 수준)은 정상 상태 비율 예산(**+35ms 해상도**)보다
   두 자릿수 배 둔감하다. 정상 상태 가드가 이를 **엄격히 지배(strictly dominate)** 하므로
   기계장치만 늘고 flake 표면이 하나 더 생긴다.
5. *리뷰어 제안 중 "테스트 명세를 steady-state로 명확히 분리"는 채택했다.* 정당한 지적이다 —
   "cold"가 *cold process*(매번 새 프로세스)를 뜻하는지 *cold cache*를 뜻하는지 모호했다. 조치:
   - 테스트 이름을 `steady-state cold-process check ...`로 변경.
   - warmup 주석에 **무엇을 왜 버리는지**와 위 3번의 측정 근거를 명시.

**조치 요약:** 코드 동작 변경 없음(명명·주석만). 리뷰 후 전체 스위트 재실행 통과.

<!-- harness:review kind=codex scope=diff tip=c1f4656 at=2026-08-25T05:35:00Z -->

## 종결 기록 (2026-08-25)

PR #44 머지 완료(merge commit `4b194e0`) 후 종결했다. plan 14/14.

**`done --force`를 쓴 이유 — 가드 2건은 재활성화로 생긴 오탐이었다.**
`done`은 활성 task만 대상으로 하므로, 이미 끝난 이 task를 종결하려면 **다시 활성화**해야 했다.
그런데 활성화가 `switchedAt`을 **현재 시각으로 갱신**하면서 가드의 판정 창이 초기화됐고,
그 결과 실제로는 충족된 두 조건이 미충족으로 보고됐다:

| 가드 | 보고 내용 | 실제 |
|---|---|---|
| 리뷰 마커 | "이 task 기간의 리뷰 마커가 없음" | 마커 `at=2026-08-25T05:35:00Z` 존재. **원래 창(활성화 04:25:13Z) 안**이며, 재활성화로 창이 09:19:47Z로 밀려 밖으로 나갔다 |
| 커밋 | "task 활성화 이후 커밋이 0개임" | 원래 창 안에 커밋 **6건**(`9414faf` … `f704672`), 전부 PR #44로 머지됨 |

즉 리뷰도 실행·기록됐고(codex, `## Reviews`) 작업도 커밋·머지됐다. 가드가 막으려는
"망각"은 발생하지 않았다. 두 사유가 오탐임을 커밋 로그·마커 타임스탬프로 확인한 뒤
`--force`로 진행했다. `--force` 사용 사실은 harness가 따로 기록하지 않으므로 여기에 남긴다.

**하네스 갭(후속 후보):** *끝난 task를 종결하려면 재활성화해야 하는데, 재활성화가 곧
가드 판정 창을 초기화한다.* 이 구조에서는 나중에 종결하는 task마다 같은 오탐이 재현되고,
습관적으로 `--force`를 쓰게 되어 가드가 무력화될 위험이 있다. 판정 창의 기준을
`switchedAt`이 아니라 task의 최초 생성 시각(`meta.created`)이나 마지막 종결 시도 이전의
활성 구간으로 잡는 편이 맞다. 이 task 범위 밖이라 구현하지 않고 후보로만 남긴다.

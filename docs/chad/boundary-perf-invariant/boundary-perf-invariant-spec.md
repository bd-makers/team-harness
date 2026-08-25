# boundary-perf-invariant — Spec

## 목적 / 요구사항

`tests/perf/boundary-checkpoint.test.mjs`의 `boundary performance` 테스트가 GitHub Actions에서
무작위로 실패한다. 문서 전용 diff에서도 발생하므로 변경 내용과 무관한 **측정 방식의 결함**이다.

깨지는 assertion은 중앙값 **상대 예산**(`coldMs - spawnFloorMs < 75`)이다. 분모가 bare
`node -e ''` 스폰이라 **스폰 비용 변동만** 상쇄한다. 부하에서는 CLI 본체 작업(20 × 10KiB 스키마
read+parse + 모듈 그래프 로드)도 같이 느려지는데, 그 **작업량 비례 지연을 분모가 흡수하지 못한다.**

요구사항:
1. 러너 전체 실행 시간 동안 **지속되는 부하**에서도 성립하는 측정으로 교체한다.
2. 절대 상한(`Math.max` 500ms / 800ms)은 회귀 그물로 **유지**한다.
3. 예산을 느슨하게 푸는 방식으로 green을 사지 않는다 — 진짜 느린 구현을 잡는 능력이
   기존보다 **약해지면 안 된다.**

## 설계 / 접근

### 후보 평가

| 후보 | 판정 | 근거 |
|---|---|---|
| (a) 분모를 **동일 작업량 baseline**으로 교체 | **채택** | 아래 참조 |
| (b) `max-parallel: 1` 등 **경합 제거** | **기각 (no-op)** | 아래 참조 |
| (c) 부하 감지 시 skip | 불필요 | (a)가 성립하므로 커버리지를 지울 이유가 없다 |
| min-of-N / median 재조합 | 기각 | 지속 경합이라 3 샘플이 전부 오염 — min≈median |

**(b)를 기각한 근거 (측정으로 확인).** 원 메모는 "matrix 두 job 동시 실행에 따른 러너 자원
경합"으로 추정했으나 **사실이 아니다.** GitHub Actions REST API(`/actions/runs/<id>/jobs`)로
확인한 결과 두 job은 **서로 다른 hosted 러너 VM**에서 돈다:

```
run 32802292903: test (20) runner_name="GitHub Actions 1000000304"  → failure
                 test (18) runner_name="GitHub Actions 1000000305"  → success
run 32797110644: test (18) runner_name="GitHub Actions 1000000296"
                 test (20) runner_name="GitHub Actions 1000000297"
runner_group_name="GitHub Actions" (hosted), labels=["ubuntu-latest"]
```

하드웨어를 공유하지 않으므로 직렬화해도 얻는 것이 없다. 실패 job이 `test (18)` ↔ `test (20)`
사이를 **번갈아** 오간 것도 상호 경합보다 **VM별 독립 노이즈**에 부합한다. 진짜 원인은 hosted
러너(2 vCPU)가 올라탄 물리 호스트의 **noisy neighbour**이며, 이것은 **제거할 수 없고 측정으로
우회할 수밖에 없다.**

### 채택 설계 — 비율(ratio) 예산

동일 작업량 baseline: CLI 없이 **같은 21개 파일**(spec + 20개 계약)을 CLI와 **같은 방식**으로
(`stat` → `readFile utf8` → `JSON.parse`, 양쪽은 순차 · boundary는 동시) 읽고 파싱하는
`node` 스크립트. `src/`에서 아무것도 import 하지 않는다.

예산을 **차(subtraction)가 아니라 비(ratio)** 로 둔다. CPU starvation 하에서
wall time ≈ 작업량 × 감속계수이므로,

- 차: `(W_cold − W_base) × s` → **감속계수 s가 그대로 남는다**
- 비: `(W_cold × s) / (W_base × s)` = `W_cold / W_base` → **s가 소거된다**

즉 비율이 부하 불변량이다. 측정으로 확인한 값(§Ambiguity 근거 참조):
부하 0 → 16 → 24 → 36에서 cold 비율은 1.20–1.96 범위에 머물렀고,
**부하를 3배로 올려도 더 나빠지지 않았다** — 불변성이 실제로 성립함을 뜻한다.

### 함께 고친 것 — CLI/hook warmup

기존 테스트는 bare 스폰만 untimed warmup 했다. CLI는 이 저장소의 ~20개 모듈 그래프를
컴파일해야 하므로 **첫 호출의 일회성 비용이 훨씬 크다**(부하 중 첫 cold 샘플 453–541ms,
정상 상태 60–90ms). 이 때문에 **절대 상한 500ms 자체가 flake 원인**이었다(541.3ms 관측).
bare에 이미 적용된 것과 **동일한 논리**를 모든 스폰 shape에 대칭 적용한다. 예산을 푼 것이
아니라 측정을 고친 것이다.

## Ontology

- **spawn floor**: bare `node -e ''` 실행 시간. 기존 설계의 분모. 이제는 **진단 출력 전용**이며
  assertion에 쓰이지 않는다 — 옛 CI 실패 메시지와 수치를 대조할 수 있도록 남긴다.
- **equal-work baseline**: CLI가 읽는 것과 **정확히 같은 파일을 같은 방식으로** 읽고 파싱하되
  CLI 자신의 비용(모듈 그래프 · 인자 해석 · spec 정규식 · 스키마 대조)은 지불하지 않는 기준선.
  예산이 bound 하는 대상은 바로 이 **차이**다.
- **ratio budget**: `coldMs / baselineMs`. 부하 불변량 — 감속계수가 분자·분모에서 소거된다.
- **absolute ceiling**: `Math.max(samples) < 500/800ms`. 비율이 어떻게 되든 **지속적으로 느린
  구현**을 잡는 회귀 그물. 이번 변경에서 **값을 건드리지 않았다.**

## Ambiguity 자가진단

- [x] **Goal 명확도** (40%) — "지속 부하에서도 성립하는 측정으로 교체하되 회귀 탐지력을 낮추지 않는다."
- [x] **Constraint 명확도** (30%) — 절대 상한 유지 · 예산 완화 금지 · CI 로그 접근 불가(프록시 403).
- [x] **Success 기준** (30%) — 수정 전 재현된 실패가 **동일 부하**에서 사라지고,
      주입한 회귀를 **기존보다 더 민감하게** 잡는다(아래 수치로 입증).
- [x] **Context 명확도** — `tests/perf/boundary-checkpoint.test.mjs` 단일 파일. src 변경 없음.
- [x] **Ambiguity ≤ 0.2**

근거: 위 Ontology의 네 개념(spawn floor / equal-work baseline / ratio budget / absolute ceiling)이
구분되면서 "무엇을 어디에 대고 재는가"가 확정됐고, (b) 기각이 추정이 아니라 러너 메타데이터
측정으로 결론났다.

## Done evidence

```json
{ "version": 1, "review": "required", "tests": "required" }
```

## 참고
- 측정치·근거 원본(종결 task, 참조 전용): `docs/chad/release-0181-recovery/release-0181-recovery-artifact.md`
- CI 로그는 프록시가 `*.blob.core.windows.net`을 403으로 막아 이 머신에서 받을 수 없다.
  러너 메타데이터는 JSON API(`gh api .../jobs`)로 받을 수 있으며 이번 (b) 기각 근거가 됐다.

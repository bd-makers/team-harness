# node-test-runner-flake — Artifact

*최종 결과물과 학습 내용을 기록한다.*

## 결과

**미착수 — 원인 확정까지만 진행했다.** 남은 것은 기술 문제가 아니라 지원 Node 범위
**정책 결정**이며(plan 6단계), spec의 Ambiguity 게이트를 의도적으로 미통과 상태로 뒀다.

한 줄 요약: `node:test` 러너의 업스트림 버그(nodejs/node#64061, `#processRawBuffer`가
payload 길이를 부호 있는 정수로 읽음)다. 수정은 Node 26.7.0에 들어갔고 **node 18에는
영구히 도달하지 않는다 — 이미 EOL이다.** 상세는 아래 "조사 기록".

## 조사 기록 (2026-08-25) — 구현 전, 원인 확정까지

이 task는 **구현이 시작되지 않은 상태**로 생성됐다. 아래는 원인 확정까지의 근거이며,
남은 것은 기술 문제가 아니라 지원 범위 **정책 결정**이다 (plan 6단계).

### 어떻게 발견됐나

perf flake(PR #44)를 고치면서 workflow에 annotation 계측을 넣었다 —
이 저장소를 유지보수하는 머신은 raw CI 로그를 받을 수 없기 때문이다
(`*.blob.core.windows.net` 403). 계측을 넣은 **첫 실행**에서 곧바로 잡혔다:

```
not ok 38 - tests/task-templates.test.mjs
  error: 'Unable to deserialize cloned data due to invalid or unsupported version.'
```

계측이 없었다면 이 실패는 "test (18) failed, exit code 1"로만 보였을 것이고,
perf flake와 구분되지 않은 채 같은 원인으로 오인됐을 것이다.
**"CI가 무작위로 빨개진다"에는 최소 두 개의 서로 다른 원인이 섞여 있었다.**

### 우리 코드가 아니라는 근거

| 근거 | 내용 |
|---|---|
| 파일 내용 | `tests/task-templates.test.mjs`는 템플릿 문자열 assertion + fs 조작만. 자식 프로세스 스폰 없음, 직렬화 사용 없음 |
| 동일 코드 통과 이력 | 같은 테스트 코드로 앞선 실행(`af6ae4c7`)은 두 job 모두 통과 |
| 재실행 통과 | 실패 job만 재실행(attempt 2)하니 통과 → 전이성 |
| 스택 위치 | `node:internal/test_runner/runner`의 `#processRawBuffer` — 우리가 호출하지 않는 내부 함수 |
| 버전 편향 없음 | 과거 40회 실행 기준 실패율 node 18 7/39 · node 20 7/40 — 특정 버전 편향 아님 |

### 업스트림 근본 원인

- **nodejs/node#64061** — 증상 보고. `#processRawBuffer`에서 발생. "로컬 간헐적, CI 재현 잘 됨".
  Appium은 Node 24.10.0에서 관측 — **18 전용 버그가 아니다.**
- **nodejs/node#64706** — 수정. payload 길이를 **부호 있는 정수**로 읽던 것을
  `>>> 0`으로 부호 없는 변환. `child_process`에 이미 쓰이던 패턴.
  payload가 커져 최상위 비트가 서면 길이가 무효가 되어 역직렬화가 깨진다.
  동시 실행 worker가 결과를 스트리밍할 때 payload가 커지므로 CI에서 잘 터진다.
- 머지 2026-07-26 → **Node 26.7.0 (2026-08-05)** 릴리스에 포함.

### 결정적 제약 — matrix가 전부 지원 종료 런타임이다

nodejs/Release 공식 스케줄 기준 (2026-08-25 현재):

| 버전 | EOL | 상태 | 우리 사용처 |
|---|---|---|---|
| **18** | 2025-04-30 | **종료 (1년 4개월 경과)** | `test.yml` matrix · `engines: ">=18"` |
| **20** | 2026-04-30 | **종료 (4개월 경과)** | `test.yml` matrix · `release.yml` 발행 |
| 22 | 2027-04-30 | 활성 LTS | — |
| 24 | 2028-04-30 | 활성 LTS | — |

**node 18에는 이 수정이 절대 도달하지 않는다** — 이미 EOL이다.
따라서 "node 18에서 이 flake를 고친다"는 업스트림 경로로 달성 불가능하며,
이것이 후보 (A)(활성 LTS로 이동)를 권장하는 근거다.

부수 발견: **릴리스 발행(`release.yml`)도 EOL 런타임(node 20)에서 돈다.**
이 task의 원래 범위 밖이지만 같은 결정에 묶인다.

### 정정 (2026-08-25) — 백포트 실측으로 초기 권장안을 뒤집었다

초기 보고는 "활성 LTS(22/24)로 이동하면 EOL 문제와 flake가 함께 해소된다"였다.
**틀렸다.** 오케스트레이터가 "수정이 26.7.0에 들어갔다면 22/24로 옮겨도 flake는 남는 것 아닌가"를
지적했고, 확인 결과 그 지적이 맞았다 — 다만 24는 예외였다.

추정하지 않고 릴리스 라인별 소스를 직접 대조했다:

```
$ gh api "repos/nodejs/node/contents/lib/internal/test_runner/runner.js?ref=<branch>" \
    --jq .content | base64 -d | grep -c '>>> 0) + kSerializedSizeHeader'
v26.x=1  v24.x=0  v22.x=0  v20.x=0  v18.x=0
v26.x-staging=1  v24.x-staging=1  v22.x-staging=0
```

| 라인 | 취약 코드 | 수정 | 최신 릴리스 | 결론 |
|---|---|---|---|---|
| v18.x | 있음 | 없음 | — | **영구 잔존** (EOL) |
| v20.x | 있음 | 없음 | — | **영구 잔존** (EOL) |
| v22.x | 있음 | **없음** (staging도) | 22.23.2 (2026-07-29) | **잔존** — 활성 LTS인데 백포트 없음 |
| v24.x | 있음 | **staging에 있음** | 24.19.0 (2026-08-03, 취약) | **24.20.0부터 해소** |
| v26.x | 있음 | 있음 | 26.7.0 (2026-08-05) | 해소됨 |

확정 근거:
- **v24 백포트** — cherry-pick `9ed7146851`이 `v24.x-staging`에 존재. 열려 있는 릴리스 PR
  **nodejs/node#65461 "2026-08-26, Version 24.20.0 'Krypton' (LTS)"** 의 CHANGELOG에
  `test_runner: convert to uint during deserialization (Aviv Keller) [#64706]` 로 명시.
- **v22 미백포트** — `v22.x-staging`의 해당 줄은 여전히 `const fullMessageSize = (` 이고
  괄호 보정(`>>> 0`)이 없다. 백포트 PR도 없다.

**교훈: EOL과 백포트 도달 여부는 독립된 축이다.** "활성 LTS면 최신 수정이 와 있다"는
가정이 틀렸다 — v22가 반례다. 런타임을 고를 때 두 축을 따로 확인해야 한다.
이 오류는 "수정이 X 버전에 들어갔다"에서 "그 이하 활성 버전에도 있겠지"로 건너뛴 데서 나왔다.

실무적 함의:
- `[22, 24]`를 고르면 **22 job에 flake가 그대로 남는다** — 가장 자연스러워 보이는 선택이 함정이다.
- `[24]`는 `actions/setup-node`가 최신 24.x를 집으므로 **2026-08-26 이후 자동으로** 해소된다.
  그 전에 검증하면 24.19.0(취약)이라 잘못된 결론이 나온다.

### 남은 것

지원 Node 범위 결정. `engines`를 `>=22`로 올리는 것은 **하위 호환을 깨는** 변경이라
이 task 단독으로 결정할 수 없다. spec의 Ambiguity 게이트는 이 항목 때문에
**의도적으로 미통과 상태**로 남겨 뒀다 — 남은 모호성이 기술이 아니라 정책이기 때문이다.

## Reviews
*Codex/Gemini 등 리뷰 실행 시 결과(요약·발견·조치)를 날짜와 함께 남긴다. 남기지 않은 리뷰는 "안 한 것"으로 간주.*
*기계 판독용 마커를 함께 남긴다: `<!-- harness:review kind=codex scope=worktree tip=<sha|none> at=<ISO8601> -->`*


## Learnings

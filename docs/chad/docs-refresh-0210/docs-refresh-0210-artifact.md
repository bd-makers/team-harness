# docs-refresh-0210 — Artifact

*최종 결과물과 학습 내용을 기록한다.*

## 결과

소비자 문서 6종을 0.21.0 기준으로 정합화하고, 요구된 두 가지(벤더링 인벤토리 · 전체 스킬
옵트인 표)를 신설했다. 스냅샷 관례가 있는 2종에 버전 스냅샷을 남겼다.

| 파일 | 전 | 후 | 성격 |
|---|---|---|---|
| `docs/prerequisites.md` | §5 한 문단 | 벤더링 인벤토리 절 | 직접 편집 |
| `docs/harness-workflow-simulation.html` | 0.18.1 | 0.21.0 + 스킬 로스터 | 직접 편집 |
| `docs/harness-overview.template.html` | 0.18.1 | 0.21.0 | 직접 편집 (생성 소스) |
| `docs/harness-overview.html` | 0.18.1 | 0.21.0 | `docs:generate` 재생성 |
| `docs/harness-task-guide.html` | 0.18.1 | 0.21.0 | 직접 편집 |
| `docs/harness-fleet-guide.html` | 0.18.1 | 0.21.0 | 직접 편집 |
| `docs/harness-overview-0.21.0.html` | — | 신규 | 스냅샷 |
| `docs/harness-workflow-simulation-0.21.0.html` | — | 신규 | 스냅샷 |
| `docs/index.html` | — | 2줄 추가 | 스냅샷 등재 |

### 요구 1 — 벤더링되지 않은 스킬 (`prerequisites.md` §5)

조사 결론이 문서의 핵심이 됐다: **비번들은 `diagram-design` 하나뿐**이다. `/harness-*` 커맨드
24종과 짝 스킬, Codex 전용 스킬 2종(`harness-team`·`harness-codex-sim`)은 전부 플러그인 번들이라
따로 설치할 것이 없다. "설치 목록이 짧다"가 아니라 **"나머지는 설치할 필요가 없다"**를 명시하는
것이 독자에게 필요한 정보라고 판단해 인벤토리 선언 형태로 썼다.

`diagram-design` 항목에는 켜지는 기능(다이어그램 옵트인 3곳)·없을 때 동작(probe → degrade →
record)·설치 명령을 담았고, **doctor가 검사하지 않는 이유**(옵트아웃한 사용자에게는 부재가
오탐이다)를 함께 적었다. `prerequisites:external-tools` 마커 블록은 건드리지 않았다.

### 요구 2 — 전체 스킬 로스터 (`harness-workflow-simulation.html`)

24 커맨드 + 커맨드 없는 스킬 2종을 5개 배지로 분류한 표를 신설했다. 설계의 핵심은
**"옵트인"의 범위를 좁게 정의한 것**이다 — 계약으로 선언된 옵트인은 셋(다이어그램 단계,
`## Done evidence`의 `review`·`verify`, `## Boundary contracts`)뿐이고, "작은 버그엔 생략
가능"은 규범이다. 이 둘을 같은 배지로 묶으면 표가 거짓말을 한다.

### 반영한 사실 교정 6건

버전 표기만 바꾼 것이 아니라 0.19.0 이후 **실제로 틀려진 서술**을 소스로 확인해 고쳤다.

1. **done 종결 가드가 6종 → 7종** (`src/commands/task.mjs`) — 0.20.0의 `verify` 증거 키.
   **네 문서가 모두 6종이라고 말하고 있었고**, task guide는 라이프사이클 inline SVG 안에까지
   박혀 있었다. 본문만 고쳤다면 같은 문서에서 글과 그림이 서로 반박했을 것이다.
2. **판정 창의 시작점이 `switchedAt` → `firstActivatedAt`** (0.19.0) — 재활성화가 창을
   초기화해 이미 만족된 증거를 밀어내던 오탐 제거. fleet guide에는 워크트리를 오가는 크루가
   특히 자주 밟던 함정이라는 맥락을 붙였다.
3. **D6 적대적 검증이 문서 어디에도 없었다** (0.20.0) — 검증자가 붙는 자리 다섯,
   `kind=<engine>-<프레이밍>` 접미사 5종, "반박만 하고 고치지 않는다"는 경계를 세 문서에 분배.
   fleet guide에는 크루 운용 맥락(워커 보고서의 "다 됐습니다"를 대체하는 증거)으로 썼다.
4. **overview가 이미 출시된 것을 미래형으로 예고** — "⚠️ 다음 릴리스 예고" 블록이 0.19.0의
   Node 24·`firstActivatedAt`을 아직 `## [Unreleased]`로 소개하고 있었다. 출시 사실로 전환.
5. **`/harness-diagram`이 이름조차 없었다** — simulation이 다이어그램 옵트인을 네 곳에서 길게
   설명하면서 **그것을 실행하는 어댑터 커맨드를 한 번도 부르지 않았다.** 독자가 task 생성
   이후 다이어그램을 갱신할 방법을 알 수 없었다.
6. **Node ≥ 24가 simulation에 없었다** (0.19.0 BREAKING) — grep 결과 `Node` 문자열이 0건.

## 학습

### 생성 문서라고 최신인 것은 아니다

`harness-overview.html`은 `docs:generate` 산출물이고 `docs:check`가 CI에서 green이었는데도
v0.18.1을 표시하고 있었다. **자동 갱신되는 것은 인벤토리(커맨드 표)뿐이고 hero 배지·배너 산문·
footer는 템플릿 하드코딩**이기 때문이다. "생성물 = 항상 정확" 이라는 가정이 이 문서의 산문을
세 릴리스 동안 방치했다. 생성 문서를 볼 때는 **무엇이 생성되고 무엇이 손으로 쓰인 부분인지**를
먼저 갈라야 한다.

### 가드가 없는 문서가 가장 빨리 낡는다

세 갈래의 결합 강도가 그대로 낡은 정도로 나타났다.

| 문서 | 생성 | CI 가드 | 낡은 정도 |
|---|---|---|---|
| `what-changes-latest-version.html` | ✗ | 버전 일치 + byte-identical | 안 낡음 |
| `harness-overview.html` | ✓ | 생성 상태 + 인벤토리 pin | 산문만 낡음 |
| `prerequisites.md` | ✗ | doctor와 양방향 대조 | 표는 정확, 그 밖이 부족 |
| simulation · fleet · task guide | ✗ | **없음** | 3릴리스 낡음 |

가드가 걸린 축은 정확했고, 걸리지 않은 축만 틀렸다. 다만 이번 문서들은 산문이라 결정론적
대조 대상을 만들기 어렵다 — 실효적인 대책은 **릴리스 절차에서 문서 세대를 함께 확인하는 것**이며,
그건 이 task의 범위가 아니라 `MAINTAINING.md` 쪽 후속이다.

### "숫자 하나"가 네 문서에 흩어져 있었다

`done` 가드 개수 하나가 simulation(3곳)·task guide(4곳 + SVG 1곳)·fleet guide(3곳)에 있었다.
0.20.0이 `verify`를 추가할 때 src와 README는 고쳤지만 소비자 HTML 4종은 아무도 세지 않았다.
**무언가를 세는 문장을 쓸 때는 그 수를 부르는 모든 곳이 갱신 대상**이라는 점에서,
`docs-no-future-version-numbers`가 지적한 "지울 대상이 아니라 그 대상을 이름으로 부르는 모든 곳"과
같은 실패 형태다.

## Reviews

<!-- 리뷰 기록은 아래에 append -->

## 다이어그램

- 다이어그램: **묻고 건너뜀** — 문서 텍스트 갱신 작업이라 설명을 더하지 않는다고 판단
  (2026-08-29 사용자 확인, 선례 `docs-refresh-0181`도 동일). 도구 부재가 아니라 **옵트아웃**이다.

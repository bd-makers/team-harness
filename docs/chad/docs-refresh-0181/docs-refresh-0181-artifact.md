# docs-refresh-0181 — Artifact

*최종 결과물과 학습 내용을 기록한다.*

## 결과

첨부된 HTML 3종을 0.18.1 기준으로 갱신하고, 스냅샷 관례가 있는 2종에 버전 스냅샷을 남겼다.

| 파일 | 전 | 후 | 성격 |
|---|---|---|---|
| `docs/harness-fleet-guide.html` | 0.14.0 | 0.18.1 | 직접 편집 |
| `docs/harness-workflow-simulation.html` | 0.13.0 | 0.18.1 | 직접 편집 |
| `docs/harness-overview.template.html` | 0.14.0 | 0.18.1 | 직접 편집 (생성 소스) |
| `docs/harness-overview.html` | 0.14.0 | 0.18.1 | `npm run docs:generate` 재생성 |
| `docs/harness-overview-0.18.1.html` | — | 신규 | 스냅샷 |
| `docs/harness-workflow-simulation-0.18.1.html` | — | 신규 | 스냅샷 |

### 반영한 사실 교정 8건

버전 표기만 바꾼 것이 아니라, 0.13/0.14 이후 **실제로 틀려진 서술**을 소스로 확인해 고쳤다.

1. **원장이 생성물이 됐다 (0.16.0)** — `task`/`done`이 `docs/task_summary.md`·`docs/<user>/<user>-task.md`를
   쓰지 않는다(`src/commands/task.mjs:238-247`). 세 문서 모두 옛 동작으로 서술하고 있었다.
   시뮬레이션 S2/S4의 산출물 트리, fleet guide §6 충돌 지도가 여기에 걸려 있었다.
2. **병렬 충돌원이 3개에서 1개로 줄었다** — 남은 것은 `<user>-handoff.md`뿐. fleet guide §6 전면 재작성.
3. **`release --help` 사고는 0.15.1에서 수정됐다** (`src/cli-args.mjs:203-224`) — fleet guide §7의
   핵심 경고 블록이 통째로 낡아 있었다. "고쳐졌다"로 뒤집되 ① 전역 CLI 드리프트가 있으면 옛 동작이
   그대로라는 점, ② 하네스 밖 CLI에는 이 수정이 없다는 점을 남겼다.
4. **`done` 가드가 4종 → 6종** (`src/commands/task.mjs:413-525`) — 테스트 미작성(기본 ON)과
   리뷰 마커(spec opt-in) 추가, 그리고 `## Done evidence` 선언 자체의 유효성 검사.
5. **task 디렉터리에 `<name>-meta.json`이 생겼다 (0.16.0)** — SSOT 4파일이 아닌 기계 상태.
6. **리뷰 커맨드가 엔진 중립으로 재편됐다 (0.17.0)** — `/harness-codex-review` → `/harness-review`.
   옛 이름은 alias이며 0.19.0에서 제거되므로, 브리프에 박아 두면 그때 깨진다는 함정을 추가했다.
7. **task 생성 직후 흐름이 바뀌었다** — 다이어그램 옵트인 1회 질문(0.17.0) + `/harness-spec` writer(0.18.0).
8. **라이프사이클에 ship이 생겼다 (0.17.0)** — 시뮬레이션에 시나리오 7 신설, fleet 부트스트랩 6단계로 삽입.

### 판단 두 가지

- **스냅샷은 계열이 있는 문서에만.** `harness-fleet-guide.html`에는 버전별 스냅샷 계열이 없어
  `-0.18.1.html`을 만들지 않았다. 없는 관례를 이 task에서 발명하지 않는다.
  누락된 `harness-workflow-simulation-0.13.0.html`도 백필하지 않았다(범위 밖).
- **기준선은 릴리스된 0.18.1, 단 Node 축은 예외.** `## [Unreleased]`의 두 변경은 본문 기준으로
  삼지 않되, `engines.node: ">=24"`와 `docs/prerequisites.md`가 이미 같은 트리에서 `≥24`를 말하고
  있어 overview 배지를 `≥18`로 두면 문서끼리 반박한다. 배지는 `≥24`로 맞추고 같은 블록에
  **"다음 릴리스 예고 (BREAKING)"**로 명시했다 — `firstActivatedAt` 전환도 같은 자리에 예고로만.

### 검증

```
npm run docs:generate  → generated docs/harness-overview.html
npm run docs:check     → harness overview 생성 상태가 최신입니다.
npm test               → tests 422 · pass 421 · fail 0 · skipped 1
```

`docs/harness-overview.html`은 손대지 않고 템플릿 경유로만 바꿨다 — `docs:check`가 CI 게이트다.

### 후속 (이 task 범위 밖)

- `docs/harness-task-guide.html`이 아직 **0.14 기준**이다. 이 계열의 네 번째 낡은 문서이며,
  fleet guide가 "단일 세션 절차의 정본"으로 이 문서를 가리킨다. fleet guide 각주에 경고를 달아
  두었지만 근본 해결은 그 문서를 갱신하는 것이다.
- `harness-workflow-simulation-0.13.0.html` 스냅샷 누락.

## Reviews
*Codex/Gemini 등 리뷰 실행 시 결과(요약·발견·조치)를 날짜와 함께 남긴다. 남기지 않은 리뷰는 "안 한 것"으로 간주.*
*기계 판독용 마커를 함께 남긴다: `<!-- harness:review kind=codex scope=worktree tip=<sha|none> at=<ISO8601> -->`*


## Learnings


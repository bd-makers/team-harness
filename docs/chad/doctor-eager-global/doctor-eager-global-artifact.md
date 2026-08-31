# doctor-eager-global — Artifact

*최종 결과물과 학습 내용을 기록한다.*

## 결과

`doctor`의 eager 계층 측정이 실제 상시 로드량을 잰다. 측정 대상이 2곳 → **4곳**(프로젝트
`AGENTS.md`·`CLAUDE.md`·`.claude/CLAUDE.md` + 전역 `CLAUDE.md`)이 됐고, 예산은 **합계**에 걸린다.

- `src/commands/doctor.mjs` — `globalClaudeMdPath(env)` 신설, `checkEagerTierSize(targetDir, env)`
  합산·파일별 내역·해결된 경로·기여도순 처방
- `tests/doctor.test.mjs` — 단위 13건 + runDoctor 배선 3건
- `tests/e2e/sandbox.mjs`·`tests/sim/agentloop.mjs`·`tests/sim/codex-agentloop.mjs` —
  `CLAUDE_CONFIG_DIR` 핀(리뷰 P1)
- `MAINTAINING.md`·`CHANGELOG.md` — 현행화 / Unreleased 기록 (릴리스 범프 없음)

`npm test` 481 pass / 0 fail / 1 skipped + perf 1 pass.

**day-one에 이 머신이 노랗게 변하지 않는 것은 정상이다** — 실측 21,588 B는 예산의 88%다.
성공의 증거는 그것이 아니라 `CLAUDE_CONFIG_DIR`로 임계 초과를 결정론적으로 구성하는 테스트다.

## Reviews
*Codex/Gemini 등 리뷰 실행 시 결과(요약·발견·조치)를 날짜와 함께 남긴다. 남기지 않은 리뷰는 "안 한 것"으로 간주.*
*기계 판독용 마커를 함께 남긴다: `<!-- harness:review kind=codex scope=worktree tip=<sha|none> at=<ISO8601> -->`*

### 2026-08-31 — 외부 read-only 리뷰 (엔진: **claude**, scope: diff vs origin/main)

**엔진 폴백**: probe 체인 codex → gemini → claude 에서 **claude 로 내려왔다.**
- `codex`: CLI 는 있으나 실행이 두 번 모두 `ERROR: Selected model is at capacity` 로 실패(exit 1). 코드 문제가 아니라 엔진 가용성.
- `gemini`: CLI 미설치(`command -v gemini` 실패) — 이 머신의 알려진 상태.
- `claude`: `claude -p --permission-mode plan` 으로 실행 성공. **한계 명시** — 컨텍스트 분리만 제공하고 vendor 분리는 없다(같은 모델의 맹점 공유).

**요약**: read-only 제약(프로젝트 밖 쓰기 없음)·바이트 회계·무음 처리·단위 테스트의 머신 독립성은 모두 통과. 막는 이슈 1건.

| # | 심각도 | 발견 | 판별 | 조치 |
|---|---|---|---|---|
| 1 | P1 | e2e·sim 스위트가 개발자 개인 `~/.claude/CLAUDE.md` 에 물린다 — `doctor status === 'success'` 단언이 레포 밖 파일의 함수가 됐다 | **진짜 결함 (직접 재현함)** — `CLAUDE_CONFIG_DIR=<20 KiB home> node --test tests/e2e/apply-smoke.test.mjs` → 3/3 실패. 이 머신 마진 약 3 KB. CI 는 green 이라 로컬에서만 터진다 | **수정함** — env 빌더 3곳(`tests/e2e/sandbox.mjs`, `tests/sim/agentloop.mjs`, `tests/sim/codex-agentloop.mjs`)에 `CLAUDE_CONFIG_DIR` 핀. 선례는 같은 파일의 `CLAUDE_PLUGINS_ROOT` |
| 2 | P2 | `docs/harness-task-guide.html:290` 이 옛 2파일 규칙을 설명한다 | **부분 오탐** — 그 문장은 `"0.23.0에서는 …"` 이라는 **과거 서술**이고 footer 가 `0.23.0 기준 갱신` 으로 고정돼 있다. 지금은 정확하며, 이 변경이 **릴리스될 때** 비로소 낡는다 | **이번 PR 에서 고치지 않음** — 미출시 동작을 상시 가이드 본문에 쓰면 footer(0.23.0)와 어긋난다. `harness-overview.html` 과 같은 **릴리스 시점 작업**으로 보고 |
| 3 | P3 | 프로젝트 처방이 기여도와 무관하게 항상 먼저 나온다 — 프로젝트 10 B + 전역 24,577 B 에서도 "프로젝트 파일은…" 으로 문장이 시작 | **진짜 결함** — 초과를 만들지 않은 계층에 처방이 먼저 간다 | **수정함** — advice 를 기여 바이트 내림차순으로 정렬해 주범이 먼저 말하게 함 |
| 4 | P3 | 새 테스트 2곳(`:368`, `:692`)이 단언식 안에서 `makeConfigHome()` 을 인라인 호출해 temp 디렉터리 누수 | **진짜 결함** | **수정함** — 변수로 잡아 `finally` 에서 정리 |
| 5 | P3 | 주석이 존재하지 않는 헬퍼 `emptyConfigHome()` 을 가리킨다 | **진짜 결함** (내가 쓴 주석) | **수정함** — `makeConfigHome()` 으로 정정 |

**리뷰어가 확인 후 제외한 것** (동의): 예산 재보정(분자가 커졌는데 24 KiB 유지 — warning-only 라 방어 가능), 소스 3개에서 멈추는 커버리지(spec "범위 밖" 에 명시), symlink 별칭의 dedupe 우회(`realFile` 검사가 이미 hard fail).

<!-- harness:review kind=claude scope=diff tip=002f21376e480951a27a2a21de838fac44b7a8a9 at=2026-08-31T09:33:17Z -->


## Learnings

- **측정 대상을 넓히면 그 측정을 단언하는 모든 테스트의 격리 범위도 같이 넓혀야 한다.**
  단위 테스트에는 `CLAUDE_CONFIG_DIR` 격리를 처음부터 넣었지만, `doctor status === 'success'`를
  단언하는 **e2e·sim 스위트 3곳**을 놓쳤다. 레포 밖 파일이 판정에 들어오는 순간
  "CI는 green, 로컬만 red"라는 최악의 형태가 된다 — 선례(`CLAUDE_PLUGINS_ROOT` 핀)가 바로 옆
  파일에 있었는데도 놓쳤다. **"이 값을 단언하는 곳이 또 어디인가"를 grep으로 먼저 세어야 한다.**
- **낡은 수치는 결론이 아니라 근거만 바꾼다.** 브리프의 "이미 임계 초과"가 실측과 달랐지만
  (8,734 → 5,620) 결함은 그대로였다. 수치를 조용히 따르지도, 수치가 틀렸다고 작업을 멈추지도
  않고 **정정을 먼저 보고하고 프레이밍을 바꿔 진행**한 것이 맞았다.
- **CLI 동작은 추측하지 말고 바이너리에서 읽는다.** `CLAUDE_CONFIG_DIR` 존재·해석과
  `.claude/CLAUDE.md`의 Project 스코프 로드를 모두 `strings`로 1차 확인했다. 특히 "비절대
  config home은 Claude Code 자신이 거부한다"는 사실이 이중 계산 방지 설계로 직결됐다 —
  추측했다면 나오지 않았을 분기다.


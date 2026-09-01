# doctor-eager-global — Artifact

*최종 결과물과 학습 내용을 기록한다.*

## 결과

`doctor`의 eager 계층 측정이 실제 상시 로드량을 잰다. 측정 대상이 2곳 → **4곳**(프로젝트
`AGENTS.md`·`CLAUDE.md`·`.claude/CLAUDE.md` + 전역 `CLAUDE.md`)이 됐고, 예산은 **합계**에 걸린다.
두 소스 모두 Claude Code 2.1.251 바이너리의 실제 해석 코드로 확인했고(spec 결정 3·6),
외부 리뷰어가 같은 바이너리에서 **독립 재확인**했다.

- `src/commands/doctor.mjs` — `globalClaudeMdPath(env)` 신설, `checkEagerTierSize(targetDir, env)`
  합산·파일별 내역·해결된 경로·**기여도순 처방**·경로 정규화 dedupe
- `tests/doctor.test.mjs` — 단위 14건 + runDoctor 배선 3건
- `tests/e2e/sandbox.mjs`·`tests/sim/agentloop.mjs`·`tests/sim/codex-agentloop.mjs` —
  `CLAUDE_CONFIG_DIR` 핀(리뷰 P1)
- `MAINTAINING.md`·`CHANGELOG.md` — 현행화 / `## [Unreleased]` 기록 (릴리스 범프 없음)

실측: `npm test` → **483 tests / 482 pass / 0 fail / 1 skip** + perf 1 pass.
(skip 1건은 `tests/hooks-jq-fallback.test.mjs:81`의 `skip: !process.env.CI` 게이트 —
CI에서는 실행되며 이 변경과 무관하다.)

**day-one에 이 머신이 노랗게 변하지 않는 것은 정상이다** — 실측 21,588 B는 예산의 88%다.
성공의 증거는 그것이 아니라 `CLAUDE_CONFIG_DIR`로 임계 초과를 결정론적으로 구성하는 테스트다.

### 브랜치 합병 (2026-09-01)

세션 39가 죽은 뒤 작업이 두 브랜치에 나뉘어 쌓여 PR #67·#68이 서로를 포함하지 않는 상태가 됐다.
**#68로 합치고 #67은 close**했다. 합병은 union이다 — 어느 한쪽의 코드 상태를 통째로 택하면
다른 쪽 테스트가 조용히 사라진다:

| 출처 | 합병본에 들어간 것 |
|---|---|
| #67 (39 브랜치, `efae5d3`) | e2e·sim 3곳 `CLAUDE_CONFIG_DIR` 핀(P1), 처방 기여도순 정렬 + 테스트 2건, 누수 정리, 주석 정정 |
| #68 (40 브랜치, `b4338e2`) | `config home == target` 중복 계산 방지 테스트, 외부 리뷰 기록, 리뷰 덱 |

리뷰 덱은 살아남는 PR 번호에 맞춰 `pr-68-doctor-eager-global.html` 하나만 남겼다.

## Reviews
*Codex/Gemini 등 리뷰 실행 시 결과(요약·발견·조치)를 날짜와 함께 남긴다. 남기지 않은 리뷰는 "안 한 것"으로 간주.*
*기계 판독용 마커를 함께 남긴다: `<!-- harness:review kind=codex scope=worktree tip=<sha|none> at=<ISO8601> -->`*

> 이 task에는 **두 번의 독립적인 외부 리뷰**가 있다 — 브랜치가 갈라진 동안 각 브랜치에서
> 한 번씩 돌았다. 발견이 상당 부분 겹치며, 두 번째 리뷰가 지적한 것 중 일부는 첫 번째
> 리뷰의 조치(`efae5d3`)로 **이미 고쳐져 있었다**. 아래 두 기록을 시간순으로 남긴다.

### 2026-08-31 09:33Z — 외부 read-only 리뷰 ① (엔진: **claude**, scope: diff vs origin/main, tip `002f213`)

**엔진 폴백**: probe 체인 codex → gemini → claude 에서 **claude 로 내려왔다.**
- `codex`: CLI 는 있으나 실행이 두 번 모두 `ERROR: Selected model is at capacity` 로 실패(exit 1). 코드 문제가 아니라 엔진 가용성.
- `gemini`: CLI 미설치(`command -v gemini` 실패) — 이 머신의 알려진 상태.
- `claude`: `claude -p --permission-mode plan` 으로 실행 성공. **한계 명시** — 컨텍스트 분리만 제공하고 vendor 분리는 없다(같은 모델의 맹점 공유).

**요약**: read-only 제약(프로젝트 밖 쓰기 없음)·바이트 회계·무음 처리·단위 테스트의 머신 독립성은 모두 통과. 막는 이슈 1건.

| # | 심각도 | 발견 | 판별 | 조치 |
|---|---|---|---|---|
| 1 | P1 | e2e·sim 스위트가 개발자 개인 `~/.claude/CLAUDE.md` 에 물린다 — `doctor status === 'success'` 단언이 레포 밖 파일의 함수가 됐다 | **진짜 결함 (직접 재현함)** — `CLAUDE_CONFIG_DIR=<20 KiB home> node --test tests/e2e/apply-smoke.test.mjs` → 3/3 실패. 이 머신 마진 약 3 KB. CI 는 green 이라 로컬에서만 터진다 | **수정함** (`efae5d3`) — env 빌더 3곳(`tests/e2e/sandbox.mjs`, `tests/sim/agentloop.mjs`, `tests/sim/codex-agentloop.mjs`)에 `CLAUDE_CONFIG_DIR` 핀. 선례는 같은 파일의 `CLAUDE_PLUGINS_ROOT` |
| 2 | P2 | `docs/harness-task-guide.html:290` 이 옛 2파일 규칙을 설명한다 | **부분 오탐** — 그 문장은 `"0.23.0에서는 …"` 이라는 **과거 서술**이고 footer 가 `0.23.0 기준 갱신` 으로 고정돼 있다. 지금은 정확하며, 이 변경이 **릴리스될 때** 비로소 낡는다 | **이번 PR 에서 고치지 않음** — 미출시 동작을 상시 가이드 본문에 쓰면 footer(0.23.0)와 어긋난다. `harness-overview.html` 과 같은 **릴리스 시점 작업**으로 보고 |
| 3 | P3 | 프로젝트 처방이 기여도와 무관하게 항상 먼저 나온다 — 프로젝트 10 B + 전역 24,577 B 에서도 "프로젝트 파일은…" 으로 문장이 시작 | **진짜 결함** — 초과를 만들지 않은 계층에 처방이 먼저 간다 | **수정함** (`efae5d3`) — advice 를 기여 바이트 내림차순으로 정렬해 주범이 먼저 말하게 함 |
| 4 | P3 | 새 테스트 2곳(`:368`, `:692`)이 단언식 안에서 `makeConfigHome()` 을 인라인 호출해 temp 디렉터리 누수 | **진짜 결함** | **수정함** (`efae5d3`) — 변수로 잡아 `finally` 에서 정리 |
| 5 | P3 | 주석이 존재하지 않는 헬퍼 `emptyConfigHome()` 을 가리킨다 | **진짜 결함** (내가 쓴 주석) | **수정함** (`efae5d3`) — `makeConfigHome()` 으로 정정 |

**리뷰어가 확인 후 제외한 것** (동의): 예산 재보정(분자가 커졌는데 24 KiB 유지 — warning-only 라 방어 가능), 소스 3개에서 멈추는 커버리지(spec "범위 밖" 에 명시), symlink 별칭의 dedupe 우회(`realFile` 검사가 이미 hard fail).

<!-- harness:review kind=claude scope=diff tip=002f21376e480951a27a2a21de838fac44b7a8a9 at=2026-08-31T09:33:17Z -->

### 2026-08-31 09:51Z — 외부 read-only 리뷰 ② (엔진: **claude**, scope: diff vs origin/main, tip `5124895`)

40 브랜치에서 별도로 돌린 리뷰다. 폴백 경로는 ①과 같다(codex capacity 실패 2회 → gemini 미설치 → claude).

**판정: Approve with nits.** 리뷰어가 주장에 그치지 않고 직접 실측했다 —
`node --test tests/doctor.test.mjs` 55/55 pass, spec이 인용한 1차 출처를 바이너리에서
독립 재확인, 이 머신 합계 21,588 B(예산의 88%)가 spec 표와 일치함을 확인, dedupe 제거 시
새 테스트가 실패하는 판별력까지 확인. 발견 7건을 전부 코드에서 대조했고 **오탐은 없었다**.

> **조치 기록 정정 (2026-09-01).** 이 표의 조치란은 원래 전부 "없음"이었다 —
> `harness-review`의 review-only 제약에 따라 40 브랜치에서 고치지 않았다는 뜻이었다.
> 그러나 같은 결함 중 셋은 **39 브랜치에서 `efae5d3`로 이미 고쳐져 있었고**, 합병으로
> 그 수정이 최종본에 들어왔다. 한 일을 안 했다고 적는 것도 하지 않은 일을 했다고 적는 것과
> 같은 기록 오류이므로 실제 상태로 갱신한다.

| # | 심각도 | 발견 | 판별 | 조치 (합병 후 실제 상태) |
|---|---|---|---|---|
| 1 | P2 | 24 KiB 상수의 근거가 넓어진 측정 집합에 맞춰 재도출되지 않음 (`doctor.mjs`, `MAINTAINING.md`) | **확인.** 문장 자체는 정확("이 레포의 **프로젝트** 계층 ~16 KB")하나, 예산은 이제 그 **상위집합**에 걸린다 — 부분집합 실측으로 상위집합 예산을 정당화하는 논리 공백 | **보류 — 사용자 결정 대기.** 리뷰 ①의 리뷰어는 같은 사안을 "warning-only 라 방어 가능"으로 제외했다. 상수 재도출 여부는 예산 결정이라 워커가 정하지 않는다 |
| 2 | P3 | `## 범위 밖` 목록 미완 — `CLAUDE.local.md`·조상 디렉터리·`.claude/rules/*.md` | **부분 확인.** `CLAUDE.local.md` 제외 사유("gitignore라 팀 공유 아님")가 이 변경의 전제("출처를 구분하지 않으므로 합산")와 결이 다른 건 맞다 | **보류 — 사용자 결정 대기** |
| 3 | P3 | 테스트 격리가 규약으로만 강제됨 — 일부 doctor 테스트가 실제 `~/.claude/CLAUDE.md`를 읽음 | **확인(잠재 위험).** 리뷰 ①이 같은 결함을 **P1로 더 정확히** 잡았다 — 잠재가 아니라 실제 재현되는 결함이었다 | **수정됨** (`efae5d3`, 리뷰 ①-1) — e2e·sim 3곳에 `CLAUDE_CONFIG_DIR` 핀 |
| 4 | P3 | 임시 디렉터리 누수 2건 — 인라인 `makeConfigHome()`이 `rm` 안 됨 | **확인.** 리뷰 ①-4와 동일 결함 | **수정됨** (`efae5d3`) — 변수로 잡아 `finally`에서 정리 |
| 5 | P3 | 문서 드리프트 — `harness-task-guide.html:290` 등이 아직 `AGENTS.md`+`CLAUDE.md` 정의 | **확인.** 리뷰 ①-2와 동일 지점 | **의도적 보류** — 리뷰 ①의 판별대로 그 문장은 과거 서술(0.23.0)이고 footer도 0.23.0 고정이라 **릴리스 시점 작업**이다 |
| 6 | P3 | 라벨 포맷 — `…/CLAUDE.md(전역)` 구분자 없음 | **확인(미관).** | **미조치** — 값싼 정리, 지시 오면 즉시 반영 |
| 7 | P3 | TCC(`-context.md`)가 템플릿 원본 그대로 | **확인.** `context check`는 통과하나 재개 가치가 없다 | **미조치** — 값싼 정리, 지시 오면 즉시 반영 |

<!-- harness:review kind=claude scope=diff tip=51248955be98a59654eb074d2c8ff25c1215c32f at=2026-08-31T09:51:19Z -->

## Learnings

- **측정 대상을 넓히면 그 측정을 단언하는 모든 테스트의 격리 범위도 같이 넓혀야 한다.**
  단위 테스트에는 `CLAUDE_CONFIG_DIR` 격리를 처음부터 넣었지만, `doctor status === 'success'`를
  단언하는 **e2e·sim 스위트 3곳**을 놓쳤다. 레포 밖 파일이 판정에 들어오는 순간
  "CI는 green, 로컬만 red"라는 최악의 형태가 된다 — 선례(`CLAUDE_PLUGINS_ROOT` 핀)가 바로 옆
  파일에 있었는데도 놓쳤다. **"이 값을 단언하는 곳이 또 어디인가"를 grep으로 먼저 세어야 한다.**
- **구현된 가드에 테스트가 없을 수 있다.** dedupe(`seen` Set)는 코드에 있었고 plan에도
  체크돼 있었지만 어떤 테스트도 그 동작을 고정하지 않았다. 가장 가까운 테스트의 **주석**이
  이중 계산을 언급해 "덮여 있다"는 착시를 만들었다 — 검증 대상은 다른 함수였다.
  가드를 테스트로 고정할 때는 **그 가드를 제거하면 실제로 실패하는지** 확인해야 한다.
  fixture 크기를 예산의 절반보다 조금 크게 잡아 두 결과가 갈리게 만든 것이 그 확인이다.
- **낡은 수치는 결론이 아니라 근거만 바꾼다.** 브리프의 "이미 임계 초과"가 실측과 달랐지만
  (8,734 → 5,620) 결함은 그대로였다. 수치를 조용히 따르지도, 수치가 틀렸다고 작업을 멈추지도
  않고 **정정을 먼저 보고하고 프레이밍을 바꿔 진행**한 것이 맞았다.
- **CLI 동작은 추측하지 말고 바이너리에서 읽는다.** `CLAUDE_CONFIG_DIR` 존재·해석과
  `.claude/CLAUDE.md`의 Project 스코프 로드를 모두 `strings`로 1차 확인했다. 특히 "비절대
  config home은 Claude Code 자신이 거부한다"는 사실이 이중 계산 방지 설계로 직결됐다 —
  추측했다면 나오지 않았을 분기다.
- **외부 리뷰 엔진은 설치 여부와 가용성이 다르다.** `command -v codex`는 성공하는데
  런타임에 capacity 오류로 실패했다. probe 체인은 **존재**만 보므로, 실행 실패 시
  다음 엔진으로 내려가고 그 사실을 기록에 남겨야 리뷰의 vendor 분리 수준이 드러난다.
- **세션이 죽으면 브랜치가 갈라지고, 갈래는 조용히 작업을 삼킨다.** 두 브랜치가 각각
  리뷰를 돌리고 각각 고쳐서, 어느 한쪽만 택하면 다른 쪽 수정이 사라지는 상태가 됐다.
  합칠 때 **"더 앞선 쪽을 택한다"가 아니라 union을 확인**해야 한다 — 실제로 40→39 diff에서
  dedupe 테스트가 "삭제"로 보였고, 39 쪽 코드를 통째로 택했다면 그대로 없어졌을 것이다.

## PR

- **PR #68** — `ao/harness-aijient-team-plugin-40/doctor-eager-global` → `main`
  (PR #67은 이 브랜치로 합병 후 close)
- 리뷰 덱: `docs/diagrams/pr/pr-68-doctor-eager-global.html` (슬라이드 3장, 자립형 inline SVG)
- task 다이어그램: **미옵트인** — AO 워커는 옵트인 질문을 수행할 수 없어 plan에 체크박스를
  추가하지 않았다(체크박스 없음 = 옵트인 안 함 상태).

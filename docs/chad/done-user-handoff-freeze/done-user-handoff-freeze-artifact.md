# done-user-handoff-freeze — Artifact

*최종 결과물과 학습 내용을 기록한다.*

## 결과

### 무엇을 고쳤나

`harness-team done` 이후 `docs/<user>/<user>-handoff.md` 가 종결된 task 를 계속
`## Active Task` 로 가리킨 채 영구히 얼어붙던 구조적 결함을 제거했다.
원인·설계 판단은 `done-user-handoff-freeze-spec.md` 에 있다.

- `src/commands/task.mjs`
  - `renderUserHandoff({ user, task, date, commitMsg, closed })` — 이 파일의 **유일한 렌더러**를
    순수 함수로 export. 활성 형태와 종결 형태를 한 곳에서 만든다.
  - `runHandoffAuto` — 인라인 문자열 조립을 렌더러 호출로 교체 (활성 형태 출력은 바이트 동일).
  - `runDone` — 가드 **뒤**의 공유 tail 에서 종결 형태를 1회 쓴다. `handoff updated:` 로그도
    사용자 handoff 경로를 함께 보고한다.
- `tests/user-handoff.test.mjs` — 신규 15케이스 (적대적 리뷰·오케스트레이터 지시 반영 후).
- `CHANGELOG.md` — Unreleased / Fixed 항목.

### 선택: (A) — `runDone` 1회 갱신

브리프가 제시한 두 후보 중 (A) 를 택했다. (B)(`runHandoffAuto` early return 제거)를 기각한 근거:

1. **노이즈** — post-commit 훅이 매 커밋 이 함수를 부른다. 활성 없는 기간의 모든 커밋이
   이 파일을 재작성한다 (spec R4 위반).
2. **재료 부족** — active 가 `null` 이면 이 함수는 **가리킬 task 를 모른다.**
   `## Full Context` 포인터를 만들 입력 자체가 없다.

상태 전이(종결)를 상태를 아는 지점에서 1회 기록하는 쪽이, 커밋 스트림에서 매번 추론하는 것보다 단순하다.

### 쓰기 지점이 가드 뒤인 이유

`runDone` 의 차단 경로는 `:590` 에서 반환한다. 쓰기를 그 앞에 두면 **차단된 `done` 이**
**"활성 없음"을 선언**하게 된다 — `.harness/active.json` 은 여전히 task 를 가리키는데
진입점만 비는 셈이라, 고치려던 것과 같은 종류의 거짓말이 된다.
`--force` 는 tail 로 흘러가므로 갱신된다 (실제로 종결되기 때문). 이 세 갈래를 테스트가 각각 고정한다.

### 출력 형식

`bbbc885`(PR #56)가 세운 decay 하지 않는 형식을 따른다 — 고정 sha 금지, Active/Completed 분리,
task handoff 포인터. 다만 포인터의 **제목**은 `bbbc885` 의 `## Last Commit` 대신
`## Full Context` 를 쓴다: `runHandoffAuto` 가 **같은 포인터**를 이미 그 이름으로 부르고 있고,
종결 시점에는 박을 수 있는 낡지 않는 sha 가 없어 `Last Commit` 섹션 자체를 내지 않는 것이 맞다.
`bbbc885` 가 명시한 세 성질은 모두 지키면서 도구 자신의 출력과 내부 일관성을 유지한다.

```
# Session Handoff

## Active Task
없음 — `.harness/active.json` 은 `null` 이다.
새 작업은 `harness-team task <name>` 으로 시작한다.

## Last Completed Task (2026-08-28)
`<task>` — done

## Full Context
→ docs/<user>/<task>/<task>-handoff.md
```

이 파일을 **파싱하는 코드는 없다** (`grep -rn 'Active Task' src/ hooks/ commands/ skills/`
→ 생성 지점 하나뿐). 섹션 제목은 사람이 읽는 용도이며 기계 계약이 아니다.

### RED / GREEN 증거

렌더러를 먼저 넣고 `runHandoffAuto` 만 배선한 상태(=행동 변화 없음)에서 테스트를 돌려
**행동상의 RED** 를 받았다. 모듈 로드 실패가 아니라 실제 결함이 실패로 드러난 상태다.

**RED** — `node --test tests/user-handoff.test.mjs` (수정 전, `runDone` 미배선):

```
ℹ tests 12
ℹ pass 6
ℹ fail 6
✖ done 성공 → Active Task 가 더는 종결된 task 를 가리키지 않는다
✖ done 성공 → 종결된 task 는 Last Completed Task 로 분리 표기된다
✖ done 성공 → 고정 sha 없이 task handoff 포인터를 남긴다 (decay 방지)
✖ 사용자 handoff 파일이 없어도 done 이 만들어 준다
✖ done 성공 → 갱신 사실을 stdout 으로 알린다
✖ done --force → 실제로 종결되므로 사용자 handoff 도 갱신된다

  AssertionError: Active Task 본문이 종결된 task 를 가리키면 안 된다: "demo"
```

실패한 6개는 모두 `runDone` 경로다. 통과한 6개가 의미 있는 대조군이다 —
차단 시 무변경(R2)과 활성 없음 조기 return 은 **결함 전에도 옳았고**, 렌더러 단위 테스트는
이미 통과했다. 즉 RED 는 정확히 결함이 있는 곳만 가리킨다.

**GREEN** — 같은 명령, `runDone` 배선 후:

```
ℹ tests 12
ℹ pass 12
ℹ fail 0
```

이후 적대적 리뷰 P2 와 오케스트레이터 지시로 3케이스를 더했다 (훅 no-op 직접 검증 ·
활성 형태 바이트 동등 · **연속 종결**) → 15/15 GREEN. 연속 종결 케이스는 `first`→`second`→
`third` 를 차례로 종결하며 매번 `Last Completed Task` 가 최신으로 바뀌고 앞선 task 의 흔적이
남지 않음을 확인한다 — 현장에서 9건이 연달아 종결됐는데 파일이 그 앞 task 에 멈춰 있던
모습이 정확히 이 회귀다.

**전체 회귀** — `npm test`:

```
ℹ tests 451
ℹ pass 450
ℹ fail 0
ℹ skipped 1
✔ boundary performance: cold 85.2ms = 1.10x baseline; checkpoint 124.5ms = 1.61x baseline
```

기존 450개가 그대로 통과한다 — `runHandoffAuto` 리팩터가 활성 형태 출력을 바꾸지 않았다는 증거다.

**리팩터 안전성의 직접 증거**는 두 가지다. (1) 위 기존 450개가 그대로 통과한다.
(2) `origin/main` 의 인라인 템플릿을 소스에서 뽑아 같은 입력으로 렌더한 결과와
`renderUserHandoff(..., closed:false)` 의 출력을 프로그램으로 대조해 **동일**을 확인했다:

```
--- origin/main template literal ---
"# Session Handoff\n\n## Active Task\n${task}\n\n## Last Commit (${date})\n${commitMsg}\n\n## Full Context\n→ docs/${user}/${task}/${task}-handoff.md\n"
--- identical? --- true
```

테스트 파일의 바이트 동등 케이스는 이 대조의 **사본**이라 그 자체로는 순환이다 —
`origin/main` 을 읽지 않기 때문이다. 그 케이스의 역할은 "리팩터가 안전했다"의 증명이 아니라
**앞으로 활성 형태가 소리 없이 바뀌지 않게 고정**하는 것이다.

### 남은 기존 결함 — `runDone` 의 종결 쓰기는 원자적이지 않다 (범위 밖, 백로그)

이 task 에서 고치지 않았다. **이 변경이 만든 결함이 아니라** 그 전부터 있던 것이고,
진짜 해결은 저널/트랜잭션인데 이 리포에 그런 기제가 없다. 잊히지 않게 여기 남긴다.

`runDone` 은 성공 경로에서 네 번 쓴다. 전부 별개의 `await` 이고 롤백도 fsync 도 없다:

1. `appendFile` — task handoff 에 `## <ts> — 완료` append (`task.mjs:632`)
2. `writeTaskMeta` — `<name>-meta.json` 에 `status: 'done'`, `closedAt` (`task.mjs:635`)
3. `writeFile` — 사용자 handoff 를 종결 형태로 (`task.mjs:644`, **이 변경이 추가한 단계**)
4. `writeActive` — `.harness/active.json` 을 `null` 로 (`task.mjs:648`)

중간에 실패하면 남는 불일치:

| 실패 지점 | 남는 상태 | 증상 |
|---|---|---|
| 2 실패 | task handoff 에 완료 항목, meta 는 `open`, active 는 그대로 | 재시도하면 완료 항목이 **중복 append** 된다 |
| 3 실패 | meta 는 `done` 인데 사용자 handoff 는 활성 형태, active 도 그대로 | `summary` 는 done 으로 렌더하는데 세션 게이트는 활성으로 안내한다. 재시도 시 완료 항목 중복 |
| 4 실패 | 사용자 handoff 는 "활성 없음", `active.json` 은 여전히 task 를 가리킴 | 진입점과 활성 포인터가 정면으로 어긋난다 |

특히 **4 실패는 이 변경으로 성격이 바뀐다.** 이전에는 사용자 handoff 를 아예 안 썼으므로
4 가 실패해도 파일은 (낡은 채로) 조용했다 — 즉 불일치가 *보이지 않았다.* 이제는 파일이
"활성 없음"을 선언하므로 어긋남이 드러난다. 관측 가능해진 것이지 새로 생긴 것은 아니다.

재시도가 안전하지 않은 지점이 1·2 사이의 완료 항목 append 라, 고치려면 append 를
멱등하게 만들거나(같은 `closedAt` 이면 건너뛴다) 상태 전이를 하나의 저널에 모아야 한다.
**후속 task 로 만들지 않았다** — 오케스트레이터가 백로그로 사람에게 올린다.

### 다이어그램

미실행 — 옵트인 단계이고 이 task 에서는 선택되지 않았다. AO 워커 세션은 비대화형이라
생성 시점의 옵트인 질문(`AskUserQuestion`)을 할 수 없다. plan 에 다이어그램 단계를 넣지 않았다.

## Reviews
*Codex/Gemini 등 리뷰 실행 시 결과(요약·발견·조치)를 날짜와 함께 남긴다. 남기지 않은 리뷰는 "안 한 것"으로 간주.*
*기계 판독용 마커를 함께 남긴다: `<!-- harness:review kind=codex scope=worktree tip=<sha|none> at=<ISO8601> -->`*


### 2026-08-28 — Codex **적대적 리뷰** (`codex exec --sandbox read-only`, scope: diff against `origin/main`)

`/harness-adversarial-review codex`. 프레이밍은 "결함이 있는가"가 아니라 **"이 변경이 거부되어야
할 이유가 있는가"** — 설계 선택 (A)/(B), 가드 대비 쓰기 위치, 테스트가 자기충족적인지,
리팩터의 활성 형태 보존을 각각 공격하게 했다.

**판정: changes requested — P1 blocker 없음.** 접근 자체는 살아남았다.

리뷰어가 명시적으로 인정한 것:
- `runDone` 1회 쓰기가 훅 early return 제거보다 낫다 — 최종 task 정체를 알고, 비활성 기간의 재작성이 없다.
- 쓰기가 가드 뒤인 것이 옳다 — 차단된 실행이 상태를 거짓말하지 않는다.
- 종결 테스트는 자기충족적이지 않다 — `origin/main` 에 대고 돌리면 실패한다(실제로 RED 로 확인).
- 활성 형태 출력이 리팩터 전 템플릿과 바이트 동일하다 — 회귀 없음.

**발견과 판별:**

| # | 심각도 | 지적 | 판별 | 조치 |
|---|---|---|---|---|
| 1 | P2 | 테스트가 `runHandoffAuto` 의 no-active early return 을 고정하지 못한다 — "조기 return 유지" 테스트가 실제로는 `runDone` 을 부른다 | **진짜 결함** (재현: `tests/user-handoff.test.mjs:181` 이 `runDoneCapture` 호출). early return 을 지워도 통과했다 — (B) 기각의 근거인 R4 계약이 무방비였다 | **수정함** — `runHandoffAuto` 를 직접 부르는 테스트 추가. 보장 범위는 "훅이 종결 형태를 덮어쓰지 않는다"이며, 픽스처에 git 레포·task 디렉터리가 없어 실패 지점까지 특정하지는 않는다 |
| 2 | P2 | 사용자 handoff 쓰기가 실패하면 task handoff append·meta `done` 은 이미 끝났고 `active.json` 은 아직 활성이라 상태가 모순된다. 재시도 시 완료 항목이 중복된다 | **관찰은 타당하나 이 변경이 만든 것이 아니다.** 수정 전에도 `appendFile` → `writeTaskMeta` → `writeActive` 는 원자적이지 않았다(2단계 실패 시 같은 모순). 이 변경은 그 창에 한 단계를 더할 뿐이고, 쓰기 대상 `docs/<user>/` 는 task 디렉터리의 부모라 존재가 보장된다 | **수정 안 함 — 범위 밖.** 진짜 해결은 저널/트랜잭션이고 이 리포에 그런 기제가 없다. 기존 결함으로 보고한다 |
| 3 | P3 | 동시 실행 시 낡은 훅이 종결 형태를 활성 형태로 되살릴 수 있다 | **이론적.** `AGENTS.md` D4 가 같은 워킹트리·브랜치의 쓰기를 단일 스레드로 못 박는다. 리뷰어도 blocker 가 아니라고 분류했다 | **수정 안 함** — 규범이 이미 배제하는 시나리오에 락을 도입하지 않는다 |

추가로 리뷰어가 제안한 "렌더러가 활성 형태 불변식을 직접 단언해야 한다"를 받아들여,
리팩터 전 템플릿 사본과 **바이트 단위 동등**을 고정하는 테스트를 넣었다.

리뷰어 환경 한계: read-only 샌드박스라 `mkdtemp` 가 `EPERM` 으로 막혀 파일 fixture 8케이스를
돌리지 못했다(순수 렌더러 4케이스는 통과). 그 8케이스는 이 세션에서 실행해 GREEN 을 확인했다.

<!-- harness:review kind=codex-adversarial scope=diff tip=7bd8be6aa7eb8f7586801c43fbbe50f79e4de3bf at=2026-08-28T07:45:00Z -->


## Learnings

- **동결의 원인은 "빠뜨린 갱신"이 아니라 두 함수의 맞물림이다.** `runDone` 이 활성을 비우는
  행위 자체가, 그 파일을 쓰는 유일한 경로의 진입 조건을 없앤다. 한쪽만 보면 둘 다 정당해
  보인다 — 훅이 활성 task 를 요구하는 것도, `done` 이 활성을 비우는 것도. 결함은 **전이 순간에**
  생기고, 그래서 상태 전이를 아는 지점이 그 순간을 기록해야 한다.
- **"생성물인데 아무도 안 만드는 구간"이 있으면 사람이 손으로 메우게 된다.** `bbbc885` 가 정확히
  그 손질이었다. 그 손질이 필요했다는 사실 자체가 도구 결함의 신호였다.
- **차단된 명령이 부분 효과를 남기면 안 된다.** 가드 앞뒤 어디에 쓰느냐가 이 수정의 핵심이었다.
  실패 경로가 상태를 절반만 바꾸면, 그 절반이 다음 세션에게는 진실로 보인다.

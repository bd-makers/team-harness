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
- `tests/user-handoff.test.mjs` — 신규 12케이스.
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

**전체 회귀** — `npm test`:

```
ℹ tests 451
ℹ pass 450
ℹ fail 0
ℹ skipped 1
✔ boundary performance: cold 85.2ms = 1.10x baseline; checkpoint 124.5ms = 1.61x baseline
```

기존 450개가 그대로 통과한다 — `runHandoffAuto` 리팩터가 활성 형태 출력을 바꾸지 않았다는 증거다.

### 다이어그램

미실행 — 옵트인 단계이고 이 task 에서는 선택되지 않았다. AO 워커 세션은 비대화형이라
생성 시점의 옵트인 질문(`AskUserQuestion`)을 할 수 없다. plan 에 다이어그램 단계를 넣지 않았다.

## Reviews
*Codex/Gemini 등 리뷰 실행 시 결과(요약·발견·조치)를 날짜와 함께 남긴다. 남기지 않은 리뷰는 "안 한 것"으로 간주.*
*기계 판독용 마커를 함께 남긴다: `<!-- harness:review kind=codex scope=worktree tip=<sha|none> at=<ISO8601> -->`*


## Learnings

- **동결의 원인은 "빠뜨린 갱신"이 아니라 두 함수의 맞물림이다.** `runDone` 이 활성을 비우는
  행위 자체가, 그 파일을 쓰는 유일한 경로의 진입 조건을 없앤다. 한쪽만 보면 둘 다 정당해
  보인다 — 훅이 활성 task 를 요구하는 것도, `done` 이 활성을 비우는 것도. 결함은 **전이 순간에**
  생기고, 그래서 상태 전이를 아는 지점이 그 순간을 기록해야 한다.
- **"생성물인데 아무도 안 만드는 구간"이 있으면 사람이 손으로 메우게 된다.** `bbbc885` 가 정확히
  그 손질이었다. 그 손질이 필요했다는 사실 자체가 도구 결함의 신호였다.
- **차단된 명령이 부분 효과를 남기면 안 된다.** 가드 앞뒤 어디에 쓰느냐가 이 수정의 핵심이었다.
  실패 경로가 상태를 절반만 바꾸면, 그 절반이 다음 세션에게는 진실로 보인다.

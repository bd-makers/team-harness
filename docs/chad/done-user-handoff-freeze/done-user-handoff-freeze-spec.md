# done-user-handoff-freeze — Spec

## 목적 / 요구사항

`harness-team done` 이후 `docs/<user>/<user>-handoff.md` 가 **영구히 동결**되는 구조적 결함을 고친다.

### 근본 원인 (소스로 확인)

두 함수가 맞물려 생긴 구멍이다. 특정 task 의 문제가 아니라 구조적이다.

1. `runDone` (`src/commands/task.mjs:598-608`) — **task** handoff
   (`docs/<user>/<task>/<task>-handoff.md`) 에만 `## <ts> — 완료` 를 append 하고
   `writeActive(ctx.targetDir, null)` 로 활성을 비운다.
   `docs/<user>/<user>-handoff.md` 는 **한 번도 건드리지 않는다.**
2. `runHandoffAuto` (`src/commands/task.mjs:666-668`) — `if (!active || !active.task) return;`
   으로 즉시 반환한다. 그런데 사용자 handoff(`:692` `userHandoffPath`)를 쓰는 **유일한** 경로가
   이 함수이고, post-commit 훅이 이 함수를 부른다.

맞물린 결과: `done` 직후 활성이 `null` 이 되므로 그 뒤 어떤 커밋도 사용자 handoff 를 갱신하지
못한다. 파일은 **마지막 활성 커밋 시점 상태로 얼어붙고**, `## Active Task` 는 이미 종결된
task 를 계속 가리킨다.

`writeActive(…, null)` 호출부는 리포 전체에서 `runDone` 한 곳뿐이므로(`grep -rn 'writeActive(' src/`
→ `:202` 활성화, `:233` 활성화, `:606` 종결), 종결 경로는 이 하나다. 여기만 고치면 완결된다.

### 왜 고쳐야 하나

`AGENTS.md` "세션 시작 시 (반드시 수행)" 1번이 이 파일을 **세션 진입점**으로 규정한다.
동결된 파일은 다음 세션을 이미 끝난 작업으로 안내한다. 2026-08-28 오케스트레이터 세션이 실제로
이 증상을 만났다 — `chad-handoff.md` 는 `verify-evidence-gate` 를 Active Task 로 선언하고 있었는데
`.harness/active.json` 은 존재하지도 않았다. PR #56 의 AO 리뷰(스레드 `PRRT_kwDOSD3QEM6dFU8u`)가
같은 상태를 잡았고, 커밋 `bbbc885` 는 파일 내용만 손으로 정정한 채 도구 수정은 범위 밖으로 남겼다.

**계약은 옳다. 구현이 계약을 못 지킨 것이다** — `AGENTS.md` 는 건드리지 않는다.

### 요구사항

- R1. `done` 이 성공적으로 종결하면 사용자 handoff 가 **더는 종결된 task 를 활성으로 선언하지 않는다.**
- R2. `done` 이 **가드에 걸려 차단되면** 사용자 handoff 는 **바이트 단위로 그대로**여야 한다
      (차단된 종결이 "활성 없음"을 선언하면 고치려는 거짓말과 같은 종류의 거짓말이 된다).
- R3. 출력 형식은 `bbbc885` 가 세운 **decay 하지 않는 형식**과 일관돼야 한다 —
      고정 sha 금지, `Active Task` 와 `Last Completed Task` 분리, task handoff 포인터.
- R4. 활성 task 가 없는 기간의 **모든 커밋이 이 파일을 다시 쓰지 않는다** (diff 소음 금지).

## 설계 / 접근

### 선택: (A) `runDone` 이 종결 시점에 1회 갱신

두 후보가 있었다.

- **(A) 채택** — `runDone` 이 가드 통과 후 사용자 handoff 를 **1회** 종결 형태로 다시 쓴다.
- **(B) 기각** — `runHandoffAuto` 의 early return 제거. post-commit 훅이 **모든 커밋마다** 이
  함수를 부르므로, 활성 task 가 없는 기간의 모든 커밋이 이 파일을 재작성한다 (R4 위반).
  게다가 active 가 `null` 이면 이 함수는 **가리킬 task 를 모른다** — `## Full Context` 포인터를
  만들 재료 자체가 없다. 상태 전이(종결)를 상태를 아는 지점(`runDone`)에서 1회 기록하는 것이
  커밋 스트림에서 매번 추론하려는 것보다 단순하다.

### 쓰기 지점 — 가드 **뒤**, 공유 tail

`runDone` 의 차단 경로는 `:590` 에서 반환한다. 사용자 handoff 쓰기는 그 **뒤**,
task handoff append 옆(공유 tail)에 둔다. 그래야 R2 가 구조적으로 보장된다.
`--force` 경로는 tail 로 흘러가므로 갱신된다 (종결이 실제로 일어나기 때문).

### 렌더러 1개로 통일

같은 파일을 두 지점(`runHandoffAuto`, `runDone`)이 서로 다른 모양으로 쓰면 반드시 어긋난다.
순수 함수 `renderUserHandoff({ user, task, date, commitMsg, closed })` 를 export 하고 양쪽이 부른다.
새 추상화가 아니라 이 파일의 기존 관례다 — `parsePorcelainPaths`·`classifyChangedPaths`·
`parseReviewMarkers` 가 모두 export 된 순수 헬퍼이고 직접 단위 테스트를 갖는다.

### 종결 형태의 섹션 구성

```
# Session Handoff

## Active Task
없음 — `.harness/active.json` 은 `null` 이다.
새 작업은 `harness-team task <name>` 으로 시작한다.

## Last Completed Task (YYYY-MM-DD)
`<task>` — done

## Full Context
→ docs/<user>/<task>/<task>-handoff.md
```

`bbbc885` 는 포인터를 `## Last Commit` 아래 뒀지만, `runHandoffAuto` 는 **같은 포인터**를 이미
`## Full Context` 로 부르고 있다. 종결 형태에서는 `## Full Context` 를 쓰고 `Last Commit` 섹션은
아예 내지 않는다 — 종결 시점에 박을 수 있는 **낡지 않는 sha 가 없기** 때문이다(R3).
`bbbc885` 가 명시한 세 성질(고정 sha 금지·Active/Completed 분리·task handoff 포인터)은 모두 지키면서
도구 자신의 출력과 내부 일관성을 유지한다.

이 파일을 파싱하는 코드는 없다(`grep -rn 'Active Task' src/ hooks/ commands/ skills/` →
`task.mjs:696` 생성 지점 하나뿐). 섹션 제목은 사람이 읽는 용도이며 기계 계약이 아니다.

## Ontology
*이 task가 다루는 핵심 개념의 정의.*

- **사용자 handoff (`docs/<user>/<user>-handoff.md`)**: 세션 진입점. `AGENTS.md` 가 세션 시작 시
  첫 번째로 읽으라고 규정한 파일. **도구 소유 생성물**이며 손으로 관리하는 SSOT 가 아니다 —
  `runHandoffAuto` 가 `writeFile` 로 통째로 덮어쓴다.
- **task handoff (`docs/<user>/<task>/<task>-handoff.md`)**: 그 task 의 커밋 이력 정본. **append-only**.
  사용자 handoff 는 여기를 가리키는 포인터일 뿐 이력을 복제하지 않는다.
- **종결 형태 (closed form)**: 활성 task 가 없는 상태의 사용자 handoff. 활성 형태와 달리
  `Last Completed Task` 를 갖고 `Last Commit` sha 를 갖지 않는다.
- **decay 하지 않는 형식**: 파일이 다시 갱신되지 않아도 낡지 않는 표기. 고정 sha 는 커밋 즉시
  낡으므로 금지하고, 계속 갱신되는 task handoff 로 포인터를 돌린다.

## Ambiguity 자가진단

- [x] **Goal 명확도** (40%) — `done` 이후 사용자 handoff 가 종결된 task 를 활성으로 선언하지 않게 한다.
- [x] **Constraint 명확도** (30%) — `src/commands/task.mjs` + `tests/` 만. `AGENTS.md` 계약·집계 원장
      (`docs/task_summary.md`, `docs/chad/chad-task.md`) 불가침. 출력 형식은 `bbbc885` 와 일관.
- [x] **Success 기준** (30%) — 회귀 테스트가 수정 전 RED / 수정 후 GREEN. R1~R4 를 각각 고정.
- [x] **Context 명확도** (brownfield) — `runDone`(:577-609), `runHandoffAuto`(:666-716),
      dirty 가드 제외 목록(:534-539), `tests/done-guard.test.mjs` 패턴.
- [x] **Ambiguity ≤ 0.2** — 가중합 1.0.

## Done evidence

```json
{ "version": 1, "review": "required" }
```

## 참고
- 원인 규명: worker-35 (PR #56 작업 중) → 오케스트레이터 독립 확인 → 브리프
- 형식 기준 커밋: `bbbc885` (PR #56)
- 열린 리뷰 스레드: `PRRT_kwDOSD3QEM6dFU8u` (#56 에서 의도적으로 열어 둠 — 실제 수정이 들어가는 이 PR 에서 닫힌다)

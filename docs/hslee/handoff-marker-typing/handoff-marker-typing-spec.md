# handoff-marker-typing — Spec

## 목적 / 요구사항

**오늘 무엇이 안 되는가.** task handoff 의 완료 마커는 생산자와 소비자가 **서로 다른 모듈에
손으로 복사한 리터럴 하나로만** 묶여 있고, 그 계약을 지키는 테스트가 없다.

- 생산자: `src/commands/task.mjs:684` — `runDone` 이 `` `\n## ${ts} — 완료\n\n태스크 종료.\n` `` 을 append.
- 소비자: `src/commands/summary.mjs:54` — `inferLegacyMeta` 가 `/^##\s.*—\s*완료\s*$/m` 로 판정.
- 둘을 잇는 테스트: **없음.**

**실측(이 task 착수 전 probe 로 재현).** 생산자의 em-dash(`—`)를 하이픈(`-`)으로 바꾸면:

| 관측 | 값 |
|---|---|
| meta.json 없음 + 원장 행 없음 + 마커가 유일 증거인 task 의 `collectTasks` 판정 | `done` → **`open` 으로 오분류** |
| 같은 상태에서 전체 유닛 스위트 | **609 tests / 608 pass / 0 fail** — 아무도 못 잡음 |

**영향받는 대상.** meta.json 이 없는 레거시 task(= `inferLegacyMeta` 경로) 중 아직 원장
(`docs/task_summary.md`)에 행이 없는 것. `task`/`done` 은 원장을 건드리지 않고 기본 브랜치의
`summary --write` 만 갱신하므로(AGENTS.md D5), 브랜치에서 종결됐고 원장이 아직 재생성되지 않은
레거시 task 가 정확히 이 조합이다.

**기대 결과.** 마커의 생성과 판독이 **한 선언에서 나오고**, 생산자만 바뀌면 테스트가 반드시
깨진다. 동시에 **이미 디스크에 쓰인 과거 형태를 계속 읽는다.**

**제약.**
- 동작 변경 없음. `runDone` 이 append 하는 바이트는 **오늘과 동일해야 한다** — 기존 handoff 파일과
  섞여 쌓이는 append-only 파일이라 형식이 바뀌면 과거 항목과 어긋난다.
- 소비자 정규식의 **느슨함을 좁히지 않는다.** 현재 `^##\s.*—\s*완료\s*$` 는 `## 2026-01-01 — 완료`
  (날짜만, `tests/summary.test.mjs:208` 의 실제 fixture)처럼 ISO 타임스탬프가 아닌 과거 형태도
  받아들인다. 좁히면 이미 쓰인 파일이 조용히 `open` 이 된다 — 지금 고치려는 것과 같은 사고다.
- 범위는 **완료 마커 하나**다. post-commit 이 쌓는 `## <ISO> — <sha oneline>` + diffstat 항목은
  **소비자가 하나도 없으므로**(전수 확인) 스키마를 주지 않는다.

## 설계 / 접근

새 모듈 `src/handoff-marker.mjs` 하나를 만들고 두 지점이 그것을 쓴다.
`src/` 루트의 단일 목적 모듈(`fsx`·`member`·`render`·`observation`) 관례를 따른다.
`task.mjs` 는 이미 `summary.mjs` 를 import 하므로 방향 문제는 없지만, 생산자 관심사를
집계 모듈에 넣지 않기 위해 별도 모듈로 둔다.

```
src/handoff-marker.mjs
  renderDoneMarker(isoTs) → append 할 블록 (생산자)
  hasDoneMarker(content)  → 완료 마커 존재 판정 (소비자)
```

- `task.mjs:684` → `appendFile(handoffPath, renderDoneMarker(ts))`
- `summary.mjs:54` → `(handoff && hasDoneMarker(handoff))`

**드리프트를 막는 것은 모듈이 아니라 두 종류의 테스트다.** 모듈만 만들면 누군가
렌더러와 정규식을 같이 바꿔 과거 파일을 못 읽게 만들 수 있다.

1. **왕복(round-trip)** — `hasDoneMarker(renderDoneMarker(ts))` 가 참.
   → *생산자 드리프트*를 잡는다. 위 실측 뮤테이션이 이 테스트에서 반드시 깨진다.
2. **동결 fixture(frozen literal)** — 렌더러에서 생성하지 **않은** 하드코딩된 과거 마커 문자열을
   `hasDoneMarker` 가 받아들인다. ISO 형태와 날짜만 형태 둘 다.
   → *소비자 드리프트*를 잡는다. 정규식을 좁히면 깨진다.
3. **바이트 모양 고정** — `renderDoneMarker` 의 오늘 출력 바이트를 그대로 못박는다.
   `renderUserHandoff` 의 기존 테스트(`tests/user-handoff.test.mjs:282`) 관례와 같다.

**그리고 위 셋만으로는 부족하다 — 그것들은 전부 *모듈 계약*이다.** 호출부가 helper 를 버리고
제 문자열을 쓰거나(생산자) 마커 판정을 그만두면(소비자) 셋 다 통과한다. **선언을 모으는 것과
호출부가 그 선언을 쓰는 것은 별개의 계약이고 각각 테스트가 필요하다.**
(2026-09-06 Codex 리뷰 P2 2건 — 뮤테이션으로 재현해 확인.)

4. **호출부 통합(생산자)** — `runDone` 을 **실제로 실행**해 handoff 에 append 된 바이트가
   `renderDoneMarker(그 시각)` 출력과 같은지 대조한다. `runDone` 이 helper 를 우회하면 깨진다.
5. **호출부 통합(소비자)** — `meta.json` 도 원장 행도 없이 **동결 리터럴** 마커만 둔 레거시
   task 를 `collectTasks` 가 `done` 으로 읽는지 확인한다. `inferLegacyMeta` 가 마커 판정을
   그만두면 깨진다. 착수 전 결함을 재현한 probe 를 그대로 테스트로 굳힌 것이다.

## Ontology

- **완료 마커(done marker)**: `runDone` 이 task handoff 끝에 1회 append 하는 블록.
  `## <시각> — 완료` 헤딩 + 본문 `태스크 종료.`. task 가 종결됐다는 **파일 상의 증거**이며,
  meta.json 이 없는 레거시 task 에서는 원장과 함께 완료 판정의 유이한 근거다.
- **타입화(typing)**: 이 task 에서는 "정적 타입 주석"이 아니라 **형식을 한 곳에 선언하고
  생성·판독이 그 선언에서 나오게 만드는 것**을 뜻한다. 판정 기준은 셋이다 — 손으로 복사한
  리터럴이 0개인가, 생산자 단독 변경이 테스트를 깨는가, 그리고 **호출부가 그 선언을 우회해도
  테스트가 깨는가**. 셋째가 없으면 "모듈은 있는데 아무도 안 쓰는" 상태를 막지 못한다.
- **과거 형태(historical shape)**: 이전 버전이 이미 디스크에 써 둔 마커. 렌더러가 더는 만들지
  않아도 **소비자는 계속 받아들여야 한다** — 하위 호환은 "안 건드림"이 아니라 같은 계약을
  다른 증거로 지키는 것이다.
- **범위 밖 — 커밋 항목(commit entry)**: post-commit 훅이 쌓는 `## <ISO> — <sha oneline>` +
  diffstat. 소비자 전수 조사 결과 파싱하는 코드가 없어 이 task 에서 타입화하지 않는다.

## Ambiguity 자가진단

- [x] **Goal 명확도** (40%) — "완료 마커의 생성·판독을 한 선언으로 모으고, 생산자 단독 변경이
      테스트를 깨게 만든다." 실측 뮤테이션이 완료 기준을 객관적으로 정의한다.
- [x] **Constraint 명확도** (30%) — append 바이트 동일 · 정규식 느슨함 유지 · 범위는 완료 마커 하나.
- [x] **Success 기준** (30%) — ① em-dash→하이픈 뮤테이션이 테스트를 깬다 ② 과거 형태 2종이
      계속 파싱된다 ③ 전체 스위트 통과 ④ 손복사 리터럴 0개 ⑤ **호출부가 실제로 그 모듈을
      쓰는지** — `runDone`/`inferLegacyMeta` 가 helper 를 우회해도 테스트가 깬다.
- [x] **Context 명확도** (brownfield) — 생산자 1곳(`task.mjs:684`) · 소비자 1곳(`summary.mjs:54`) ·
      fixture 2곳(`tests/summary.test.mjs:37,208`) 전수 확인 완료.
- [x] **Ambiguity ≤ 0.2** — 가중합 1.0.

## Done evidence

```json
{ "version": 1, "review": "required" }
```

## 참고

- 실측 probe: 뮤테이션(`—`→`-`) 시 `collectTasks` 가 `status=open` 반환, 609 테스트 전부 통과.
- 소비자 전수 조사: `grep -rn "handoff" src | grep -E "match|includes|split|test\(|RegExp"`
  → `summary.mjs:54`(완료 마커) · `migrate.mjs:191`(`## Artifact` 분리 — 생산자·소비자가 같은
  파일 안, 0.6→0.7 일회성 경로라 이번 범위 밖).
- 기존 관례: `renderUserHandoff`(`src/commands/task.mjs:125`) — 단일 렌더러 + 바이트 모양 테스트.
- 권고 ⑦ 원문: `.claude/handoffs/2026-09-05-1330-harness-pdf-6layer-comparison.md:26`
  "handoff 타입화(TCC와 중복 검토 선행)".
- TCC 중복 검토 결과: TCC(`taskContextTemplate` + `validateContextCard`)가 재개용 working set을
  결정론적 검사와 함께 이미 소유한다 → handoff 에 재개 구조를 주는 갈래는 **중복이라 기각**.
  남은 것은 TCC 와 겹치지 않는 기계 판독 계약뿐이고, 그중 소비자가 있는 것은 완료 마커 하나다.

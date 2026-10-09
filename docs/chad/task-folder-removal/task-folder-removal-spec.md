# task-folder-removal — Spec

> **범위: C2a(비파괴)** — 2026-10-09 사람 답으로 C2를 둘로 나눴다. 이 task는 폴더를 읽는 장치의 입력 이전만 한다.
> 폴더 삭제(C2b)는 후속 task다(`## 참고`의 `(open → C2b)`).
> 출처 표기: `(cycle §n)` = `docs/harness-cycle.md`, `(brief)` = 오케스트레이터 브리프, `(answer)` = 2026-10-09 사람 답, `(code)` = 코드 확인 결과.

## 목적 / 요구사항
*문제(오늘 무엇이 안 되는가) → 영향받는 사용자·시스템 → 기대 결과 → 제약 순으로 쓴다.
답 없는 질문은 요구가 아니다 — `## 참고` 절에 `- (open) …`으로 남긴다.*

**문제** (cycle §4-4, code): task 폴더는 종결 뒤에도 영원히 남는다. 이 저장소에만 150개(`docs/chad/` 101 · `docs/hslee/` 49, origin/main `8bf264f`)가
쌓였고, 하네스의 여러 장치(원장·done-on-main nudge·`list --remote`·이름 충돌 판정)가 **"폴더가 있다"를 사실의 출처로 쓴다.**
그래서 C1(#135·#136)이 위키라는 "기억" 자리를 만들었는데도 폴더를 지울 수 없다 — 지우는 순간 원장 행이 사라지고 nudge가 조용히 꺼진다(아래 영향 표).
영향받는 사람: 팀원(원장·nudge로 남의 작업을 본다)과 하네스를 설치한 소비자 저장소.

**기대 결과** (answer Q1-C): 폴더가 **있어도 없어도** 원장·done-on-main nudge·`list --remote`·`task`가 같은 답을 낸다.
이 task가 머지돼도 오늘 저장소의 동작은 바뀌지 않는다(지금은 done 원장 행마다 폴더가 있다 — 2026-10-09 150행 전부 확인).
그래야 C2b가 폴더를 지울 때 깨지는 장치가 없다.

**요구**
- R-1 (answer Q4-A) 원장을 렌더 결과이자 **입력**으로 쓴다: 커밋된 `docs/task_summary.md`의 `✅ done` 행 중 폴더가 없는 task는 `summary --write`가 행을 그대로 이어받는다 —
  상태·⚠️ 우회 표시·생성일·Area 칸, 그리고 user index의 `✅` 줄까지. `🔄 open` 행 + 폴더 없음은 종전대로 빠진다(손으로 버린 task).
- R-2 (code) 원장에서만 온 task(이하 ledger-only)는 **summary 렌더에만** 쓴다. migrate(`backfillTaskMeta`·`--adopt-reviews`) 등 다른 소비자는 지금처럼 폴더 있는 task만 본다 —
  그러지 않으면 migrate가 meta를 새로 써서 지운 폴더를 되살린다(`migrate.mjs:857–869`).
- R-3 (answer Q5-A) done-on-main 판정: default ref에 그 task의 meta가 없으면 default ref의 원장 `✅ done` 행으로 판정한다. 이때 종결 시각(`closedAt`)은
  default ref에서 그 task 디렉터리를 마지막으로 건드린 커밋의 committer 시각이다(answer Q8-A — git 이력). 읽지 못하면 null.
- R-4 (answer Q5-A) `list --remote`: default ref 원장에 `✅ done` 행이 있는 task는 default ref에 폴더가 없어도 branch-only가 아니다.
- R-5 (answer Q6 수정) `task <name>`: 로컬 커밋된 원장에 `<user>/<name>`의 `✅ done` 행이 있고 **task 폴더도 없을 때만** 거부한다.
  폴더가 있으면 기존 reopen 흐름·nudge 문구·`reopenedAt > closedAt` 판정을 그대로 둔다.
- R-6 (answer Q5-A) observe의 task_ref 역해석은 바꾸지 않는다 — 폴더가 지워진 task는 익명으로 남는 것을 허용한다.
- R-7 (cycle §5 2차 장치 규칙) 새 장치를 넣기 전에 빼거나 줄이는 안을 검토하고 기각 사유를 설계 절에 남긴다.

**제약**
- 런타임 의존성 0, `gh`·네트워크 의존 없음 — 원격 판정은 fetch 없이 로컬 `refs/remotes/*`만 읽는다(지금 `remote-task.mjs`와 같다, `GIT_NO_LAZY_FETCH` 계약 포함). Node ≥ 24.
- 비파괴: 폴더를 지우는 코드·명령·문서 절차를 넣지 않는다. 기존 테스트는 고치지 않고 통과해야 한다(새 동작 테스트만 추가).
- 원장은 계속 결정론 생성물이다 — `summary --check` 바이트 대조가 성립하고, 4열 원장(Area 없음)은 지금과 바이트 단위로 같다.
- `done` 가드(`task.mjs:856`)·`pr-check`·`wiki sources`·D11 PR 4문서 강제는 바꾸지 않는다.
- 버전 범프·매니페스트 버전 수정은 범위 밖. CHANGELOG는 `## [Unreleased]` 항목 추가까지.

**위험 (사람이 수용)**
- 위키가 기억이 된다는 가정은 아직 미검증이다(C1 릴리스 2026-10-07, 위키 컴파일 2/150). 그래서 삭제는 C2b로 미뤘다(answer Q1-C) — 이 task는 그 가정에 기대지 않는다.

## 원천 검토 (R1)
*원천 문서(PRD·Figma·API 문서·기획서·정책서) 사이의 충돌·누락·모순을 Plan 전에 검토한다(`/harness-interview`).
충돌·모순은 `(unresolved)`, 누락은 `(open)`으로 적고, `→ 결정: …`으로 해결한 뒤 재대조해 `- 검토 완료: <날짜>`로 닫는다.
원천이 없으면 `- 없음 — <사유>` 한 줄. 원천 위치는 프로젝트가 정한다.*

### 원천
- (cycle) docs/harness-cycle.md §4-4 · §4-5 · §4-6 · §5 · §6
- (decision) docs/decisions.md D5 · D8 · D11
- (task) docs/chad/wiki-compile/wiki-compile-spec.md — C1 계약(R-5 "추가만", R-6 멱등 키, 위험 절)
- (task) docs/chad/wiki-fence-nested/ — C1 후속(#136)
- (wiki) wiki/index.md · wiki/90_system/compile-rules.md
- (brief) 오케스트레이터 브리프 2026-10-09 — 열린 질문 (a)(b)(c)

### 발견
- F1 착수 시점 — §6은 "C1 → C2" 순서만 정하고 간격을 정하지 않는다. 1.0 조건은 "소비자 저장소에서 한 릴리스 이상"이다.
  → 결정(2026-10-09, 사람, Q1-C): 비파괴 입력 이전(C2a, 이 task)은 지금. 삭제(C2b)는 C1이 소비자 저장소 1곳 이상에서 한 릴리스 이상 돈 뒤 착수.
- F2 삭제 범위 — §4-4 "task 폴더는 삭제한다"(전부) 대 위키 컴파일은 D11 "제공"(선택).
  → 결정(2026-10-09, 사람, Q2-A·Q3-A): C2b는 `wiki sources`의 `compiled`가 있는 task만 지운다. 레거시 폴더는 두고, 원하는 저장소만 migrate 일회성 단계로 정리한다. 호환 기간 없음.
- F3 원장의 새 입력 — §4-4는 "옮기거나 뺀다"고만 한다.
  → 결정(2026-10-09, 사람, Q4-A): 커밋된 원장을 입력으로 승격한다(R-1·R-2).
- F4 §4-4 이전 목록에 없는 의존(nudge·`list --remote`·observe·`wiki sources`·migrate).
  → 결정(2026-10-09, 사람, Q5-A·Q7-A): nudge·`list --remote`는 default ref 원장으로 판정(R-3·R-4), observe는 익명 허용(R-6), 재컴파일은 삭제 전에만(C2b 문서 몫). migrate는 R-2.
- F5 wiki-compile R-6 멱등 키 `task=<user>/<task>`의 이름 유일성 전제.
  → 결정(2026-10-09, 사람, Q6 수정): 원장 done 행 + 폴더 없음일 때만 `task`가 거부한다(R-5). 위키 키는 바꾸지 않는다.
- F6 migrate는 pull이라 소비자가 C1 없이 C2를 만난다.
  → 결정(2026-10-09, 사람, Q3-A): C2a는 비파괴라 영향 없음. 레거시 정리·버전 혼재 경고는 C2b.
- 참고(충돌 아님): pre-push 훅은 기본 브랜치로의 push를 검사하지 않는다(`pr-check.mjs:118`) — C2b의 기본 브랜치 삭제와 D11이 양립한다.
- 재대조(결정 반영 후): Q6 수정과 nudge 복구 문구가 얽힌다 — 아래 설계 "Q6 해석" 두 항목으로 해소했고 새 원천 충돌은 없다.
- 검토 완료: 2026-10-09 — 새 발견 없음

## 설계 / 접근

**영향 표** (code, origin/main `8bf264f`) — "지운 뒤"는 C2b가 폴더를 지운 직후 무엇이 틀린 답을 내는지다. C2a 열이 이 task의 처리다.

| 장치 | 위치 | 지운 뒤 | C2a |
|---|---|---|---|
| 원장 `summary --write` | `summary.mjs:157` `collectTasks` ← `listTaskRefs` | 행·⚠️가 사라진다 | R-1 원장 입력 승격 |
| migrate | `migrate.mjs:857`(`backfillTaskMeta`)·`940` | 원장 입력을 그대로 쓰면 폴더를 되살린다 | R-2 ledger-only 제외 |
| done-on-main nudge | `remote-task.mjs:44` (소비자 `session-context.mjs:51`·`doctor.mjs:293`·`task.mjs:296`) | 조용히 꺼진다 | R-3 원장 폴백 |
| `list --remote` | `remote-task.mjs:87` `onDefault` | squash 머지 뒤 남은 브랜치의 task를 branch-only로 오탐 | R-4 |
| 이름 재사용 | `task.mjs:356` 이후 생성 경로 | 새 스캐폴드, 위키 키 충돌 | R-5 거부 |
| observe 역해석 | `observe.mjs:171` | 익명으로 남음 | R-6 변경 없음 |
| `wiki sources` | `wiki.mjs:177` | 재컴파일 불가 | 변경 없음 (C2b 문서) |
| `done` 가드·handoff·재개 후보·`pr-check`·doctor 포인터 검사 | `task.mjs:856·1193`, `session-context.mjs:24`, `pr-check.mjs:43·118`, `doctor.mjs:271` | 영향 없음 | — |

**원장 규칙 (R-1·R-2)**
- 정본은 `docs/task_summary.md`의 행이다. user index(`docs/<user>/<user>-task.md`)의 `✅` 줄은 입력이 아니다 — 둘 다 같은 tasks에서 렌더되므로 summary 행에서 다시 만든다.
- 파서는 하나다: `readLedger`(`summary.mjs:114`)의 summary 루프를 순수 함수 `parseSummaryRows(text)`로 뽑아 export한다 —
  `{ user, task, done, forced, created, area }[]`. summary·remote-task·task 가드가 같은 함수를 쓴다(`summary.mjs:106` 주석의 "리터럴 재작성" 사고 방지).
  `SUMMARY_ROW_RE`에 선택 5번째 칸(Area)을 더하되 4열 행의 매치 결과는 지금과 같다.
- `collectTasks(targetDir, { includeLedgerOnly = false } = {})`. 기본값은 지금 동작 그대로라 migrate는 고치지 않는다. `runSummary`만 `true`를 넘긴다.
  ledger-only task = 폴더(spec 마커) 없음 + 원장 `done` 행 → `{ user, task, status: 'done', created, area, forcedRecovered: forced, ledgerOnly: true }`.
- 행 순서는 기존 정렬(`byCreatedAscThenName`)을 그대로 쓴다 — 출처가 둘(폴더·원장)이어도 렌더는 결정론이다.

**done-on-main 원장 폴백 (R-3)**
- `readRemoteTaskMeta`가 meta를 못 읽으면 `git show refs/remotes/<ref>:docs/task_summary.md` → `parseSummaryRows` → 그 task 행이 `done`이면
  `{ ref, meta: { status: 'done', closedAt }, source: 'ledger' }`. `closedAt` = `git log -1 --format=%cI refs/remotes/<ref> -- docs/<user>/<task>`. 실패하면 null.
  같은 `git()` 러너(2000ms·`GIT_NO_LAZY_FETCH`)를 쓰고, 어떤 실패도 null(=nudge 없음)로 떨어진다.
- **Q6 해석 ① — 종결 시각**: 원장 행에는 시각이 없다. null로 두면 `reopenedAt > closedAt` 소음 끄기가 영영 안 돼 고의로 다시 연 stale 클론이 매 세션 nudge를 받는다.
  git 이력의 커밋 시각은 Q8-A("감사 흔적은 git 이력에")와 같은 출처다.
- **Q6 해석 ② — 문구**: meta 출처의 nudge 문구는 바꾸지 않는다(사람 지시). 원장 출처(main에 폴더 없음)일 때만 복구 안내를
  "이어가려면 새 이름으로 task를 만든다 — 원문은 `git log <ref> -- <dir>`"로 바꾼다. 기존 문구("main을 가져온 뒤 `task <name>`으로 다시 연다")를 따르면
  main을 가져오는 순간 폴더가 지워지고 R-5가 그 이름을 거부해 막힌 길을 안내하게 된다.
- `checkDoneOnMain`·`doneOnMainVerdict`의 판정 표는 그대로다 — verdict에 `source`만 실어 `renderDoneOnMainNudge`가 문구를 고른다.

**`list --remote` (R-4)**: `onDefault` 집합에 `git show <defaultFull>:docs/task_summary.md`의 `done` 행 label을 더한다. 원장을 못 읽으면 지금처럼 spec 마커만 쓴다.

**이름 재사용 가드 (R-5)**: `runTask`에서 `isTask` 판정 직후, 명령 이름·member 충돌 검사 **앞**. 조건 = `!isTask && isAbsentOrEmpty(dir) &&` 로컬 작업 트리 `docs/task_summary.md`에 `<user>/<name>` done 행.
원격 원장은 보지 않는다 — 그건 nudge 몫이고 `task-done-on-main.test.mjs:22`("생성은 막지 않는다")가 그대로 성립한다.
거부는 `emitTaskError` 패킷(cause·retry=다른 이름·alternatives=`git log -- docs/<user>/<name>`으로 원문 확인·safeDefault=아무것도 바뀌지 않음), exit 1.

**2차 장치 검토 (R-7)**
- (a) **원장을 뺀다**(위키·`git log`가 대신) — 기각: 위키는 선택이라 미컴파일 task가 빠지고, `git log` 파생은 얕은 클론에서 틀린다. 원장은 팀 가시성의 유일한 결정론 표다.
- (b) **nudge를 뺀다** — 기각: 다른 클론이 먼저 끝낸 task를 이어 쓰는 사고(done-on-main-nudge의 배경)가 남는다. C2a는 새 장치가 아니라 입력 교체다.
- (c) **`list --remote`를 뺀다** — 기각: 브랜치에만 있는 열린 task 사각지대(2026-09-08 사고)를 막는 장치다. 집합에 원장 행을 더하는 작은 수정이면 된다.
- (d) **새 기계 원장 파일**(Q4-B) — 기각(사람): `readLedger`가 이미 원장을 역파싱하므로 새 파일 없이 된다.
- (e) **observe 역해석 유지 장치** — 기각(사람, Q5-A): 진단용 보고서라 익명 task_ref가 해를 끼치지 않는다.

## Ontology
*이 task가 다루는 핵심 개념의 정의. "X가 정확히 뭔가?"에 답한다.*

- **task 폴더(작업대)**: `docs/<user>/<task>/` — SSOT 4파일 + meta·context·diagram. C2b 뒤에는 종결 커밋에서 사라질 수 있다. C2a는 그 상태를 견디게 만든다.
- **원장(ledger)**: `docs/task_summary.md`·`docs/<user>/<user>-task.md`. 여전히 생성물이지만, `task_summary.md`의 done 행은 폴더가 없을 때 **입력**도 된다. 정본은 summary 행이다.
- **ledger-only task**: 폴더(spec 마커)가 없고 원장에 `✅ done` 행만 있는 task. summary 렌더·원격 판정·이름 가드만 본다.
- **원장 폴백(ledger fallback)**: default ref에 meta가 없을 때 default ref의 원장 행으로 done-on-main을 판정하는 경로. verdict의 `source: 'ledger'`.
- **이름 재사용**: 폴더가 없는 done task의 `<user>/<name>`으로 새 task를 만드는 것 — R-5가 거부한다.
- **게이트 통과 (2026-10-09)**: 사람 답(Q1–Q10, Q6 수정) 반영 후 채점 — Goal pass("문제" + "기대 결과" 문장), Constraint pass(제약 절 + "비파괴" 범위 + 위험 절),
  Success pass(Done evidence S1–S8, 테스트 이름·명령에 묶임), Context pass(영향 표 file:line), Ontology pass(위 정의 5개). R1 검토 완료, 열린 질문은 `(open → C2b)`로 이월.

## Ambiguity 자가진단
*각 항목이 명확하면 체크. 3개 이상 미체크면 구현 진입 금지 — 인터뷰/브레인스토밍으로 복귀해
모호성을 제거한다. 게이트를 통과하면 그 근거를 위 Ontology 섹션에 한 줄로 남긴다.*

- [x] **Goal 명확도** (40%) — 목표가 한 문장으로 구체화되었는가? — 근거: 문제(폴더를 사실의 출처로 쓰는 장치 넷) + 기대 결과("폴더가 있어도 없어도 같은 답")가 한 문장씩 있다.
- [x] **Constraint 명확도** (30%) — 기술/시간/범위 제약이 명시되었는가? — 근거: 제약 절(의존성 0·fetch 없음·비파괴·원장 결정론·가드 불변) + C2b 이월 목록.
- [x] **Success 기준** (30%) — 완료를 어떻게 측정하는가? — 근거: Done evidence S1–S8 + 기존 테스트 무수정 통과.
- [x] **Context 명확도** (brownfield 한정) — 영향 받는 기존 코드/파일을 식별했는가? — 근거: 설계 절 영향 표(file:line, origin/main `8bf264f`).
- [x] **Ambiguity ≤ 0.2** — 위 항목 가중합 ≥ 0.8 — 근거: Goal·Constraint·Success·Context·Ontology 모두 pass(가중합 1.0).

<!-- 선택 선언. 아래 주석을 벗기면 done 가드가 검사한다.
     미선언 기본값: "tests": "required" (소스가 바뀌면 테스트 파일 변경을 요구), "review": "optional",
     "verify": "optional" ("required"면 검증 프레이밍 kind 마커 — -adversarial 등 — 를 요구).
     R2(옵트인): "scenarios": [{ "id", "given", "when", "then", "test", "cmd" }] — 수용 기준을 Given/When/Then으로 쓰고
     증거(테스트 이름·명령)를 잇는다. `harness-team scenario check`가 cmd exit 0을, `review <engine> --framing scenario`가
     "증거가 Then을 검증하는가"를 판정한다. 선언하면 verify 증거는 -scenario kind만 센다. -->
## Done evidence
```json
{
  "version": 1,
  "review": "required",
  "scenarios": [
    {
      "id": "S1",
      "given": "커밋된 task_summary.md(Area 열 있음)에 폴더가 없는 chad/gone 의 '✅ done ⚠️' 행(created 2026-01-02, area web)과 폴더가 있는 다른 task 행이 있다",
      "when": "summary --write 를 실행한다",
      "then": "chad/gone 행이 상태·⚠️·생성일·Area 그대로 남고 chad-task.md Completed 에 '- ✅ gone ⚠️'가 있으며, 이어서 summary --check 가 통과한다",
      "test": "summary: keeps a done ledger row whose task folder is gone",
      "cmd": "node --test --test-name-pattern=\"summary: keeps a done ledger row\" tests/summary.test.mjs"
    },
    {
      "id": "S2",
      "given": "커밋된 task_summary.md에 폴더가 없는 chad/abandoned 의 '🔄 open' 행이 있다",
      "when": "summary --write 를 실행한다",
      "then": "chad/abandoned 행이 사라진다(종전 동작)",
      "test": "summary: drops an open ledger row whose task folder is gone",
      "cmd": "node --test --test-name-pattern=\"summary: drops an open ledger row\" tests/summary.test.mjs"
    },
    {
      "id": "S3",
      "given": "원장에 폴더 없는 done 행이 있는 저장소",
      "when": "migrate --yes 를 실행한다",
      "then": "docs/<user>/<task>/ 가 생기지 않고 그 task 의 meta.json 이 없다",
      "test": "migrate: does not recreate a ledger-only task folder",
      "cmd": "node --test --test-name-pattern=\"migrate: does not recreate a ledger-only\" tests/migrate.test.mjs"
    },
    {
      "id": "S4",
      "given": "origin/main 에서 chad/x 폴더를 지운 커밋(committer 시각 T)이 있고 그 원장에 chad/x '✅ done' 행이 있으며, 로컬에는 chad/x meta 가 없다",
      "when": "checkDoneOnMain 과 renderDoneOnMainNudge 를 부른다",
      "then": "verdict 가 { ref: origin/main, closedAt: T, source: 'ledger' } 이고 문구가 새 이름 안내와 git log 근거를 담으며 'task x 로 다시 연다'를 담지 않는다. meta 가 있는 경우의 문구는 종전 테스트 그대로다",
      "test": "remote-task: falls back to the default-ref ledger when the task folder is gone",
      "cmd": "node --test --test-name-pattern=\"remote-task: falls back to the default-ref ledger\" tests/remote-task.test.mjs"
    },
    {
      "id": "S5",
      "given": "S4 와 같은 origin/main, 로컬 chad/x meta 가 open 이고 reopenedAt 이 T 보다 나중이다",
      "when": "checkDoneOnMain 을 부른다",
      "then": "null 이다(고의 재개 소음 끄기)",
      "test": "remote-task: a deliberate reopen silences the ledger-sourced nudge",
      "cmd": "node --test --test-name-pattern=\"remote-task: a deliberate reopen silences\" tests/remote-task.test.mjs"
    },
    {
      "id": "S6",
      "given": "미머지 원격 브랜치에 chad/x 폴더가 있고 origin/main 은 폴더를 지웠지만 원장에 chad/x done 행이 있다",
      "when": "list --remote 를 실행한다",
      "then": "chad/x 가 branch-only 로 나오지 않는다",
      "test": "list --remote: a task done in the default-ref ledger is not branch-only",
      "cmd": "node --test --test-name-pattern=\"list --remote: a task done in the default-ref ledger\" tests/list-remote.test.mjs"
    },
    {
      "id": "S7",
      "given": "로컬 원장에 chad/x '✅ done' 행이 있고 docs/chad/x/ 가 없다",
      "when": "task x --member chad 를 실행한다",
      "then": "exit 1, 오류 패킷이 다른 이름과 git log 를 안내하고, docs/chad/x/ 와 .harness/active.json 이 생기지 않는다",
      "test": "task: refuses to reuse the name of a done task whose folder is gone",
      "cmd": "node --test --test-name-pattern=\"task: refuses to reuse the name\" tests/task-name-reuse.test.mjs"
    },
    {
      "id": "S8",
      "given": "로컬 원장에 chad/x '✅ done' 행이 있고 docs/chad/x/ 도 있다(meta done)",
      "when": "task x --member chad 를 실행한다",
      "then": "거부하지 않고 종전대로 reopened 로 다시 연다",
      "test": "task: a done task whose folder exists still reopens",
      "cmd": "node --test --test-name-pattern=\"task: a done task whose folder exists\" tests/task-name-reuse.test.mjs"
    }
  ]
}
```

## 참고
*코드 기반 참조가 산문 설계보다 정밀하다 — 테스트 스위트·Boundary contract(JSON Schema)·
다이어그램·기존 코드 경로를 우선 링크하고, 산문은 코드로 표현 못 하는 의도만 담는다.*

- 인터뷰: 2026-10-09 비대화형 묶음 인터뷰 10문항 + 복잡도 게이트. 사람 답 = 전부 권장안, Q6만 수정("폴더도 없을 때만 거부"), Q10 다이어그램 옵트인,
  범위는 C2a로 좁힘. 질문 원본은 세션 산출물(`c2-task-folder-removal-questions.md`)이고 결정은 이 spec에 반영돼 있다.
- (open → C2b 후속 task) 착수 조건: C1 위키 컴파일이 소비자 저장소 1곳 이상에서 한 릴리스 이상 돈 뒤(Q1-C). 범위:
  삭제 결정론 하위명령 + 종결 절차 한 줄, `done` 불변(Q9-A) · 삭제 게이트 = `wiki sources`의 `compiled`(Q2-A) ·
  레거시 폴더는 두고 migrate 일회성 정리 단계, 호환 기간 없음, doctor 버전 혼재 경고, CHANGELOG Breaking(Q3-A) ·
  재컴파일은 삭제 전에만임을 `commands/harness-wiki.md`에 명시(Q7-A) · 감사 흔적은 git 이력(Q8-A) · observe 익명(Q5-A).
- (open → C2b 후속 task) 알려진 한계(2026-10-09 사람 지적): 원장 폴백의 `closedAt`(디렉터리를 마지막으로 건드린 커밋 시각)은 C2b 이후 **삭제 커밋 시각**이 된다 —
  종결과 삭제 사이에 의도적으로 다시 연 클론은 `reopenedAt < closedAt`이라 nudge가 계속 뜬다(시끄러운 쪽 오류, 침묵 쪽이 아님). C2b가 종결·삭제를 한 커밋에 담으면 간격이 없어진다.
- 코드 참조: `src/task-paths.mjs`(`listTaskRefs`) · `src/commands/summary.mjs`(`readLedger` 114 · `collectTasks` 157 · `runSummary` 323) ·
  `src/commands/remote-task.mjs`(`readRemoteTaskMeta` 44 · `doneOnMainVerdict` 60 · `renderDoneOnMainNudge` 71 · `listBranchOnlyTasks` 87) ·
  `src/commands/task.mjs`(`runTask` 296 · isTask 판정 356) · `src/commands/migrate.mjs`(`backfillTaskMeta` 856 · `collectReviewAdoptionCandidates` 938)

# task-folder-removal — Spec

> **상태: 초안(writer)** — 2026-10-09. 열린 질문 Q1–Q10(`## 참고`)에 사람의 답이 오기 전에는 plan·구현에 들어가지 않는다.
> 출처 표기: `(cycle §n)` = `docs/harness-cycle.md`, `(brief)` = 오케스트레이터 브리프, `(code)` = 코드 확인 결과.

## 목적 / 요구사항
*문제(오늘 무엇이 안 되는가) → 영향받는 사용자·시스템 → 기대 결과 → 제약 순으로 쓴다.
답 없는 질문은 요구가 아니다 — `## 참고` 절에 `- (open) …`으로 남긴다.*

**문제** (cycle §4-4): task 폴더는 종결 뒤에도 영원히 남는다. 이 저장소에만 151개(`docs/chad/` 102 · `docs/hslee/` 49, 2026-10-09 origin/main `8bf264f`)가
쌓였고, 하네스의 여러 장치(원장·done-on-main nudge·`list --remote`·observe 역해석·migrate)가 **"폴더가 있다"를 사실의 출처로 쓴다.**
그래서 C1(#135·#136)이 위키라는 "기억" 자리를 만들었는데도 폴더를 지울 수 없다 — 지우는 순간 원장 행이 사라지고 nudge가 조용히 꺼진다(아래 영향 표).
영향받는 사람: 팀원(원장·nudge로 남의 작업을 본다), 그 지식을 조회하는 LLM·RAG, 하네스를 설치한 소비자 저장소.

**기대 결과** (cycle §4-4·§6 C2): 머지 후 종결 절차에서 task 폴더를 기본 브랜치에서 지울 수 있고, 지워도 원장·`done`·handoff·nudge가
같은 답을 낸다. 원문은 git 이력과 PR에 남는다. 이것이 1.0 전 마지막 호환성 파괴 변경이다(cycle §6).

**요구** (초안 — Q1–Q3 답에 따라 범위가 바뀐다)
- R-1 (cycle §4-4) 종결된 task의 폴더 `docs/<user>/<task>/`를 **기본 브랜치의 종결 절차에서** 지운다. PR 브랜치에서는 지우지 않는다.
- R-2 (cycle §4-4) 폴더를 입력으로 읽는 장치는 삭제 **전에** 입력을 옮기거나, 필요 없으면 뺀다. 대상은 영향 표의 "파손" 행 전부다.
- R-3 (cycle §4-6·D11) PR이 담는 4문서(spec·plan·handoff·artifact) 강제는 **불변**이다. `pr-check`·pre-push 훅의 판정은 바뀌지 않는다.
- R-4 (cycle §4-4, code) 폴더를 지운 뒤에도 `summary --write`가 그 task의 원장 행(상태·생성일·⚠️ 우회 표시)을 **잃지 않는다.**
  `summary --check` 바이트 대조(결정론)는 유지한다.
- R-5 (code) 폴더를 지운 뒤에도 "이 task는 main에서 이미 종결됐다"를 판정할 수 있다(done-on-main nudge의 세 소비자 `task`·`session-context`·`doctor`).
- R-6 (unresolved — Q2) 삭제 안전장치: 삭제 전에 무엇을 결정론적으로 확인하는가.
- R-7 (unresolved — Q3) 기존 소비자 저장소·이 저장소의 레거시 폴더(151개)의 마이그레이션 경로와 호환 기간.
- R-8 (cycle §5 2차 장치 규칙) 새 장치(삭제 명령·원장 입력·nudge 대체)를 넣기 전에 기존 장치를 빼거나 줄이는 안을 검토하고 기각 사유를 설계 절에 남긴다.

**제약**
- 런타임 의존성 0, `gh`·네트워크 의존 없음(판정은 로컬 ref 기준 — 지금 `remote-task.mjs`와 같다). Node ≥ 24.
- 버전 범프·매니페스트 버전 수정은 범위 밖(릴리스 몫). CHANGELOG는 `## [Unreleased]`에 Breaking 항목 추가까지.
- `done` 가드의 판정 계약(`task.mjs:856` `collectDoneIssues`)은 바꾸지 않는다 — 삭제는 `done` **다음** 단계다(code: 가드가 작업 트리의 spec·plan·artifact·meta를 읽는다).
- 1.0 조건(cycle §6): "그 계약이 소비자 저장소에서 한 릴리스 이상 돈 뒤". C2는 1.0 **전** 변경이라 이 조건의 대상이 아니지만, Q1이 같은 기준을 C1에 적용할지 묻는다.

**위험 (사람 판단 필요)**
- 위키가 기억이 된다는 가정이 **미검증**이다. C1은 0.47.0(2026-10-07, 이틀 전)에 나왔고 컴파일 실사용은 이 저장소 dogfood 2건(#133·#134)뿐이다.
  C1 자신(#135·#136)도 아직 컴파일되지 않았다(`wiki/90_system/compile-rules.md`가 정한 `knowledge-base.md` 없음).
- 위키 컴파일은 LLM 본문이 PR 리뷰 없이 main에 들어간다(wiki-compile spec 위험 절, 2026-10-07 수용). 삭제를 컴파일에 묶으면 그 위험이 "원문 대신 남는 유일한 요약"으로 커진다.
- 팀원 간 플러그인 버전 혼재: 옛 CLI로 `summary --write`를 돌리면 폴더 없는 task의 행을 다시 지운다(code: `summary.mjs:157` `collectTasks ← listTaskRefs`).

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
- F1 (unresolved) 착수 시점 — §6은 "C1 → C2" 순서만 정하고 간격을 정하지 않는다. 1.0 조건은 "소비자 저장소에서 한 릴리스 이상"이다.
  브리프는 (a) "C1이 소비자에서 한 릴리스 이상 돈 뒤 vs 지금"을 묻는다. 사실: C1 릴리스 2일, 소비자 3곳은 0.41.2(2026-09-25), 이 머신 전역 CLI 0.45.0. → Q1
- F2 (unresolved) 삭제 범위 — §4-4는 "task 폴더는 삭제한다"(전부)라 하고, 위키 컴파일은 D11 "제공"(선택)이다.
  선택 단계를 건너뛴 task의 폴더를 지우면 그 task의 기억은 git 이력에만 남는다. 151개 중 위키에 있는 것은 2개다. → Q2·Q3
- F3 (open) 원장의 새 입력 — §4-4는 "summary 집계·done 판정·handoff의 입력을 위키와 PR 기준으로 옮기거나 뺀다"고만 한다. 어디로 옮길지 정해져 있지 않다. → Q4
- F4 (open) §4-4의 이전 목록에 없는 의존 — code에서 done-on-main nudge(`remote-task.mjs:44`), `list --remote`(`remote-task.mjs:87`),
  observe task_ref 역해석(`observe.mjs:171`), `wiki sources`(`wiki.mjs:177`), migrate(`migrate.mjs:857·940`)가 폴더를 읽는다. → Q5
- F5 (unresolved) wiki-compile R-6 — 컴파일 단락의 멱등 키는 `task=<user>/<task>`이고 "이름은 유일하다"를 전제한다.
  폴더가 사라지면 `task.mjs:389` 이름 충돌 가드와 reopen(`reopenedAt`)이 그 이름을 보지 못해, 같은 이름의 새 task가 생기고 키가 겹친다. → Q6
- F6 (open) migrate는 pull이다(§4-5) — 소비자는 C1(0.47.0)을 거치지 않고 C2를 만날 수 있다. 위키가 하나도 없는 저장소가 첫 대상이다. → Q3
- 참고(충돌 아님): pre-push 훅은 기본 브랜치로의 push를 검사하지 않는다(`pr-check.mjs:118` `prePushTargets`) — 기본 브랜치의 종결 커밋에서 지우는 한 R-3과 양립한다.

## 설계 / 접근

**영향 표** (code, origin/main `8bf264f`) — "파손"은 폴더를 지운 직후 무엇이 틀린 답을 내는지다.

| 장치 | 위치 | 지금 읽는 것 | 지운 뒤 | 후보 |
|---|---|---|---|---|
| 원장 `summary --write` | `summary.mjs:157` `collectTasks` ← `task-paths.mjs` `listTaskRefs` | 폴더 + meta | **파손** — 행이 사라진다. ⚠️는 `meta.forcedAt` 기준이라 같이 사라진다 | Q4 |
| done-on-main nudge | `remote-task.mjs:44` `readRemoteTaskMeta` (소비자 `session-context.mjs:51`·`doctor.mjs:293`·`task.mjs:296`) | `origin/<default>:<meta.json>` | **조용히 꺼진다** — meta가 없으면 verdict null | Q5 |
| `list --remote` | `remote-task.mjs:87` `onDefault` | default ref의 spec 마커 | **오탐** — squash 머지 뒤 남은 브랜치의 지워진 task가 branch-only로 뜬다 | Q5 |
| 이름 충돌·reopen | `task.mjs:389`, `runTask` reopen | 로컬 폴더·meta | **파손** — 지워진 이름을 다시 쓰면 새 스캐폴드, 위키 키 충돌 | Q6 |
| `wiki sources` | `wiki.mjs:177` | 작업 트리 meta·docs, `git log` | 삭제 전에는 정상. 삭제 후 재컴파일(R-6 "그 단락만 교체") 불가 | Q7 |
| observe 역해석 | `observe.mjs:171` | 모든 `meta.json`의 HMAC | 지워진 task의 task_ref가 이름으로 풀리지 않는다(익명으로 남음) | Q5 |
| migrate | `migrate.mjs:857`(meta 복원)·`940`(`--adopt-reviews`)·`inferLegacyMeta` | 폴더 + 원장 | 지워진 task는 대상에서 빠진다(오류 아님). 레거시 정리 단계가 새로 필요할 수 있다 | Q3 |
| `done` 가드·`runDone` | `task.mjs:856`·`1010` | 작업 트리 spec·plan·artifact·meta | 영향 없음 — 삭제가 `done` 다음이면. 단 `done`이 쓴 `closedAt`·`forcedAt`·`reviews[]`가 같은 커밋에서 지워진다 | Q8 |
| post-commit handoff | `task.mjs:1193` `runHandoffAuto` | 활성 task만 | 영향 없음 (`done`이 활성을 비운 뒤 삭제) | — |
| 재개 후보 | `session-context.mjs:24` `listIncompleteTasks` | 폴더 + meta, done 제외 | 영향 없음 — 오히려 스캔 대상이 준다 | — |
| `pr-check`·pre-push | `pr-check.mjs:43·91·118` | PR diff의 task 문서 | 영향 없음 — 통째 삭제는 이미 건너뛰고, 기본 브랜치 push는 검사 밖 | — |
| doctor 포인터 껍데기 | `doctor.mjs:271` | 활성 task spec | 영향 없음 | — |
| 문서·템플릿 | `AGENTS.md`·`templates/AGENTS.md.hbs`(동일성 `tests/agent-files.test.mjs`)·`commands/harness-task.md:174` 종결 절·`commands/harness-wiki.md`·`docs/harness-overview.html`(docs:check)·README | "task 단위 관리"·D5 집계 문구·종결 절차 | 갱신 대상 | — |

**종결 절차 순서 (code가 강제하는 부분)**: 기본 브랜치에서 `task <name>` → plan 마지막 단계 체크 → `done` → (선택) `/harness-wiki` → **삭제** → `summary --write` → 종결 커밋 하나.
삭제를 `done` 앞에 두면 `realDirty`(`task.mjs:973`)가 막는다. `summary --write`가 삭제 뒤에 오므로 R-4가 성립해야 같은 커밋이 맞는 원장을 담는다.

**권장 설계 (조건부 — 사람의 답이 오면 확정)**
- 원장은 렌더 결과이자 **입력**이다(Q4-A): `collectTasks`가 폴더 행에 더해, 이미 커밋된 원장에서 폴더가 없는 행을 그대로 이어받는다.
  `readLedger`(`summary.mjs:114`)가 이미 원장을 역파싱하므로 새 파일이 없다. 행의 출처가 둘(폴더·원장)이 되므로 정렬·바이트 결정론을 테스트로 고정한다.
- 삭제는 결정론 CLI 한 명령(Q9)이 한다 — 게이트(Q2)를 검사하고, 통과하면 작업 트리에서 폴더를 지우고 커밋은 하지 않는다(`done`·`summary --write`와 같다).
- done-on-main 판정은 default ref의 원장 행으로 옮긴다(Q5-A) — `git show refs/remotes/<ref>:docs/task_summary.md`의 `✅ done` 행. `closedAt`이 원장에 없으면 nudge는 이미 "(시각 미기록)"을 낸다(`remote-task.mjs:72`).
- 지워진 이름의 재사용은 막는다(Q6-A) — 원장에 done 행이 있는 `<user>/<task>`로 `task`를 실행하면 거부한다. 위키 키(R-6)를 바꾸지 않는다.

**2차 장치 검토 (R-8)** — 새 장치마다 "빼거나 줄이는" 안을 먼저 본다.
- (a) **원장 자체를 뺀다**(위키·`git log`가 원장을 대신) — 기각 후보: 위키는 선택이라 미컴파일 task가 빠지고, `git log` 파생은 얕은 클론에서 틀리며 렌더가 느리다. 원장은 팀 가시성(가로축)의 유일한 결정론 표다.
- (b) **done-on-main nudge를 뺀다** — 기각 후보: 다른 클론이 같은 task를 먼저 끝낸 걸 모르고 이어 쓰는 사고(done-on-main-nudge task의 배경)가 그대로 남는다. 다만 입력을 원장으로 옮기면 새 장치가 아니라 입력 교체다.
- (c) **`list --remote`를 뺀다** — 열린 질문으로 남긴다(Q5): 브랜치에만 있는 열린 task 사각지대(2026-09-08 사고)를 막는 장치라 빼기 어렵다. 원장 done 행을 `onDefault`에 더하는 작은 수정이 후보다.
- (d) **삭제 게이트를 두지 않는다**(git 이력에만 의존) — Q2-C로 사람에게 올린다. 장치가 가장 적은 안이다.
- (e) **observe 역해석을 포기한다**(지워진 task는 익명) — 채택 후보: observe 보고서는 진단용이고, 익명 task_ref가 해를 끼치지 않는다.

## Ontology
*이 task가 다루는 핵심 개념의 정의. "X가 정확히 뭔가?"에 답한다.*

- **task 폴더(작업대)**: `docs/<user>/<task>/` — SSOT 4파일 + meta·context·diagram. 작업 중과 PR 리뷰 동안만 필요하다. C2 뒤에는 종결 커밋에서 사라진다.
- **종결 커밋**: 머지 후 기본 브랜치에서 `done`·(위키)·삭제·원장 갱신을 담는 커밋 하나(`commands/harness-task.md` 머지 후 종결).
- **원장(ledger)**: `docs/task_summary.md`·`docs/<user>/<user>-task.md`. 지금은 폴더에서 렌더하는 **생성물**이다. C2에서 그 성격(생성물 대 입력)이 Q4로 정해진다.
- **레거시 task**: C2 릴리스 이전에 이미 done으로 종결돼 폴더가 남아 있는 task. 이 저장소 151개, 소비자 저장소 다수.
- **위키 커버리지**: 어떤 task의 `harness:wiki task=<user>/<task>` 마커가 `wiki/**/*.md`(펜스 밖)에 있는가 — `wiki sources`의 `compiled`가 정본이다.
- **삭제 게이트**: 폴더를 지우기 전에 결정론적으로 확인하는 조건(Q2). 실패하면 폴더는 남고 종결 자체는 막지 않는다(권장안 기준).
- **이름 재사용**: 폴더가 지워진 `<user>/<task>`로 새 task를 만드는 것. 위키 키·원장 키가 겹친다.

## Ambiguity 자가진단
*각 항목이 명확하면 체크. 3개 이상 미체크면 구현 진입 금지 — 인터뷰/브레인스토밍으로 복귀해
모호성을 제거한다. 게이트를 통과하면 그 근거를 위 Ontology 섹션에 한 줄로 남긴다.*

- [ ] **Goal 명확도** (40%) — 목표가 한 문장으로 구체화되었는가? — 미체크: 기대 결과 문장은 있으나 착수 시점(Q1)·삭제 범위(Q2·Q3)가 답에 따라 목표 자체를 바꾼다.
- [ ] **Constraint 명확도** (30%) — 기술/시간/범위 제약이 명시되었는가? — 미체크: 기술 제약은 있으나 호환 기간(Q3)·버전 혼재 대응이 열려 있다.
- [ ] **Success 기준** (30%) — 완료를 어떻게 측정하는가? — 미체크: Done evidence 시나리오는 Q2·Q4·Q5 답 뒤에 쓴다.
- [x] **Context 명확도** (brownfield 한정) — 영향 받는 기존 코드/파일을 식별했는가? — 근거: 설계 절 영향 표(13행, file:line, origin/main `8bf264f` 기준).
- [ ] **Ambiguity ≤ 0.2** — 위 항목 가중합 ≥ 0.8 — 미체크: 가중합 0(Goal·Constraint·Success 미체크).

<!-- 선택 선언. 아래 주석을 벗기면 done 가드가 검사한다.
     미선언 기본값: "tests": "required" (소스가 바뀌면 테스트 파일 변경을 요구), "review": "optional",
     "verify": "optional" ("required"면 검증 프레이밍 kind 마커 — -adversarial 등 — 를 요구).
     R2(옵트인): "scenarios": [{ "id", "given", "when", "then", "test", "cmd" }] — 수용 기준을 Given/When/Then으로 쓰고
     증거(테스트 이름·명령)를 잇는다. `harness-team scenario check`가 cmd exit 0을, `review <engine> --framing scenario`가
     "증거가 Then을 검증하는가"를 판정한다. 선언하면 verify 증거는 -scenario kind만 센다. -->
## Done evidence
<!--
```json
{ "version": 1, "review": "required", "tests": "skip" }
```
-->

## 참고
*코드 기반 참조가 산문 설계보다 정밀하다 — 테스트 스위트·Boundary contract(JSON Schema)·
다이어그램·기존 코드 경로를 우선 링크하고, 산문은 코드로 표현 못 하는 의도만 담는다.*

**인터뷰 질문** — 사람의 답을 기다린다(2026-10-09, 비대화형 세션이라 묶음으로 올린다). ★ = 브리프가 지정한 핵심 질문.
- (open) ★Q1 (a) 착수 시점 — A: 지금 구현 / B: C1이 소비자 저장소 1곳 이상에서 한 릴리스 이상 돈 뒤 / **C(권장): 비파괴 부분(원장 입력·nudge·이름 재사용 가드)만 지금, 삭제 스위치는 B 조건 뒤.**
  근거: 원장·nudge 이전은 폴더가 있어도 같은 답을 내므로 지금 넣어도 깨지지 않고, 삭제만이 "위키가 기억"이라는 미검증 가정 위에 선다.
- (open) ★Q2 (b) 삭제 안전장치 — **A(권장): task 단위 게이트 — `wiki sources`의 `compiled`가 비지 않은 task만 지우고, 미컴파일이면 폴더를 남긴다(종결은 막지 않음)** /
  B: 전수 검사 — 위키가 모든 task를 포함해야 삭제(이 저장소 149건 백필 필요) / C: 게이트 없음 — git 이력·PR만 믿는다.
  근거: A는 위키 컴파일을 강제하지 않으면서(D11 제공) 기억 없는 삭제를 막는다. B는 LLM 본문의 리뷰 없는 main 커밋 149회다.
- (open) ★Q3 (c) 레거시·소비자 마이그레이션과 호환 기간 — **A(권장): 레거시 폴더는 기본적으로 그대로 둔다. 원하는 저장소만 migrate의 일회성 단계로 정리한다(§4-5 pull·상태 기준, 지원 창 없음).
  호환 기간은 두지 않고 CHANGELOG Breaking + doctor가 버전 혼재를 경고** / B: migrate가 레거시를 일괄 삭제(위키 백필 없음, git 이력만) / C: 한 릴리스 동안 옛·새 원장 이중 읽기.
  근거: 소비자는 C1 없이 C2를 만날 수 있고(F6), 일괄 삭제는 되돌리려면 git 이력을 뒤져야 한다. 버전 혼재(옛 CLI의 `summary --write`)는 호환 기간으로 막을 수 없다.
- (open) Q4 원장의 입력 — **A(권장): 커밋된 원장을 입력으로 승격 — 폴더 없는 행 보존** / B: 새 기계 원장 파일 / C: 위키 마커에서 렌더(미컴파일 task 누락) / D: `git log`에서 파생(얕은 클론에서 틀림).
- (open) Q5 done-on-main nudge·`list --remote`·observe — **A(권장): nudge와 `onDefault`를 default ref의 원장 done 행으로 판정, observe는 지워진 task를 익명으로 둔다** / B: default ref의 삭제 커밋(`git log --diff-filter=D`) / C: nudge 제거.
- (open) Q6 지워진 이름의 재사용 — **A(권장): 원장에 done 행이 있는 이름은 `task`가 거부(위키 키 불변)** / B: 위키 마커 키에 `pr=`를 더한다(wiki-compile R-6 계약 변경) / C: 허용하고 reopen으로 간주.
- (open) Q7 삭제 후 재컴파일 — **A(권장): 재컴파일은 삭제 전에만 가능함을 수용** / B: `wiki sources`가 git 이력(`<sha>^:`)에서 읽도록 확장.
- (open) Q8 감사 흔적(`closedAt`·`forcedAt`·`reviews[]`) — **A(권장): git 이력(종결 커밋의 부모)에만 남기고, 원장의 ⚠️ 표시만 유지** / B: 원장 행 또는 위키 마커에 `forced`·`closedAt` 칸 추가.
- (open) Q9 삭제 실행 주체 — **A(권장): 새 결정론 하위명령 하나(이름은 plan에서), 종결 절차에 한 줄 추가, `done`은 불변** / B: `done --remove` 플래그 / C: `/harness-wiki` 스킬의 마지막 단계.
- (open) Q10 이 task의 다이어그램 옵트인 — 신규 task 생성 직후 1회 묻는 규약이지만 비대화형 세션이라 묻지 못했다. **권장: 옵트인** — 종결 절차·원장 입력의 구조가 바뀐다.
- (open) 복잡도 게이트(CLAUDE.md §5-A) — 영향 파일이 5개를 넘는다(summary·remote-task·task·wiki·migrate·observe + 문서·템플릿). Q1-C면 **task 둘로 나눈다**(C2a 입력 이전 · C2b 삭제) — 범위 승인 필요.
- (open → Q2·Q4 답 뒤) Done evidence의 scenarios 선언.

**코드 참조**
- 경로 조립 정본: `src/task-paths.mjs` (`listTaskRefs`·`taskDirRel`)
- 원장: `src/commands/summary.mjs` `readLedger`(114)·`collectTasks`(157)·`inferLegacyMeta`(75)
- 원격 판정: `src/commands/remote-task.mjs` `readRemoteTaskMeta`(44)·`listBranchOnlyTasks`(87)·`checkDoneOnMain`(142)
- 종결: `src/commands/task.mjs` `collectDoneIssues`(856)·`runDone`(1010)·이름 충돌 가드(389)
- 위키: `src/commands/wiki.mjs` `wikiSources`(177), `commands/harness-wiki.md`
- PR 검사: `src/commands/pr-check.mjs` `changedTaskRefs`(43)·`prePushTargets`(118)

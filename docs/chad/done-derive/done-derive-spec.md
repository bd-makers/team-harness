# done-derive — Spec

## 목적 / 요구사항

**문제.** 종결 절차가 "PR/MR 머지 → 기본 브랜치에서 plan 마지막 체크 → `harness-team done` → `summary --write` →
`chore(task): <name> 종결` 커밋"이다(`commands/harness-task.md` §머지 후 종결). 종결 하나가 추적 파일 세 종류
(plan 체크박스 · `<name>-meta.json`의 `status`/`closedAt` · 원장 `docs/task_summary.md`·`docs/<user>/<user>-task.md`)를
바꾸므로 task마다 머지 뒤 커밋이 하나 더 생긴다. 이 저장소는 main에 직접 넣어 최근 main 30커밋 중 8개가 종결 커밋이고,
기본 브랜치가 보호된 소비자 저장소에서는 종결 하나에 **MR이 하나 더** 필요하다. 팀원·프로젝트가 늘수록 MR 수와
"종결 커밋만 달랑 있는 MR"이 비례해 는다. (interview)

**영향받는 사람·시스템.** 하네스를 쓰는 모든 팀원(보호 브랜치 저장소에서 특히), 그리고 meta `status`를 읽는
`summary`·`session-context`·`remote-task`(done-on-main nudge·`list --remote`)·`doctor`·`clean`·`wiki`·`migrate`. (interview·코드 조사)

**기대 결과.** 종결이 **별도 커밋 없이** 성립한다 — 종결 상태를 기록하지 않고 git 상태에서 파생한다.
머지 뒤 문제가 생기면 다시 열어(reopen) 새 브랜치·MR로 고친다. (interview)

### 요구사항

- **R1 파생 종결** — task가 ref R에서 "종결됨" ⇔ 다음 중 하나:
  1. R의 `<name>-plan.md`에 줄머리 미완 체크박스가 없고(`planHasOpenBoxes`가 false — 내용 없는 `- [ ]`도 미완으로 센다)
     **줄머리 체크된 체크박스(`- [x]`)가 하나 이상** 있다. plan이 없거나, 비었거나, 체크박스가 하나도 없으면 **open**이다.
  2. 아래 R3의 우회 기록이 유효하다.
  3. 레거시 meta `status: "done"`이다(재개 이력 없음).

  판정 함수는 한 곳에 두고 모든 소비자가 그것을 쓴다. (interview·spec 검토)
- **R1-a 다중 MR task** — 종결은 "머지 시점에 plan이 전부 체크됨"으로 **암묵적으로** 성립한다. 여러 MR에 걸친 task는 이후 단계를
  **미리 plan에 적어 둔다**(미완 `- [ ]`로 남김) — 그래야 중간 MR 머지가 종결로 판정되지 않는다. plan 계약("하지 않은 단계를 미리 켜지 않는다")과
  같은 선상의 규칙으로 `commands/harness-task.md`·AGENTS.md plan.md 계약에 명시한다. 장치는 추가하지 않는다. (spec 검토)
- **R2 기준 ref** — 팀·클론 간 판정("이 task는 종결됐는가")의 R은 기본 브랜치 원격 추적 ref(`resolveDefaultRef`, fetch 없음)다.
  origin이 없으면 로컬 기본 브랜치, git이 아니면 작업 트리. 기본 브랜치 위에서 실행하는 `summary --write`는 작업 트리를 R로 쓴다. (interview)
- **R3 `done`은 검증 명령** — `harness-team done`은 기존 가드(`collectDoneIssues`)를 돌리고, 활성 포인터를 비우고,
  user handoff(워크트리 로컬·gitignore)를 쓴다. **추적 파일은 쓰지 않는다.** 예외: `--force`로 실제 issue를 무시하면
  meta에 `forcedAt`·`forcedIssues`를 남긴다(감사 흔적 — 사용자가 같은 MR에 커밋한다). 이 우회 기록은 `forcedAt > reopenedAt`(또는 `reopenedAt` 없음)일 때만 종결로 센다. (interview)
- **R4 종결 시점 = ship** — plan의 마지막 단계(현재 관례 "커밋·PR")는 **MR 생성 전에** 켤 수 있도록 "ship 완료"로 재정의한다.
  흐름: 구현 → `/harness-ship`(문서 정합) → 마지막 단계 체크 → `harness-team done`(가드) → 커밋 → push/MR → 머지 = 종결. 머지 뒤 할 일은 없다.
  ship과 done은 **분리를 유지**한다 — `/harness-ship`은 done을 실행하지 않고, 끝에 "마지막 단계 체크 → `done` → 커밋" 순서를 안내한다. (interview)
- **R5 리뷰 수정 라운드** — 머지 전 같은 브랜치의 수정은 reopen 없이 한다. `task <name>`은 R(기본 브랜치)에서 종결되지 않은 task를
  **activate**만 한다(plan을 바꾸지 않음). 수정 후 다시 ship 하면 된다. (interview)
- **R6 reopen** — `task <name>`은 지금처럼 R에서 종결된 task를 다시 연다. 명시적 `harness-team reopen <name>` 하위명령을 **선택지로** 추가한다 —
  같은 전이를 하되 R에서 종결된 task에만 동작하고, 아니면 아무것도 쓰지 않고 exit 1. 재개 전이는 `reopenedAt` 기록 +
  레거시 `status`를 `open`으로 + plan `## 단계`에 미완 항목 `- [ ] 재개: <사유>` 추가(사유 미지정 시 기본 문구) — 이 미완 항목이
  R1 판정을 open으로 되돌린다. 출력은 `reopened:` 하나로 통일. (interview)
- **R7 가드 강제 지점** — `pr-check`가 **plan이 전부 체크된 task**에 대해 done 가드를 같이 돌린다 — 체크박스만 켜서 가드를 건너뛰는 경로를 막는다.
  - **pre-push에서만** 돌린다: 검사 rev가 HEAD이고 작업 트리가 깨끗할 때 기존 `collectDoneIssues`(작업 트리·`git log`)를 그대로 쓴다.
    CI·다른 rev에서는 지금처럼 문서 존재만 본다(가드를 rev 기준으로 리팩터하지 않는다). `--no-verify` 우회는 허용된 한계다.
  - **유효한 우회 기록이면 통과**: meta `forcedAt`이 있고 `reopenedAt`보다 나중(또는 재개 이력 없음)이면 가드 issue를 경고로만 낸다.
  - plan에 미완 단계가 남은 task(진행 중·다중 MR task)는 지금처럼 문서 존재만 본다. (interview — 사용자 선택 "pr-check에서도 검사"·"pre-push만"·"유효한 우회 기록이면 통과")
- **R8 원장 분리** — 원장은 추적 파일로 유지하되 종결 절차에서 뺀다. 원장은 R1 파생 결과로 렌더한다. 갱신 트리거는 **문서 권고만** 둔다 —
  "기본 브랜치에서 필요할 때 `summary --write`"(이 저장소는 릴리스 때 돌리는 관례). 자동화 장치·doctor 경고는 두지 않는다. (interview — 사용자 선택 "묶어서 갱신"·"문서 권고만")
- **R9 소비자 이전** — meta `status`를 직접 읽는 곳을 R1 판정으로 바꾼다: `summary.mjs`(렌더)·`session-context.mjs:34`·
  `remote-task.mjs`(원격 판정·nudge 침묵 조건)·`doctor.mjs`(done on main)·`clean.mjs:283`·`wiki.mjs:215`(not-done blocker)·`migrate.mjs:979`. (코드 조사)
- **R10 `clean` 기준** — `clean`은 **R(기본 브랜치)에서 종결된** task만 거부한다. ship했지만 머지되지 않은(MR 거절·폐기) task는 되돌릴 수 있다. (interview)
- **R11 호환** — 기존 task(meta `status: "done"`) 판정이 바뀌지 않는다. 옛 절차(머지 후 main에서 `done` + 종결 커밋)를 그대로 해도 오류가 아니다
  (결과가 같음 — 단지 불필요). 팀원 일부가 옛 CLI여도 새 CLI의 판정이 옛 meta를 그대로 읽는다. (interview)
- **R12 문서·결정** — `docs/decisions.md` D11에 **정정 문단**(`(2026-11-xx 정정: …)`, 기존 tests-optional·handoff 정정과 같은 형식)을 더하고
  기각 대안 "`done` → PR로 순서 변경" 줄을 고친다(근거: 보호 브랜치 저장소의 MR 증가, D11의 기각 사유가 원칙이 아닌 구현 비용). D5의 원장 갱신 문구 갱신.
  `commands/harness-task.md`(§머지 후 종결 · done · reopen · 원격 done nudge)·`commands/harness-ship.md`(done 분리 유지, 끝에 종결 순서 안내 추가)·
  AGENTS.md(완료 절)·`templates/` 사본·CHANGELOG. (코드 조사·interview)
- **제약** — 기준 ref는 fetch하지 않는다(기존 `remote-task.mjs` 계약) — 판정은 "마지막 fetch 시점의 기본 브랜치"다. 새 의존성 없음. 기존 테스트(`npm run test`) 전부 통과. (코드 조사)
  - **허용된 한계 — fetch 지연**: 머지 뒤 fetch하지 않은 클론에서 `task <name>`은 reopen 대신 activate한다(`reopenedAt`·재개 항목 없음).
    다시 ship하면 같은 판정으로 수렴해 결과는 무해하고, 재개 이력만 빠진다. `commands/harness-task.md`에 "재개 전에 기본 브랜치를 fetch" 권고로 명시한다. (spec 검토)

## 범위 (In / Out)
- **In**: R1 판정 함수 신설과 R9 소비자 이전 · `done`의 추적 파일 쓰기 제거(`--force` 감사 흔적 제외) · `reopen` 하위명령 · `task <name>`의 reopen 판정 기준을 R2로 ·
  `pr-check`의 done 가드 실행 · `clean` 기준 · plan 마지막 단계 문구(템플릿·문서) · R12 문서 · 테스트.
- **Out**: 원장의 추적 중단(사용자가 "묶어서 갱신" 선택 — 원장 폴백·이름 재사용 가드를 재설계하지 않는다) ·
  task 폴더 삭제(C2b, `docs/harness-cycle.md` §4-4 — 별도 결정) · 종결 상태를 git notes·태그·외부 시스템(MR 라벨)에 저장(UI 비가시·fetch 기본 제외·D11 비범위로 기각) ·
  meta 스키마에서 `status`·`closedAt` 필드 제거(읽기 호환을 위해 남긴다 — 제거는 별도 migrate 결정).

## 원천 검토 (R1)

### 원천
- (conversation) 2026-11-18 세션 대화 — MR 이후 종결 커밋 비효율 제기, 파생 종결·reopen 옵션 합의, 가드 위치·원장 정책 선택
- (local) `docs/decisions.md` D5·D11
- (local) `commands/harness-task.md` §머지 후 종결 · §원격 done nudge
- (local) `commands/harness-ship.md`

### 발견
- D11 본문은 "종결 순서는 PR → 머지 → 기본 브랜치에서 `done`을 유지"하고 기각 대안에 "`done` → PR로 순서 변경"이 있다 ↔ 이 task는 종결을 ship 시점 파생으로 바꾼다.
  D11의 기각 사유는 "손볼 장치가 많다"(구현 비용)였다. → 결정: D11 정정 문단으로 갱신한다(R12).
- `commands/harness-ship.md:15` "이 명령 안에서 done을 실행하지 않는다" ↔ R4(마지막 단계 체크와 `done` 가드가 ship 시점에 일어남).
  → 결정: ship·done 분리를 유지하고, ship 끝에 "마지막 단계 체크 → `done` → 커밋" 순서만 안내한다(R4·R12).
- 재대조: `pr-check`가 CI에서도 불린다(D11 "ship·git pre-push 훅·CI가 같은 검사를 부른다") ↔ R7 가드는 pre-push에서만.
  → 결정: CI에서는 문서 존재 검사만 그대로 두고, 가드는 HEAD·깨끗한 트리 조건에서만 돈다 — D11의 "확인은 결정론적 검사 하나"와 충돌하지 않는다(같은 명령, 조건부 검사)(R7).
- 검토 완료: 2026-11-18 — 새 발견 없음

## 설계 / 접근

**상태 모델.** 저장된 상태 대신 계산한다.

| 상태 | 정의 (R = 기본 브랜치 ref) |
|---|---|
| open | R에서 R1 불충족 (task가 R에 없거나, plan에 미완 단계, 또는 plan 없음·빈 plan·체크박스 없는 plan) |
| shipped (파생 전용·저장 안 함) | 현재 브랜치에서 R1 충족, R에서는 불충족 — 머지 대기 |
| closed | R에서 R1 충족 |
| reopened | closed였던 task에 재개 전이 → plan에 미완 항목이 생겨 다시 open |

**판정 함수(가칭 `taskClosure(targetDir, user, task, { ref })`).** 입력: ref의 plan.md·meta.json(`git show <ref>:<path>`, `GIT_NO_LAZY_FETCH`·timeout은 `remote-task.mjs` 정책 재사용) 또는 작업 트리.
출력: `{ closed: boolean, source: 'plan' | 'forced' | 'legacy-meta' | 'ledger', closedAt }`. `closedAt`은 그 task 디렉터리를 R에서 마지막으로 건드린 커밋의 committer 시각
(현 원장 폴백과 같은 방식, `remote-task.mjs:74-78`). 레거시 meta의 `closedAt`이 있으면 그것을 쓴다.

**`done`.** `collectDoneIssues`는 그대로 쓴다. `writeTaskMeta(... status:'done', closedAt)` 호출을 제거하고, `--force`로 issue를 무시한 경우에만 `forcedAt`·`forcedIssues`를 쓴다.
plan의 체크박스만 바뀐 dirty 면제(`isCheckboxOnlyChange`)는 유지 — ship에서 "마지막 체크 → done → 커밋" 순서를 허용한다.

**`pr-check`.** pre-push 경로에서 검사 rev가 HEAD이고 작업 트리가 깨끗하면, 변경된 task 중 plan이 R1을 충족하는 것에 `collectDoneIssues`를 돌린다(리팩터 없음).
유효한 `forcedAt`이 있으면 issue를 경고로 낮춘다. 그 외(CI·다른 rev)는 기존 문서 검사만.

**reopen.** 기존 `runTask`의 reopened 전이(`task.mjs:453-484`)를 함수로 빼서 `task <name>`과 `reopen <name>`이 공유한다. 판정 입력을 로컬 meta `status`에서 R1(ref=R)로 바꾼다.

**원장.** `summary.mjs` 렌더가 meta `status` 대신 판정 함수를 부른다. 기본 브랜치 제한(`summary.mjs:258-271`)은 그대로.

**구현에서 정한 것 (2026-11-19, ship).** 위 설계에서 달라졌거나 구체화된 점 — 근거는 artifact `## Reviews`.
- 판정은 두 층이다. 순수 판정 `closureFromContent({ plan, meta })`(소비자 — summary·session-context·wiki·migrate — 는 task마다 git을 부르지 않도록 이것을 쓴다)와
  ref 판정 `taskClosure(…, { ref })`(`src/task-closure.mjs`). ref 경로는 `<ref>:./<rel>`(`refPath`) — 하네스를 하위 디렉터리에 설치해도 같은 파일을 읽는다.
- 원장 폴백은 `closureAtRef`(`remote-task.mjs`) 한 곳이다 — R에 meta가 없으면 R의 원장 `✅ done` 행으로 종결(`ledger` = 폴더 삭제, `legacy-ledger` = 폴더가 남은 구 task).
  재개·clean·원격 nudge가 공유한다.
- R 해석은 `resolveClosureRef` 한 곳이다 — 원격 추적 기본 브랜치 → origin 없으면 로컬 `main`/`master` → 없으면 작업 트리. 원격 nudge는 다른 클론의 종결을 알리는 것이라 origin만 본다.
- 재개 조건 = R에서 종결 ∧ 작업 트리에서 종결 ∧ R의 종결이 마지막 `reopenedAt` 뒤(`closedSinceReopen`). 셋째 조건이 없으면 재개 → re-ship → 머지 전 수정 라운드에서
  또 재개한다. clean도 같은 비교로 "재개 MR 머지 전 재개 task"를 종결 거부가 아니라 `--base` 분기로 보낸다. 같은 초는 가를 수 없어 재개하지 않는 쪽이다.
- `done`은 plan이 없으면 막는다(`plan.md가 없음`) — plan이 없으면 머지해도 종결되지 않는다(R1).
- 원장의 ⚠️(우회 종결) 표시는 유효한 우회 기록(`forcedIsValid` — `forcedAt` > `reopenedAt`)일 때만 붙는다. `done`이 meta를 더 이상 지우지 않아,
  재개 전의 옛 `forcedAt`이 남은 채 정상 종결한 task에 ⚠️가 잘못 붙는 것을 막는다.
- migrate의 meta 보강은 원장에서 추론한 사실(`status`)만 옮기고 plan 파생 값을 굳히지 않는다. 리뷰 증거 채택 후보는 기록으로 닫힌 task만 뺀다(판단 보류 — artifact P2-6).
- plan 템플릿은 바꾸지 않았다 — 템플릿에 마지막 단계 문구가 없다. "ship 완료"는 문서 관례다.

## Ontology

- **종결(closed)**: 기본 브랜치 ref에서 그 task의 plan에 미완 체크박스가 없고 체크된 체크박스가 하나 이상인 상태(또는 유효한 `--force` 우회 기록, 또는 레거시 meta `done`). 기록이 아니라 계산값이다. 머지가 곧 종결이다. 빈 plan·체크박스 없는 plan·plan 없음은 open이다.
- **ship**: 브랜치에서 plan 마지막 단계("ship 완료")를 켜고 `done` 가드를 통과시켜 커밋하는 행위. 종결의 **선언**이고, 머지가 종결의 **성립**이다.
- **shipped**: 브랜치에서는 R1 충족, 기본 브랜치에서는 아님 — 머지 대기. 저장하지 않는다.
- **`done`**: 종결을 기록하는 명령이 아니라 종결 조건을 검증하고 로컬 활성 상태를 정리하는 명령.
- **reopen(재개)**: 기본 브랜치에서 종결된 task를 다시 여는 전이. `reopenedAt` 기록 + plan에 미완 단계 추가. `task <name>`과 `reopen <name>` 둘 다 수행, 후자는 종결된 task에만.
- **원장(ledger)**: `docs/task_summary.md`·`docs/<user>/<user>-task.md`. 판정 결과를 렌더한 생성물. 종결 절차와 무관하게 묶어서 갱신한다.
- **유효한 우회 기록**: meta `forcedAt`이 있고 `reopenedAt`보다 나중(또는 재개 이력 없음). 종결 판정(R1)과 pre-push 가드 통과(R7)에 같은 정의를 쓴다.
- 게이트 통과 근거 (2026-11-18 `/harness-interview`): Goal·Constraint·Success·Context·Ontology 전부 pass — R1 발견 3건 결정 반영(D11 정정 문단·ship 분리 유지·CI는 문서 검사만), 가드 범위 pre-push, 원장 트리거 문서 권고, force 우회 통과 정의.

## Ambiguity 자가진단
*각 항목이 명확하면 체크. 3개 이상 미체크면 구현 진입 금지 — 인터뷰/브레인스토밍으로 복귀해
모호성을 제거한다. 게이트를 통과하면 그 근거를 위 Ontology 섹션에 한 줄로 남긴다.*

- [x] **Goal 명확도** (40%) — 목표가 한 문장으로 구체화되었는가? — 문제: "종결 하나에 MR이 하나 더 필요하다", 결과: "종결이 별도 커밋 없이 성립한다"
- [x] **Constraint 명확도** (30%) — 기술/시간/범위 제약이 명시되었는가? — R7(pre-push만·우회 기록 통과), R11 호환, "제약"(fetch 없음·새 의존성 없음), Out 범위
- [x] **Success 기준** (30%) — 완료를 어떻게 측정하는가? — Done evidence 시나리오 S1~S5
- [x] **Context 명확도** (brownfield 한정) — 영향 받는 기존 코드/파일을 식별했는가? — R9·R12에 파일·라인 열거
- [x] **Ambiguity ≤ 0.2** — 위 항목 가중합 ≥ 0.8 — 1.0 (`/harness-interview` 2026-11-18 채점)

<!-- 선택 선언. 아래 주석을 벗기면 done 가드가 검사한다.
     미선언 기본값: "tests": "optional" ("required"면 소스가 바뀔 때 테스트 파일 변경을 요구), "review": "optional",
     "verify": "optional" ("required"면 검증 프레이밍 kind 마커 — -adversarial 등 — 를 요구).
     R2(옵트인): "scenarios": [{ "id", "given", "when", "then", "test", "cmd" }] — 수용 기준을 Given/When/Then으로 쓰고
     증거(테스트 이름·명령)를 잇는다. `harness-team scenario check`가 cmd exit 0을, `review <engine> --framing scenario`가
     "증거가 Then을 검증하는가"를 판정한다. 선언하면 verify 증거는 -scenario kind만 센다. -->
## Done evidence
```json
{
  "version": 1,
  "review": "required",
  "tests": "required",
  "scenarios": [
    {"id": "S1", "given": "plan이 전부 체크되고 done 가드를 통과한 브랜치", "when": "기본 브랜치에 머지된다", "then": "추가 커밋 없이 summary·session-context·done-on-main 판정이 closed다", "test": "tests/remote-task.test.mjs › S1: R 의 plan 이 전부 체크됐으면 meta status open 이어도 종결 · tests/handoff-marker.test.mjs › runDone 은 handoff 에 마커를 쓰지 않고 완료는 plan 판정으로 남는다 · tests/e2e/task-paths-golden.test.mjs › golden: task 경로·파일 바이트·stdout 이 한 생애주기 동안 고정돼 있다(done 뒤 meta open·원장 ✅ done)", "cmd": "node scripts/test-isolated.mjs --test tests/remote-task.test.mjs tests/handoff-marker.test.mjs tests/e2e/task-paths-golden.test.mjs"},
    {"id": "S2", "given": "기본 브랜치에서 closed인 task", "when": "reopen <name> 또는 task <name>", "then": "reopenedAt이 기록되고 plan에 미완 항목이 추가되어 판정이 open이다. open task에 reopen은 exit 1·무변경", "test": "tests/task-reopen.test.mjs › reopen (S2) · reopen: 열린 task → exit 1 · R5·R6 · task <name> 두 번 · 실제 원격 판정", "cmd": "node scripts/test-isolated.mjs --test tests/task-reopen.test.mjs"},
    {"id": "S3", "given": "plan은 전부 체크됐지만 done 가드 issue가 있는 브랜치(HEAD·깨끗한 트리)", "when": "pre-push pr-check", "then": "실패한다. 유효한 forcedAt이 있으면 경고만 내고 통과한다. CI(다른 rev)에서는 가드를 돌리지 않는다", "test": "tests/pr-check.test.mjs › pr-check --pre-push (S3) 5건(가드 실패·우회 경고·미완 plan 제외·건너뜀·--json 문구)", "cmd": "node scripts/test-isolated.mjs --test tests/pr-check.test.mjs"},
    {"id": "S4", "given": "레거시 meta status done task", "when": "새 판정 함수", "then": "closed로 판정이 바뀌지 않는다", "test": "tests/task-closure.test.mjs › closure (S4): 레거시 meta status done → closed(legacy-meta)", "cmd": "node scripts/test-isolated.mjs --test tests/task-closure.test.mjs"},
    {"id": "S4b", "given": "plan이 없음 / 비었음 / 체크박스가 하나도 없음 / 내용 없는 `- [ ]`만 있음", "when": "새 판정 함수", "then": "모두 open이다", "test": "tests/task-closure.test.mjs › closure (S4b): plan 없음·빈 plan·체크박스 없음·빈 `- [ ]`만 → 모두 open", "cmd": "node scripts/test-isolated.mjs --test tests/task-closure.test.mjs"},
    {"id": "S5", "given": "ship했지만 기본 브랜치에 없는 task", "when": "clean", "then": "거부하지 않는다. 기본 브랜치에서 closed인 task는 거부한다", "test": "tests/clean.test.mjs › clean (S5) · clean: 원격 추적 기본 브랜치가 있으면 그것이 R 이다", "cmd": "node scripts/test-isolated.mjs --test tests/clean.test.mjs"}
  ]
}
```

## 참고
*코드 기반 참조가 산문 설계보다 정밀하다 — 테스트 스위트·Boundary contract(JSON Schema)·
다이어그램·기존 코드 경로를 우선 링크하고, 산문은 코드로 표현 못 하는 의도만 담는다.*

- 종결 커밋 예: `134462c` (plan·meta·원장 3파일)
- 현 done 쓰기: `src/commands/task.mjs:1197-1200` · 가드: `collectDoneIssues` `task.mjs:997` · 체크박스 면제 `isCheckboxOnlyChange` `task.mjs:47`
- 현 reopen 전이: `src/commands/task.mjs:453-484` · 판정 창 `task.mjs:957-968`
- 원격 판정·원장 폴백: `src/commands/remote-task.mjs:46-104`
- 원장 기본 브랜치 제한: `src/commands/summary.mjs:258-271`
- `session-context.mjs:30-34` 주석 — plan 체크박스만 보면 `--force`·다이어그램 미실행 task가 영구 후보가 된다는 과거 판단. R1의 forced·legacy 분기가 이에 대한 답이다.
- 다이어그램 미실행 규약은 `- [x] spec/plan 다이어그램 — 미실행(<사유>)`로 체크 상태를 남긴다(`src/commands/diagram.mjs:63`) — R1과 충돌 없음(확인함).
- (open → C2b) task 폴더 삭제 커밋은 같은 커밋에서 `summary --write`를 포함해야 원장 폴백이 성립한다.

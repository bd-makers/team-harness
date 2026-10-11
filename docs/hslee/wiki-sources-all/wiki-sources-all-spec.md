# wiki-sources-all — Spec

## 목적 / 요구사항
*문제(오늘 무엇이 안 되는가) → 영향받는 사용자·시스템 → 기대 결과 → 제약 순으로 쓴다.
답 없는 질문은 요구가 아니다 — `## 참고` 절에 `- (open) …`으로 남긴다.*

**followups 24 — 기본 브랜치에서 인수 없는 `wiki sources` 는 "활성 task 없음" 으로 끝나, 미컴파일 done task 를 찾을 길이 없다(경미, 사용성).**
- 문제: 인수 없는 `wiki sources` 의 의도는 "활성 task" 이고, 기본 브랜치에는 활성 task 가 없다(`done` 이 비운다) — 문서대로이고 결함이 아니다.
  비는 것은 **발견**이다: 이미 done 된 task 를 소급 컴파일할 때(C1 첫 소비자 실사용, `docs/harness-cycle.md` C1 절) 후보 목록이 없고,
  `harness-team list` 는 이름만 내고 done·compiled 여부를 보이지 않아 task 를 하나씩 지정해야 했다.
- 영향: 기본 브랜치에서 `/harness-wiki` 소급 컴파일 대상을 고르는 사람·에이전트.
- 기대(방향 B — 사람 결정 2026-10-11): 인수 없는 계약(활성 task, 없으면 exit 1)은 그대로 두고, **옵트인** `wiki sources --all` 이
  task 전체를 훑어 task 마다 컴파일 가능 / 이미 컴파일됨(`compiled`) / 막힘(`blockers`) 을 보이는 목록을 낸다. 목록은 exit 0, 대상 0건도 exit 0.
- 제약: 읽기 전용(파일을 쓰지 않음). 단일 task 경로(`wiki sources [<user>/<task>] [--pr <N>]`)의 출력·exit 계약 불변 — 오류 패킷 하나만 바뀐다(아래 곁가지).
  task 마다 판정은 단일 task 경로와 **같은 함수**의 결과여야 한다(목록과 개별 조회가 갈라지면 안 된다).

## 원천 검토 (R1)
*원천 문서(PRD·Figma·API 문서·기획서·정책서) 사이의 충돌·누락·모순을 Plan 전에 검토한다(`/harness-interview`).
충돌·모순은 `(unresolved)`, 누락은 `(open)`으로 적고, `→ 결정: …`으로 해결한 뒤 재대조해 `- 검토 완료: <날짜>`로 닫는다.
원천이 없으면 `- 없음 — <사유>` 한 줄. 원천 위치는 프로젝트가 정한다.*

### 원천
- `docs/followups.md` 24번(origin/main 93d72eb) — 재현·정본 위치·방향 후보 A·B·C·곁가지·테스트 자리
- 오케스트레이터 브리프(2026-10-11) — 방향 B 결정, 붙일 자리는 spec 에서 D11 2차 장치 규칙으로 고름, JSON 모양 고정 요구

### 발견
- 브리프 "done task 전체를 훑어" 와 테스트 요구("compiled·not-done·컴파일 가능 각 1건 이상 섞인 목록")가 맞지 않음 (unresolved)
  → 결정: **모든 task**(`list` 와 같은 집합 — `docs/<user>/<task>/` 에 spec 이 있는 것)를 훑고 행마다 상태를 싣는다. done 만 훑으면 not-done 행이 나올 수 없다.
  done 이 아닌 task 는 `blockers: ["not-done"]` 행으로 보인다 — 후보에서 빠진 이유가 보이는 쪽이 "하나씩 지정" 을 없애는 목적에 맞다.
- 붙일 자리 `wiki sources --all` 대 `list` 쪽 표시 (open) → 결정: `wiki sources --all`(설계 1).
- 곁가지: retry 두 번째 안 "`harness-team task <name>` 으로 활성화" 의 범위 (open) → 결정: 범위 안(설계 4).
- 검토 완료: 2026-10-11

## 설계 / 접근

**1. 붙일 자리 — `wiki sources --all` (D11 2차 장치 규칙 판정).**
이 기능은 다른 장치(`wiki sources`)의 상태를 **보여 주기** 위한 것이라 2차 장치 규칙 대상이다. 규칙대로 원래 장치를 빼거나 줄이는 안부터 본다:
- 빼거나 줄이는 안 — 인수 없는 분기를 빼고 `<user>/<task>` 를 필수로: 발견 공백을 오히려 넓히고(활성 task 경로까지 사라짐) 스킬 2단계 계약을 깬다. 기각.
- 새 장치 없이 기존 장치의 한 모드로 — `--all` 은 새 명령·새 출력 계약 표면을 만들지 않고, 판정 함수(`wikiSources`)·막힘 문구·`--json` envelope 를 그대로 쓴다.
- `list` 쪽 표시 기각 사유 3가지:
  (a) `list` 는 `--json` 지원 목록(`src/cli-args.mjs` HELP)에 없다 — 브리프가 요구한 JSON 모양을 고정하려면 `list` 에 envelope 를 새로 달아야 한다(범위 확대).
  (b) `list` 가 `wiki/` 를 걷고 git 이력을 읽게 된다 — 모든 사용자가 쓰는 task 목록이 선택 단계(S8, D11 "제공") 의 스캔에 결합되고 느려진다.
  (c) 모듈 결합 — `wiki.mjs` 가 이미 `task.mjs`(`readActive`)를 import 하므로 `list`(task.mjs)가 `wiki.mjs` 를 부르면 순환 import 가 된다.
- 결과: 위키 컴파일 입력의 소유자(`wiki.mjs`, 파일 머리 주석)가 후보 목록도 소유한다.

**2. 인자 계약.**
- `wiki sources --all [--json]` — 불리언 플래그. `<user>/<task>` 나 `--pr` 과 함께 주면 usage 오류 exit 2(대상이 둘이 됨 / 목록에 PR 번호를 줄 대상이 없음).
- `docs/` 가 없거나 task 가 0건이면 빈 목록 exit 0(`list` 의 `(no docs/)` 와 같은 취지 — 오류가 아니라 "후보 없음" 이다).
- 인수 없는 형태(`--all` 없음)는 종전 그대로: 활성 task, 없으면 오류 패킷 exit 1.

**3. 출력 모양 (고정).**
- 행: `{ task, task_status, state, compiled, blockers }` — `task` 는 `<user>/<task>`, `task_status`·`compiled`·`blockers` 는 단일 task 결과의 같은 필드 그대로,
  `state` ∈ `compilable` | `compiled` | `blocked`. 우선순위는 스킬 절차 순서와 같다: blockers 가 있으면 `blocked`(3단계가 4단계보다 먼저) →
  `compiled` 가 있으면 `compiled` → 아니면 `compilable`. 행 순서는 `task` 라벨 오름차순.
- meta 가 없는 구 task 는 `task_status: "unknown"` → `blockers: ["not-done"]`(단일 task 경로와 같다 — 원장 추론으로 done 을 복구하지 않는다).
- `--json`: `{ schema, command: "wiki", status: "success", summary, next_actions: [], artifacts: [], error: null, tasks: [행...] }`.
  행 배열은 `tasks` 키 하나에 담는다(envelope 에 펼치지 않는다 — `task_status` 이름이 생긴 것과 같은 충돌 회피). 막힌 행이 있어도 `status` 는 `success` 다 —
  막힘은 행의 속성이지 명령의 실패가 아니다(단일 task 경로의 `warning` 과 다름). summary: `N개 task — 컴파일 가능 a · 이미 컴파일됨 b · 막힘 c`, 0건이면 `task 없음`.
- 텍스트: 머리 줄 `wiki sources --all: <summary>` 다음 행마다 `  <task>  컴파일 가능` / `  <task>  이미 컴파일됨: <파일, …>` / `  <task>  막힘: <blocker, …>`.
- provenance·marker·docs·rules 는 행에 싣지 않는다 — 고른 뒤 단일 task 로 다시 부르면 나온다(마커의 `at` 이 실행일이라 목록에 싣으면 쓸 수 없는 값이다).

**4. 곁가지 — 인수 없는 오류 패킷(범위 안).**
retry 두 번째 안 "`harness-team task <name>` 으로 활성화" 는 기본 브랜치에서 done task 에 쓰면 **task 를 reopen 한다**(`src/commands/task.mjs` — done 인 meta 를
`status: open`·`closedAt: null`·`reopenedAt` 으로 바꾼다). 그러면 다음 `wiki sources` 는 `not-done` 으로 막히고 원장도 바뀐다 — 이 task 가 다루는 바로 그 장면(기본 브랜치·done task)
에서 상태를 바꾸는 행동을 권하는 셈이다. 같은 패킷을 이 task 가 고치므로(대안 추가) 한 줄 수정으로 범위에 넣는다:
- retry: `` `harness-team wiki sources <user>/<task>` 로 대상을 지정 `` (명령 문서 "언제" 절의 권장 경로와 같다).
- alternatives: `` `harness-team wiki sources --all` 로 후보를 찾는다 — task 마다 컴파일 가능·이미 컴파일됨·막힘 `` (종전 `[]`).
- cause·safe_default·stop·exit 1 불변.

**5. 성능.** `wikiSources` 를 task 마다 그대로 부르면 task 마다 `wiki/` 전체 walk·rules walk·shallow 판정이 반복된다(이 저장소 task 디렉터리 161개).
`--all` 은 shallow 판정·`wiki/` 마커 색인(라벨 → 파일)·rules 를 한 번만 만들고 `wikiSources` 에 넘긴다. task 마다 남는 비용은 meta 읽기와 git log 1–2회(출처·`no-commit` 판정)다.
단일 task 경로는 넘겨받은 값이 없으면 종전대로 계산한다(동작 불변).

**문서** — `commands/harness-wiki.md` "언제" 절에 소급 컴파일 후보 찾기 한 문장, README `/harness-wiki` 절 bash 예시에 한 줄,
`tests/wiki-command.test.mjs` 의 "언제" 단언 갱신. `commands/harness-task.md` 종결 절은 대상 task 를 이미 알고 있는 경로라 고치지 않는다.
`docs/harness-overview.html` 은 command frontmatter 만 읽으므로 영향 없음(frontmatter 불변).

### 기각한 방향 (followups 24 후보)
- **A. 기본 동작 변경**(인수 없고 활성 task 도 없으면 목록): spec 계약 둘을 바꾼다 — `docs/chad/wiki-compile/wiki-compile-spec.md:58`(인수 없으면 활성 task)·`:66`(task 를 못 찾으면 exit 1).
  같은 명령이 상황에 따라 단일 객체/목록으로 모양이 갈리고 exit 1 → 0 으로 바뀌어, `--json` 소비자가 활성 task 유무를 미리 알아야 출력 모양을 안다. 사람 결정으로 기각(2026-10-11).
- **C. 오류 패킷만 보강**(`alternatives` 에 `list` 로 이름 보기 안내): 코드는 가장 적지만 `list` 가 done·compiled 를 보이지 않아 하나씩 지정하는 수고가 그대로다 — 반쪽 해법. 기각.
  (B 를 하면서 C 의 자리인 `alternatives` 에는 `--all` 을 싣는다 — 설계 4.)

## Ontology
*이 task가 다루는 핵심 개념의 정의. "X가 정확히 뭔가?"에 답한다.*

- **컴파일 후보 목록**: `wiki sources --all` 의 `tasks` 배열. `docs/<user>/<task>/` 에 spec 이 있는 모든 task 의 행(`list` 와 같은 집합), 라벨 오름차순.
- **행 상태(`state`)**: `blocked`(blockers 비어 있지 않음) > `compiled`(마커가 이미 있음) > `compilable`(둘 다 아님) — 스킬 절차 3·4단계 순서.
- **인수 없는 형태**: 활성 task 대상(불변). 없으면 오류 패킷 — retry 는 대상 지정, alternatives 는 `--all`.
- 게이트 통과 근거: 방향(B)은 사람이 정했고, 붙일 자리·행 집합·JSON 모양·exit·곁가지 범위를 위 설계에서 못 박았으며, 성공 기준은 아래 시나리오 3건·`npm test`·`docs:check` 다.

## Ambiguity 자가진단
*각 항목이 명확하면 체크. 3개 이상 미체크면 구현 진입 금지 — 인터뷰/브레인스토밍으로 복귀해
모호성을 제거한다. 게이트를 통과하면 그 근거를 위 Ontology 섹션에 한 줄로 남긴다.*

- [x] **Goal 명확도** (40%) — 목표가 한 문장으로 구체화되었는가?
- [x] **Constraint 명확도** (30%) — 기술/시간/범위 제약이 명시되었는가?
- [x] **Success 기준** (30%) — 완료를 어떻게 측정하는가?
- [x] **Context 명확도** (brownfield 한정) — 영향 받는 기존 코드/파일을 식별했는가?
- [x] **Ambiguity ≤ 0.2** — 위 항목 가중합 ≥ 0.8

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
  "scenarios": [
    {
      "id": "S1",
      "given": "main 에 done·미컴파일 chad/x, done·위키 마커 있는 chad/z, open 인 chad/y 가 들여와진 저장소",
      "when": "harness-team wiki sources --all --json 과 텍스트 형태를 실행한다",
      "then": "exit 0, status success, tasks 가 라벨순 [chad/x compilable, chad/y blocked(not-done), chad/z compiled(파일 경로)] 이고 summary 가 '3개 task — 컴파일 가능 1 · 이미 컴파일됨 1 · 막힘 1' 이다. 텍스트도 행마다 같은 상태를 보인다. 아무 파일도 바뀌지 않는다",
      "test": "wiki sources --all: lists every task as compilable, compiled or blocked",
      "cmd": "node --test --test-name-pattern=\"wiki sources --all: lists every task as compilable, compiled or blocked\" tests/wiki.test.mjs"
    },
    {
      "id": "S2",
      "given": "task 가 없는 저장소(docs/ 없음, 그리고 docs/ 는 있으나 task 0건)",
      "when": "harness-team wiki sources --all --json 을 실행하고, --all 을 <user>/<task>·--pr 과 함께 준다",
      "then": "빈 목록은 exit 0·status success·tasks []·summary 'task 없음'. 조합은 usage 오류 exit 2",
      "test": "wiki sources --all: no tasks is an empty list with exit 0, and it refuses a target or --pr",
      "cmd": "node --test --test-name-pattern=\"wiki sources --all: no tasks is an empty list with exit 0, and it refuses a target or --pr\" tests/wiki.test.mjs"
    },
    {
      "id": "S3",
      "given": "활성 task 가 없는 저장소(.harness/active.json 없음)",
      "when": "harness-team wiki sources 를 인수 없이 텍스트·--json 으로 실행한다",
      "then": "종전대로 exit 1·status error·'활성 task 없음'. retry 는 대상 지정만 권하고(task 활성화 안내 없음), alternatives 에 wiki sources --all 이 있다",
      "test": "wiki sources: without a target and without an active task it fails and points to --all",
      "cmd": "node --test --test-name-pattern=\"wiki sources: without a target and without an active task it fails and points to --all\" tests/wiki.test.mjs"
    }
  ]
}
```

## 참고
*코드 기반 참조가 산문 설계보다 정밀하다 — 테스트 스위트·Boundary contract(JSON Schema)·
다이어그램·기존 코드 경로를 우선 링크하고, 산문은 코드로 표현 못 하는 의도만 담는다.*

- 코드: `src/commands/wiki.mjs` `runWiki`·`wikiSources`·`findCompiled`, `src/commands/summary.mjs` `readTaskMeta`, `src/task-paths.mjs` `listTaskRefs`, `src/cli-args.mjs` wiki 항목
- 테스트: `tests/wiki.test.mjs`(위 시나리오 3건), `tests/wiki-command.test.mjs`("언제" 절 단언)
- 정본 서술: `docs/followups.md` 24번(origin/main 93d72eb, 이 PR 에서 삭제)

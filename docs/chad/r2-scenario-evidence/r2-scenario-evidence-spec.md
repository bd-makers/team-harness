# r2-scenario-evidence — Spec

## 목적 / 요구사항

cycle §6 5단계 중 **R2**(진행 계획 묶음 A1). 정본은 `docs/harness-cycle.md` §4-1b(R2 평가 방법)와
§4-3(기본 루프의 QA가 R2를 쓴다).

**문제.** 오늘 하네스는 "spec대로 만들어졌나"를 물을 형식이 없다. `Done evidence`의 `tests` 키는
"소스가 바뀌면 테스트 파일도 바뀌었나"만 보고, 어떤 테스트가 어떤 수용 기준을 증명하는지는 연결하지
않는다. 그래서 "테스트가 있다"와 "테스트가 시나리오를 증명한다"를 가를 수 없다.

**영향.** 기본 루프(묶음 B)의 QA가 단계마다 쓸 판정 수단이 없다. R2 없이 B를 만들면 QA가 산문 판단만 한다.

**기대 결과.** spec의 수용 기준을 Given/When/Then 시나리오로 선언하고, 시나리오마다 증거(테스트 이름·명령)를
연결한다. R2는 4행으로 판정한다.

| 행 | 종류 | 판정 | 수단 |
|---|---|---|---|
| 1 | 기계 | 모든 시나리오에 증거가 연결돼 있다 | 선언 파서 (`scenario check`·`done` 모두) |
| 2 | 기계 | 증거 명령이 exit 0이다 | `harness-team scenario check` |
| 3 | 루브릭 | 증거가 Then을 실제로 검증한다 | `harness-team review <engine> --framing scenario` E1 |
| 4 | 루브릭 | spec 밖 동작이 들어오지 않았다 | 같은 리뷰 E2 |

**제약.**
- R2는 `Done evidence`처럼 **옵트인**이다. PR 강제는 D11대로 4문서(pr-check)뿐 — pr-check는 건드리지 않는다.
- 러너(Cucumber 등)는 스택별이라 프리셋 옵션이다. 하네스는 **형식과 대조만** 한다 — 언어 분기를 코드에 넣지 않는다(D11).
- A2(R1 소스 검토, 별도 세션)와 `review-prompts.mjs`·`VERIFY_KIND_SUFFIXES`·spec 템플릿이 겹칠 수 있다.
  나중에 머지하는 쪽이 main을 받아 충돌을 해소한다.

요구사항:
1. **선언 형식** — `## Done evidence` JSON에 `scenarios` 배열 키를 추가한다. 항목은
   `{ "id", "given", "when", "then", "test", "cmd" }` 여섯 키, 모두 비어 있지 않은 문자열이다.
   `id`는 유일해야 한다. 빈 배열·누락 키·알 수 없는 키·중복 id는 선언 invalid다(= 행 1).
2. **`harness-team scenario check`** — 활성 task spec의 시나리오마다 `cmd`를 `/bin/sh -c`로 프로젝트 루트에서
   실행하고 exit 0인지 본다(= 행 2). 같은 `cmd`는 한 번만 실행한다. 출력 계약은 `boundary check`를 따른다:
   `scenario: not-configured`(exit 0) · `scenario: pass (N checked)`(exit 0) ·
   `scenario: failed` + `failure: <id> | <code> | <message>` 줄들(exit 2). 시나리오별로 G/W/T 한 줄을 함께
   출력해 사람이 표처럼 읽게 한다. 명령의 출력은 stderr로 흘린다(stdout은 판정 줄 전용).
3. **`--framing scenario`** — 검증 프레이밍 접미사 `scenario`를 `VERIFY_KIND_SUFFIXES`에 추가하고
   (kind `<engine>-scenario`), `review-prompts.mjs`에 루브릭 2행(E1 = 행 3, E2 = 행 4) 템플릿을 둔다.
   대상은 git(scope worktree/diff)이고 spec·artifact 경로를 CLI가 채운다. 미러는 `commands/harness-review.md`의
   새 절이다(pin 테스트).
4. **`done` 가드** — 선언된 `scenarios`가 invalid면 기존 경로대로 차단한다(행 1). `scenarios`가 있고
   `verify: required`이면 verify 증거로 **`-scenario` kind만** 센다(다른 검증 프레이밍은 R2를 증명하지 않는다).
   `done`은 증거 명령을 실행하지 않는다(아래 기각 4).
5. **문서** — spec 템플릿 Done evidence 주석, `AGENTS.md.hbs`(+렌더된 `AGENTS.md`), README Done evidence 절,
   `commands/harness-review.md`(접미사 열거·템플릿 수), `docs/harness-cycle.md` §4-1b 구현 형태 한 줄,
   `src/cli-args.mjs`, CHANGELOG `[Unreleased]`.
6. **테스트** — 파서·CLI·가드·프레이밍 pin. `npm run test` green.

범위 제외: 시나리오 러너 프리셋(Cucumber 등) · 기본 루프 스킬(묶음 B) · pr-check 연동 · 시나리오 실행 기록을
meta에 남기는 장치 · `done`에서의 증거 명령 실행.

## 설계 / 접근

- **표는 Done evidence 안의 JSON이다.** §6이 말하는 "Gherkin 표"를 마크다운 표 대신 JSON 배열로 쓴다.
  - 근거: 증거 `cmd`는 셸 명령이라 `|`(파이프)를 흔히 담는다 — 마크다운 표에서는 이스케이프 규칙이 생기고
    파서가 취약해진다. JSON 선언 선례(`Done evidence`·`Boundary contracts`)와 파서 하나를 공유한다.
    §4-1b 원문도 "Done evidence를 시나리오 표로 확장한다"다.
  - 대가 1 (가독성): 기획·QA가 JSON 문자열로 읽는다. `scenario check` 출력이 시나리오마다 G/W/T 한 줄을
    보여 읽기 표면을 보충한다.
  - 대가 2 (구 CLI): 0.46.0 이하 CLI는 `scenarios`를 알 수 없는 키로 보고 `done`을 막는다(fail-closed —
    업그레이드로 풀리는 시끄러운 차단이다). 이 task 자신이 시나리오를 선언하므로 종결(머지 후 main 종결 포함)은
    PATH CLI가 아니라 저장소의 `node bin/harness-team.mjs`로 한다.
- **행 1은 파서에서 판정한다.** 증거가 빠진 시나리오는 선언 자체가 invalid다. 그래서 `scenario check`와 `done`이
  같은 판정을 공유하고, 별도 검사 코드가 없다.
- **행 2: exit 0은 필요조건일 뿐이다.** 실측(2026-10-06): `node --test --test-name-pattern 'zzz-none-match'
  tests/boundary.test.mjs`는 맞는 테스트가 없어도 exit 0이고, 요약도 `✔ <파일>` 한 줄과 `ℹ pass 1`을 찍는다
  (파일 단위 가짜 통과 — 개수도 믿을 수 없다). 이름 필터가 아무것도 고르지 못해도 행 2는 통과한다. 이 틈은 행 3 루브릭이 막는다 — E1 템플릿이 "exit 0만으로는 pass가 아니다"를 명시하고, 증거 테스트가
  실제로 Then을 assert하는지 코드·실행 출력 인용을 요구한다. 하네스는 러너 출력 형식을 파싱하지 않는다
  (언어별 지식 → D11 위반).
- **신뢰 경계.** `cmd`는 spec에 적힌 문자열을 `/bin/sh -c`로 실행한다 — `.harness/gates.json`·npm scripts와 같은 신뢰 수준이다
  (팀이 커밋·리뷰한 저장소 내용). 검토하지 않은 브랜치의 spec에 `scenario check`나 자동 QA 루프를 돌리지 않는다(README에 명시).
- **행 3·4는 기존 review 체계로 간다.** 엔진 결정·기록(meta.reviews + artifact 마커)·D6 정직성 규칙을 그대로 쓴다.
  템플릿은 기계 행이 `scenario check` 몫임을 밝혀 검증자가 중복 판정하지 않게 한다.
- **미러 자리는 `commands/harness-review.md`.** 새 커맨드 문서를 만들면 slash command·Codex 스킬 래퍼·plugin.json·
  agent-files 테스트까지 표면이 넷 늘어난다. 프레이밍은 `harness-team review --framing`으로 호출하므로 엔진
  중립 리뷰 문서가 제자리다. 그 문서의 산문에 있는 `<!-- harness:prompt … -->` 문자열은 pin 테스트가 고아 마커로
  세므로 문구를 바꾼다.
- **`done`과 R2의 관계.** 선언이 곧 옵트인이다 — 새 `done` 키를 만들지 않는다. `verify: required`와 합성된다:
  시나리오가 선언된 task에서 verify 증거는 `-scenario` kind만 인정한다. 시나리오가 없으면 종전 allowlist 그대로다.

### 2차 장치 검토 (§5) — 원래 장치를 줄이는 안과 기각 사유

1. **Done evidence `tests` 키를 시나리오 표로 흡수** — 기각. `tests`는 선언 없이 기본 ON인 유일한 가드이고
   git만으로 판정된다. 흡수하면 (a) 시나리오를 선언하지 않은 대다수 task에서 가드가 사라지거나 (b) 모든 task에
   시나리오를 강제해야 한다 — (b)는 옵트인 원칙과 D11에 어긋난다. 두 키는 직교한다: `tests`는 "테스트를 바꿨나",
   시나리오는 "어느 테스트가 무엇을 증명하나".
2. **별도 `## Scenarios` 절** — 기각. 절·정규식·파서가 하나씩 늘고 `done`이 두 선언을 읽는다. 구 CLI가 새 절을
   무시해 막히지 않는 이점은 있지만, 그 대가는 R2의 조용한 무시(fail-open)다.
3. **루브릭을 shipcheck에 흡수** — 기각. shipcheck는 PR 직전 1회, 전체 diff에 대해 S1–S5를 본다. R2는 기본 루프에서
   plan **단계마다** QA가 돌린다 — S2(plan 체크)·S4(리뷰 기록)·S5는 단계 판정에 맞지 않는다. 단, E2("spec 밖 동작")는
   shipcheck S3("스코프 밖 변경")와 겹친다. 시점이 다르므로(단계 vs PR) 중복을 받아들인다.
4. **`done`이 증거 명령을 실행** — 기각. 종결 가드는 결정론·무부작용·빠름이 계약이다. 종결은 머지 후 main에서
   돌고 그때는 CI·커밋 게이트가 이미 명령을 돌렸다. 행 2를 `done`에서 강제하려면 실행 기록을 meta에 남기는 장치가
   필요한데, 그 장치는 B(기본 루프)에서 QA가 실제로 쓰는지 본 뒤에 판단한다. 지금 `done`은 행 2를 강제하지 않는다 —
   행 2는 `scenario check`(수동·QA 루프) 몫이다.

## Ontology

- **시나리오**: Done evidence `scenarios` 배열의 한 항목. Given/When/Then 문장과 증거 한 쌍(`test` = 증거 이름,
  `cmd` = 실행 명령)을 묶는다. R2의 대조 단위.
- **증거 연결(행 1)**: 시나리오의 여섯 키가 모두 비어 있지 않은 문자열로 존재하는 상태. 파서가 판정한다.
- **증거 통과(행 2)**: `cmd`가 `/bin/sh -c`로 exit 0. 필요조건이지 충분조건이 아니다(0건 매치도 exit 0).
- **scenario 프레이밍**: verify kind 접미사 `scenario`. 루브릭 E1(행 3)·E2(행 4)를 채점하는 read-only 검증.
- 게이트 통과 근거: 결정 (a)–(d)를 사용자가 승인(2026-10-06, "설계 방향대로 진행"), 다이어그램 옵트아웃.
  영향 파일·성공 기준(아래 scenarios + `npm run test`)이 특정됐다.

## Ambiguity 자가진단

- [x] **Goal 명확도** (40%) — 목표가 한 문장으로 구체화되었는가?
- [x] **Constraint 명확도** (30%) — 기술/시간/범위 제약이 명시되었는가?
- [x] **Success 기준** (30%) — 완료를 어떻게 측정하는가?
- [x] **Context 명확도** (brownfield 한정) — 영향 받는 기존 코드/파일을 식별했는가?
- [x] **Ambiguity ≤ 0.2** — 위 항목 가중합 ≥ 0.8

## Done evidence
```json
{
  "version": 1,
  "review": "required",
  "verify": "required",
  "scenarios": [
    {
      "id": "S1",
      "given": "Done evidence의 시나리오 하나에 cmd가 없다",
      "when": "선언을 파싱한다",
      "then": "선언이 invalid이고 사유에 그 시나리오 id가 나온다",
      "test": "R2-S1",
      "cmd": "node --test --test-name-pattern 'R2-S1' tests/scenario.test.mjs"
    },
    {
      "id": "S2",
      "given": "모든 시나리오의 cmd가 exit 0이다",
      "when": "harness-team scenario check를 실행한다",
      "then": "scenario: pass (N checked)를 출력하고 exit 0이다",
      "test": "R2-S2",
      "cmd": "node --test --test-name-pattern 'R2-S2' tests/scenario.test.mjs"
    },
    {
      "id": "S3",
      "given": "시나리오 하나의 cmd가 0이 아닌 코드로 끝난다",
      "when": "harness-team scenario check를 실행한다",
      "then": "scenario: failed와 그 id의 failure 줄을 출력하고 exit 2이며 나머지 시나리오도 판정한다",
      "test": "R2-S3",
      "cmd": "node --test --test-name-pattern 'R2-S3' tests/scenario.test.mjs"
    },
    {
      "id": "S4",
      "given": "spec에 scenarios 선언이 없다",
      "when": "harness-team scenario check를 실행한다",
      "then": "scenario: not-configured를 출력하고 exit 0이다",
      "test": "R2-S4",
      "cmd": "node --test --test-name-pattern 'R2-S4' tests/scenario.test.mjs"
    },
    {
      "id": "S5",
      "given": "두 시나리오가 같은 cmd를 쓴다",
      "when": "harness-team scenario check를 실행한다",
      "then": "그 명령은 한 번만 실행된다",
      "test": "R2-S5",
      "cmd": "node --test --test-name-pattern 'R2-S5' tests/scenario.test.mjs"
    },
    {
      "id": "S6",
      "given": "scenarios가 선언되고 verify가 required이며 판정 창에 -adversarial 리뷰만 있다",
      "when": "harness-team done을 실행한다",
      "then": "-scenario 검증이 없다는 사유로 차단되고, -scenario 리뷰가 있으면 통과한다",
      "test": "R2-S6",
      "cmd": "node --test --test-name-pattern 'R2-S6' tests/done-guard.test.mjs"
    },
    {
      "id": "S7",
      "given": "harness-team review에 --framing scenario를 준다",
      "when": "리뷰를 실행한다",
      "then": "kind가 <engine>-scenario로 기록되고 엔진 프롬프트가 harness-review.md 미러와 같은 템플릿이다",
      "test": "R2-S7",
      "cmd": "node --test --test-name-pattern 'R2-S7|프레이밍 템플릿' tests/review-command.test.mjs"
    }
  ]
}
```

## 참고
- `docs/harness-cycle.md` §4-1b·§4-3·§5·§6 — 정본
- `src/commands/task.mjs` `parseDoneEvidenceDeclaration`·`collectDoneIssues` — 선언 파서와 가드
- `src/commands/boundary.mjs` `runBoundaryCheck` — 출력 계약 선례
- `src/commands/gate.mjs` `gateCommit` — 선언된 명령을 `/bin/sh -c`로 실행하는 선례(출력 stderr)
- `src/commands/review-prompts.mjs` `FRAMING_TEMPLATES` · `tests/review-command.test.mjs` pin
- `tests/done-guard.test.mjs` `VERIFY_KIND_SUFFIXES ↔ harness-review.md` pin

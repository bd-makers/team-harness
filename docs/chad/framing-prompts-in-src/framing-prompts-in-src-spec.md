# framing-prompts-in-src — Spec

## 목적 / 요구사항

**오늘 무엇이 안 되는가.** 검증 프레이밍 5종(`-adversarial`·`-testcritic`·`-shipcheck`·`-contrarian`·
`-simplifier`)의 리뷰 프롬프트는 각 커맨드 문서가 정본이고, 에이전트가 문서를 읽어 프롬프트를 **파일에
옮겨 쓴 뒤** `--prompt-file`로 넘긴다(`commands/harness-review.md` 5단계). 공용 리뷰 프롬프트는 0.37.0에서
src 상수(`REVIEW_PROMPT_TEMPLATE`)로 옮겨 pin 테스트가 문서와 동기화하지만, 프레이밍 5종은 그 task의
"범위 밖"으로 남겼다(`review-evidence-cli-owned` spec). 그 결과:

- 옮겨 쓰기 단계가 에이전트 몫이라 kind(`<engine>-adversarial`)와 **실제로 엔진에 간 프롬프트** 사이에
  기록되지 않는 변형이 낀다 — 잘라 쓰거나 바꿔 써도 `meta.reviews`에는 같은 kind로 남는다.
- adversarial만 리터럴 블록이 있다. contrarian·simplifier·shipcheck는 "표+산문을 조합하라"는 지시라
  프롬프트가 세션마다 다르다. testcritic은 스킬 3종(unittest·comptest·inttest)이 **각자 다른 루브릭**
  (T1–T6·C1–C6·I1–I6)을 같은 kind로 남긴다.
- task-docs scope는 `--prompt-file` 없이는 거부되므로 페르소나 외부 엔진 모드는 항상 파일 쓰기가 선행된다.

**영향받는 대상.** `--framing`을 쓰는 커맨드 문서 7종(adversarial-review·contrarian·simplifier·ship·
unittest·comptest·inttest)과 그 절차를 따르는 세션. `verify: required` 가드는 kind만 보므로 판정 로직은
바뀌지 않는다.

**기대 결과.** 프레이밍 프롬프트의 정본이 src 상수(`src/commands/review-prompts.mjs`)가 되고,
`harness-team review <engine> --framing <접미사>`만으로 실행된다. 각 문서는 같은 텍스트를 text 블록으로
보여주고 pin 테스트가 동기화한다 — 공용 프롬프트와 같은 구조(**결정 B**, 2026-09-12). `--prompt-file`은
override로 남는다.

**제약.**

- kind 형식·`VERIFY_KIND_SUFFIXES` allowlist·`meta.reviews` 기존 필드·마커 형식은 바꾸지 않는다.
  testcritic 루브릭 3종은 `--rubric unit|component|integration`으로 고르되 kind는 `<engine>-testcritic`
  그대로다(결정, 2026-09-12).
- 루브릭 행(A1–A4·R1–R4·S1–S5·T/C/I 1–6)의 **문구는 옮기되 바꾸지 않는다** — 이 task는 위치 이동이지
  기준 개정이 아니다.
- 엔진 runner·scope 결정·기록 경로는 그대로다. 문서가 정본인 것은 **절차**이고, 프롬프트 **텍스트**의
  정본만 src로 간다.
- `--prompt-file`이 있으면 종전과 동일하게 그 내용이 프롬프트다(kind는 `--framing`에서).

## 설계 / 접근

### 템플릿 표 (`src/commands/review-prompts.mjs`)

| framing | rubric | target | 정본 문서 | placeholder |
|---|---|---|---|---|
| adversarial | — | git | `commands/harness-adversarial-review.md` | scope · focus |
| shipcheck | — | git | `commands/harness-ship.md` | scope · spec/plan/artifact path · focus |
| contrarian | — | task-docs | `commands/harness-contrarian.md` | spec/plan path · focus |
| simplifier | — | task-docs | `commands/harness-simplifier.md` | spec/plan path · focus |
| testcritic | unit | git | `commands/harness-unittest.md` | scope · focus |
| testcritic | component | git | `commands/harness-comptest.md` | scope · focus |
| testcritic | integration | git | `commands/harness-inttest.md` | scope · focus |

- **target**은 프롬프트가 엔진에게 보라고 하는 대상이다. `git`이면 종전 scope 결정(worktree/diff)을 그대로
  쓰고, `task-docs`이면 `--scope`를 생략했을 때 `task-docs`가 기본값이고 다른 scope를 명시하면 거부한다
  (프롬프트가 diff를 보지 않는데 diff로 기록하는 것은 거짓 기록).
- placeholder: `<working tree changes | diff against <base>>`·`<focus arguments, if any>`는 공용 프롬프트와
  같은 규칙. `<spec path>`·`<plan path>`·`<artifact path>`는 활성 task의 실제 상대 경로
  (`docs/<user>/<name>/<name>-*.md`)로 채운다 — CLI가 활성 task를 이미 알고 있으므로 에이전트가 경로를
  써 넣던 일이 사라진다.
- 문서 쪽 표기: 각 text 블록 바로 앞에 `<!-- harness:prompt framing=<접미사> [rubric=<이름>] -->` 마커를
  둔다. pin 테스트는 표를 순회하며 마커 다음 첫 text 블록과 상수를 비교한다(regex 7개가 아니라 loop 1개).

### CLI

```
harness-team review [엔진] [--framing <접미사>] [--rubric unit|component|integration]
                    [--prompt-file <path>] [--scope worktree|diff|task-docs] [--base <ref>] [focus ...]
```

| 조합 | 동작 |
|---|---|
| `--framing X` (prompt-file 없음) | 표에서 템플릿을 찾아 placeholder를 채운다. task-docs target이면 scope 기본값 `task-docs` |
| `--framing testcritic` 단독 | error 패킷: `--rubric` 필요(허용 3값 나열). 아무것도 쓰지 않는다 |
| `--rubric` + testcritic 아님 | error 패킷 |
| `--rubric` 열거 밖 | error 패킷 |
| `--framing X --prompt-file P` | 종전과 동일: P가 프롬프트, kind는 X. rubric은 있으면 열거·조합만 검사 |
| `--scope task-docs` + framing·prompt-file 둘 다 없음 | 종전대로 거부(retry 문구에 `--framing contrarian|simplifier` 경로 추가) |
| `--framing adversarial --scope task-docs` (prompt-file 없음) | 거부: git target 프레이밍은 task-docs를 볼 수 없다 |

- `meta.reviews` 항목·artifact 정보 줄에 `rubric`을 **있을 때만** 덧붙인다. 마커 형식은 불변.
- `src/cli-args.mjs`: `rubric`을 `VALUE_FLAGS`와 review flags에 등록.

### 문서 계약 변경

- 7 문서: "프롬프트/루브릭을 파일에 쓰고 `--prompt-file`" 지시를 `harness-team review <engine> --framing
  <접미사> [--rubric …]`로 교체. 루브릭 마크다운 표는 마커 + text 블록(프롬프트 본문, 루브릭 행 포함)으로
  대체 — 같은 문서 안에 표와 블록이 둘 다 있으면 서로 drift한다.
- `commands/harness-review.md` 5단계: 프레이밍 프롬프트의 정본 위치와 `--prompt-file`이 override라는 것을
  명시. `src/commands/task.mjs`의 verify 힌트 문구에서 `--prompt-file` 제거.
- `skills/*/SKILL.md`는 절차를 복제하지 않고 커맨드 문서를 가리키므로 변경 없음(manifest-sync 테스트가
  참조만 검사).
- CHANGELOG `[Unreleased]`에 항목. `docs/followups.md` 4번 삭제(task로 올림).

### 범위 밖

- 루브릭 기준 자체의 개정. 공용 프롬프트 pin 테스트의 마커 방식 전환(동작 중인 것을 건드리지 않는다).
- `.harness/reviewers.json` 스키마, 엔진 runner 표.
- verify 가드가 rubric을 대조하는 것 — kind allowlist 불변.

## Ontology

- **프레이밍 프롬프트 (framing prompt)**: `--framing <접미사>`로 실행할 때 엔진에 넘어가는 리터럴 텍스트.
  정본은 src 상수, 문서 text 블록은 미러(pin), `--prompt-file`은 override.
- **루브릭 (rubric)**: testcritic 프레이밍 안의 변형 선택자(unit·component·integration). kind를 바꾸지
  않는다 — 가드에게 세 변형은 같은 검증 증거다.
- **target**: 템플릿이 엔진에게 읽으라고 지시하는 대상(git 변경 vs 활성 task 문서). scope 기본값과 허용
  범위를 정한다. scope는 **기록값**이고 target은 **프롬프트의 속성**이다.
- **override**: `--prompt-file`. 템플릿 대신 파일 내용을 프롬프트로 쓰되 kind·rubric 검증은 그대로 거친다.

*자가진단 게이트 근거: 문제(옮겨 쓰기 단계가 kind↔프롬프트 사이에 기록되지 않는 변형을 낀다)·경계(kind·
allowlist·마커·runner 불변, 루브릭 문구 불변, prompt-file override 유지)·측정(아래 완료 기준 7항목 전부
명령으로 검사 가능)·영향 파일(위 표의 7 문서 + review.mjs·cli-args.mjs·task.mjs 힌트·review-command.test.mjs)이
정본 위치로 지목된다. 열린 질문 2개(testcritic 3루브릭·다이어그램)는 2026-09-12 사용자 결정으로 닫혔다.*

## Ambiguity 자가진단

- [x] **Goal 명확도** (40%) — 프레이밍 프롬프트 7 템플릿의 정본을 src 상수로 옮기고 `--framing`(+`--rubric`)만으로
      실행되게 한다.
- [x] **Constraint 명확도** (30%) — kind·allowlist·마커·runner·루브릭 문구 불변, `--prompt-file` override 유지,
      target별 scope 규칙.
- [x] **Success 기준** (30%) — 아래 `### 완료 기준` 7항목.
- [x] **Context 명확도** (brownfield) — `src/commands/review.mjs`(`buildPrompt`·`runReview` 검증 순서),
      `src/cli-args.mjs`(`VALUE_FLAGS`·COMMANDS), `src/commands/task.mjs` verify 힌트,
      `tests/review-command.test.mjs`(pin·task-docs 테스트), 커맨드 문서 7종 + `harness-review.md`.
- [x] **Ambiguity ≤ 0.2** — 가중합 1.0

### 완료 기준

1. 표의 7 템플릿마다 문서 마커 다음 text 블록 == src 상수(pin, loop). 표의 framing 집합 == `VERIFY_KIND_SUFFIXES`
   집합(양방향).
2. `review custom --framing contrarian`(prompt-file 없음)이 fixture에서 exit 0으로 기록되고 scope=`task-docs`,
   엔진이 받은 프롬프트에 fixture의 spec/plan 상대 경로가 들어 있다.
3. `--framing testcritic` 단독 → error 패킷·미기록. `--rubric component` → 프롬프트에 C1 행. `--rubric bogus`·
   `--rubric unit --framing adversarial` → error.
4. `--framing adversarial --scope task-docs`(prompt-file 없음) → error. `--scope task-docs` 단독 → 종전대로 error.
5. `--framing contrarian --prompt-file P` → 프롬프트 == P 내용(+focus). 종전 테스트 통과.
6. 7 문서에 "파일에 쓰고"·`--prompt-file <path>` 지시가 남아 있지 않다(grep 테스트). `task.mjs` 힌트도.
7. `npm run test`·`npm run docs:check` 통과. 이 task 자신의 리뷰를 `harness-team review codex --framing adversarial`
   (prompt-file 없음)로 돌려 `meta.reviews`에 기록(dogfood).

## Boundary contracts

*선언 없음 — 템플릿 생산자(`review-prompts.mjs`)와 소비자(`review.mjs`)가 같은 프로세스 안이라 JSON 경계가
없다. 문서↔src 경계는 pin 테스트가 고정한다.*

## Done evidence

```json
{ "version": 1, "review": "required", "verify": "required", "tests": "required" }
```

## 참고

- 결정 이력: 2026-09-12 `docs/followups.md` 4번 → **B**(src 상수 + 문서 블록 + pin) 선택. testcritic →
  `--rubric` 선택자. 다이어그램 → 아니오.
- 선행: `review-evidence-cli-owned`(0.37.0) spec "범위 밖 — 프레이밍 프롬프트의 src 이관".
- 코드 참조: `src/commands/review.mjs` `REVIEW_PROMPT_TEMPLATE`·`buildPrompt`·`runReview`의 검증 순서
  (scope 열거 → 엔진 → kind → scope 결정 → prompt).
- 기각한 대안: (C) 문서를 포인터로 — 스킬을 읽는 에이전트가 프롬프트를 못 본다. testcritic 단일 통합 —
  컴포넌트·통합 특화 행을 잃는다.

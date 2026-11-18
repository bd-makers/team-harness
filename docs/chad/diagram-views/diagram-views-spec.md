# diagram-views — Spec

## 목적 / 요구사항
*문제(오늘 무엇이 안 되는가) → 영향받는 사용자·시스템 → 기대 결과 → 제약 순으로 쓴다.
답 없는 질문은 요구가 아니다 — `## 참고` 절에 `- (open) …`으로 남긴다.*

- **문제**: task 다이어그램은 `<name>-diagram.html` 하나뿐이다. 한 파일에 시간 순 상호작용과 구성요소 관계를 함께 담으면
  "드러낼 것 한 가지"(harness-diagram 3단계)가 흐려지고, 한 관점을 고치면 다른 관점 파일도 바뀐다. 후속 A2(PR용 단독 SVG)는
  뷰마다 파일이 하나씩 있어야 이름이 맞는다(kc-platform 회고 A1, 설계 task `team-harness-improvements`).
- **영향**: `diagram record`·`pr-check`·`clean` CLI, 다이어그램 옵트인 문서(`commands/harness-{task,diagram,ship}.md`,
  `skills/harness-diagram/SKILL.md`, `templates/docs/README.md`). 하네스를 쓰는 모든 소비자 프로젝트.
- **기대 결과**: 뷰별 파일 `<name>-diagram-<view>.html`(뷰 `sequence`·`module`)과 뷰별 plan 단계를 옵트인으로 쓸 수 있다.
  `diagram record --view <v>`가 그 뷰의 산출물·plan 단계·artifact 줄을 다루고, `pr-check`는 뷰 파일도 다이어그램으로 인정한다.
- **제약**: 레거시 `<name>-diagram.html`·레거시 단계·`--view` 없는 `record`의 동작은 바뀌지 않는다. 새 동작은 옵트인이다.
  doctor는 바꾸지 않는다(결정 A1-2). `templates/AGENTS.md.hbs`·이 저장소 `AGENTS.md`는 바꾸지 않는다. push·PR·릴리스는 범위 밖.

## 범위 (In / Out)
- **In**: 뷰 열거 `FLAG_CHOICES.view`(`src/cli-args.mjs`), 뷰 경로 조립(`src/task-paths.mjs`), `diagram record --view`
  (`src/commands/diagram.mjs`), `pr-check`의 다이어그램 권장 판정(`src/commands/pr-check.mjs`), `clean`의 `TASK_FILE`
  (`src/commands/clean.mjs`), 테스트, 문서 5곳, CHANGELOG `[Unreleased]`.
- **Out**: 뷰 SVG(`<name>-diagram-<view>.svg`)의 인식·자립성 검사 — A2(`diagram-svg`)의 범위다. doctor 다이어그램 검사(A1-2).
  `templates/AGENTS.md.hbs`·`AGENTS.md`(레거시 경로가 여전히 참이라 eager 예산을 쓰지 않는다). 과거 판 시뮬레이션·가이드 HTML
  (`docs/harness-*.html`) — 레거시 경로 서술이 여전히 참이다.

## 원천 검토 (R1)
*원천 문서(PRD·Figma·API 문서·기획서·정책서) 사이의 충돌·누락·모순을 Plan 전에 검토한다(`/harness-interview`).
충돌·모순은 `(unresolved)`, 누락은 `(open)`으로 적고, `→ 결정: …`으로 해결한 뒤 재대조해 `- 검토 완료: <날짜>`로 닫는다.
원천이 없으면 `- 없음 — <사유>` 한 줄. 원천 위치는 프로젝트가 정한다.*

### 원천
- 설계 정본: `docs/chad/team-harness-improvements/team-harness-improvements-spec.md` "A1 — 다이어그램 뷰 여러 개" 절,
  R1 `### 발견`의 결정 A1-1(파일 분리 권장안 채택)·A1-2(doctor 불변) — PR #184(`5993b27`)로 main에 머지됨.
- 상위 세션 지시(2026-11-18): A1 구현 범위·완료 기준, A2는 이 작업 뒤의 별도 PR.
- 코드: main `5993b27` — `src/commands/{diagram,pr-check,clean}.mjs`, `src/cli-args.mjs`, `src/task-paths.mjs`,
  `src/commands/migrate.mjs`(docs seed refresh 정책).

### 발견
- **뷰 SVG 범위** — 설계 A1 절은 pr-check가 "레거시·뷰 HTML·뷰 SVG 중 하나"를 보고 clean `TASK_FILE`에 `svg`를 더한다고 적었다.
  상위 지시는 A2(단독 SVG)를 별도 PR로 둔다. A1이 SVG를 인식하면 아직 만들 수도 기록할 수도 없는 파일 종류를 판정에 넣게 된다.
  → 결정(2026-11-18, 상위 지시 범위에 맞춤): 이 task는 뷰 **HTML**만 인식한다. 뷰 SVG 인식(pr-check·clean)은 A2가 더한다.
- **README sha 등록** — 설계·상위 지시는 `templates/docs/README.md`를 고치면 migrate-templates 이전 판 sha를 등록하라고 했다.
  사실: `REFRESHABLE_TEMPLATE_FILES`에 docs seed가 없고 `src/commands/migrate.mjs:264`가 "docs/ seed (README.md, decisions.md,
  .gitkeep) is deliberately NOT refreshable"이라 적는다. 이 README를 고친 과거 커밋(`c698485`·`1844fbe`·`27080c1` 등)도 sha 표를
  건드리지 않았다(`d603c69`의 migrate 변경은 스킬 판이다).
  → 결정(2026-11-18): sha·fixture를 등록하지 않는다. 등록할 refresh 경로가 없다.
- **레거시 정규식과 뷰 단계의 겹침** — `OPEN_STEP_RE`(`diagram.mjs:25`, `spec\/plan 다이어그램.*`)는 뷰 단계
  `spec/plan 다이어그램(sequence) 작성 → …`도 맞는다. 그대로 두면 `--view` 없는 `record`가 뷰 단계를 닫고, `--skipped`면 뷰 태그를
  지운 레거시 형식으로 바꿔 쓴다.
  → 결정: 레거시 열림·닫힘 정규식은 `다이어그램` 바로 뒤의 `(`를 거부한다. 뷰 정규식은 `다이어그램(<view>)`만 맞춘다.
- **옵트인 질문의 뷰 선택** — 설계는 "뷰마다 단계"만 정하고, `created:` 질문에서 어느 단계를 넣을지는 정하지 않았다.
  → 결정(2026-11-18, 옵트인 보존): "예"의 기본은 종전 레거시 단계 하나다. 뷰를 고르면(같은 질문에서) 고른 뷰마다 단계 하나를 넣는다.
  레거시 단계와 뷰 단계는 한 plan에 함께 있어도 된다 — 각 단계는 자기 경로와 자기 `record` 호출로 닫힌다.
- **doctor** — 결정 A1-2(설계 task): 바꾸지 않는다. `commands/harness-task.md` 옵트인 2번 "doctor 체크를 만들지 않는다" 유지.
- 검토 완료: 2026-11-18 — 위 결정 반영 후 재대조, 남은 `(unresolved)`·`(open)` 없음

## 설계 / 접근
설계 task의 A1 절을 옮겨 쓰고, 위 R1 결정(뷰 SVG는 A2, sha 등록 없음)을 반영해 고쳤다.

- **파일(결정 A1-1 분리)**: `<name>-diagram-<view>.html`, 뷰 열거 `sequence`·`module` — 정본은 `FLAG_CHOICES.view`
  (`src/cli-args.mjs`의 `DIAGRAM_VIEWS`). 경로 조립은 `src/task-paths.mjs`의 `diagramKind(view)`(뷰 없으면 `diagram.html`).
  기존 `<name>-diagram.html`은 이름 없는 레거시 뷰로 계속 유효하다. 근거: A2가 뷰마다 SVG를 두므로 이름이 맞고, GitLab은 HTML
  섹션을 어차피 렌더하지 않으며, `record`·`pr-check`가 HTML 파싱 없이 파일 존재로 판정하고, 한 뷰 갱신이 다른 뷰를 건드리지 않는다.
- **plan 단계**: 뷰마다 단계 `- [ ] spec/plan 다이어그램(sequence) 작성 → docs/<user>/<name>/<name>-diagram-sequence.html`.
  `closeDiagramStep`은 `--view`와 맞는 단계만 닫는다. 생략은 `- [x] spec/plan 다이어그램(<view>) — 미실행(<사유>)`.
  `--view` 없는 `record`는 레거시 단계·경로 그대로이고, 뷰 단계를 닫지 않는다.
- **CLI**: `diagram record [--view sequence|module] [--skipped] [note ...]` — `VALUE_FLAGS`에 `view`, diagram `flags`에 `view`.
  모르는 값은 `resolveInvocation`의 `FLAG_CHOICES` 검사가 exit 2로 거부한다. 산출물 검사(`diagram.mjs:138,144`)는 뷰 경로로 한다.
  생략 줄은 `DIAGRAM_SKIPPED_PREFIX`를 유지하고 사유 앞에 `[<view>]`를 붙인다 — `- 다이어그램: 미실행 — [sequence] 도구 없음 (날짜)`
  (pr-check 판정 호환). `--json` envelope `extra.view`(뷰 없으면 `null`).
- **pr-check**: `pr-check.mjs:72–76` — 레거시 HTML이나 뷰 HTML(`DIAGRAM_VIEWS` 각각) 중 하나라도 rev에 있으면 권장 안내를 내지
  않는다. 판정은 기존 `showAt`(rev의 git 객체, `./` 기준)으로 한다. 안내 문구의 `권장: 다이어그램 없음` 머리는 유지한다.
- **doctor**: 바꾸지 않는다(결정 A1-2).
- **형제 경로**: `clean.mjs:113` `TASK_FILE`의 kind에 `diagram(?:-[a-z]+)?`(비포획 — `\2` 역참조 유지). `task-paths.mjs:21` kind 주석.
- **문서 정본**: `commands/harness-task.md` 옵트인 절(단계 형식·경로·기록) — 정본. `commands/harness-diagram.md` 3단계(뷰마다
  "드러낼 것 한 가지"), 6단계(출력 파일), 7단계(`--view`). `commands/harness-ship.md` 6단계 산출물 서술.
  `skills/harness-diagram/SKILL.md`. `templates/docs/README.md`(sha 등록 없음 — R1). `templates/AGENTS.md.hbs`·`AGENTS.md`는 바꾸지 않는다.
- **테스트**: `tests/diagram-command.test.mjs`, `tests/pr-check.test.mjs`, `tests/clean.test.mjs`, `tests/cli-args.test.mjs`,
  `tests/agent-files.test.mjs`(문서 핀).
- **호환**: 기존 task·레거시 단계·레거시 파일 동작 불변. 뷰 단계를 쓰는 plan은 이 버전 이상의 CLI가 필요하다 — 옛 CLI의
  `record`는 뷰 단계를 레거시 단계로 닫는다(CHANGELOG에 적는다).

## Ontology
*이 task가 다루는 핵심 개념의 정의. "X가 정확히 뭔가?"에 답한다.*

- **뷰(view)**: 한 task 다이어그램이 드러내는 관점 하나 — `sequence`(시간 순 상호작용), `module`(구성요소·의존 관계).
  파일 하나 = 뷰 하나. 열거의 정본은 `FLAG_CHOICES.view`다.
- **레거시 뷰**: 이름 없는 뷰 — `<name>-diagram.html`과 `spec/plan 다이어그램 작성 → …` 단계. `--view` 없는 `record`가 다룬다.
- **뷰 단계**: plan `## 단계`의 `spec/plan 다이어그램(<view>)` 체크박스. 그 뷰의 옵트인 상태이며 `record --view <view>`만 닫는다.
- 게이트 근거(2026-11-18): 설계 결정 A1-1·A1-2 확정(PR #184), 범위 차이(뷰 SVG→A2, sha 등록 없음)·레거시 정규식 겹침·옵트인 질문을
  R1 결정으로 닫음. 목표·제약·완료 기준·영향 파일이 모두 식별됨.

## Ambiguity 자가진단
*각 항목이 명확하면 체크. 3개 이상 미체크면 구현 진입 금지 — 인터뷰/브레인스토밍으로 복귀해
모호성을 제거한다. 게이트를 통과하면 그 근거를 위 Ontology 섹션에 한 줄로 남긴다.*

- [x] **Goal 명확도** (40%) — 목표가 한 문장으로 구체화되었는가? — 뷰별 다이어그램 파일·plan 단계·`record --view`를 옵트인으로 지원하고 레거시는 그대로 둔다
- [x] **Constraint 명확도** (30%) — 기술/시간/범위 제약이 명시되었는가? — 레거시 불변·옵트인·doctor/AGENTS 불변·뷰 SVG는 A2
- [x] **Success 기준** (30%) — 완료를 어떻게 측정하는가? — `npm test`·`npm run docs:check` 통과, doctor 확인, `pr-check --base origin/main` 통과, 아래 Done evidence
- [x] **Context 명확도** (brownfield 한정) — 영향 받는 기존 코드/파일을 식별했는가? — 설계/접근 절의 파일 목록
- [x] **Ambiguity ≤ 0.2** — 위 항목 가중합 ≥ 0.8 — 1.0(2026-11-18)

<!-- 선택 선언. 아래 주석을 벗기면 done 가드가 검사한다.
     미선언 기본값: "tests": "optional" ("required"면 소스가 바뀔 때 테스트 파일 변경을 요구), "review": "optional",
     "verify": "optional" ("required"면 검증 프레이밍 kind 마커 — -adversarial 등 — 를 요구).
     R2(옵트인): "scenarios": [{ "id", "given", "when", "then", "test", "cmd" }] — 수용 기준을 Given/When/Then으로 쓰고
     증거(테스트 이름·명령)를 잇는다. `harness-team scenario check`가 cmd exit 0을, `review <engine> --framing scenario`가
     "증거가 Then을 검증하는가"를 판정한다. 선언하면 verify 증거는 -scenario kind만 센다. -->
## Done evidence

```json
{ "version": 1, "tests": "required" }
```

## 참고
*코드 기반 참조가 산문 설계보다 정밀하다 — 테스트 스위트·Boundary contract(JSON Schema)·
다이어그램·기존 코드 경로를 우선 링크하고, 산문은 코드로 표현 못 하는 의도만 담는다.*

- 설계 정본(보조 참조): `docs/chad/team-harness-improvements/team-harness-improvements-spec.md` A1 절.
- 다이어그램 옵트인: 2026-11-18 생성 시 질문 — 묻지 않고 건너뜀(상위 세션이 시작한 무인 세션, 옵트아웃 기본값 — plan에 단계 없음).
- 후속: A2 `diagram-svg`가 뷰 SVG 인식(pr-check·clean)과 자립성 검사를 더한다.

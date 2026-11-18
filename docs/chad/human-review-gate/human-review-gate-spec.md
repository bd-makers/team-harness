# human-review-gate — Spec

## 목적 / 요구사항
*문제(오늘 무엇이 안 되는가) → 영향받는 사용자·시스템 → 기대 결과 → 제약 순으로 쓴다.
답 없는 질문은 요구가 아니다 — `## 참고` 절에 `- (open) …`으로 남긴다.
다른 역할에 물어야 하면 `- (ask:<역할>) …` → `(asked:<역할> <날짜> <링크>)` → `(answered <링크>)`로 상태를 적고, 반영하면 지운다.*

- **문제**: 사이클 S2 Plan의 게이트 "개발자 확인"(`docs/harness-cycle.md` §2)은 기계로 남는 상태가 없다. 새 task는 spec을
  사람이 한 번도 보지 않은 채 구현(특히 사람 없이 이어지는 `/harness-loop`)으로 넘어갈 수 있다 — kc-platform 회고 A5.
- **영향**: 하네스를 쓰는 모든 소비자 프로젝트의 task 작성자, `harness-team task`(plan 템플릿)·`pr-check`(템플릿 그대로 판정),
  명령 문서 `harness-task`·`harness-loop`.
- **기대 결과**: 구현에 들어가기 전에 사용자가 spec을 한 번 검토하는 절차가 **기본**이 된다(취지 — 2026-11-18 사용자).
  신규 task의 plan `## 단계` 맨 위에 사람 검토 단계가 들어가고, 에이전트는 사용자가 명시적으로 승인한 뒤에만 그 단계를 켠다.
  loop는 그 단계가 미완이면 들어가지 않는다.
- **제약**: D11(강제는 PR의 task 문서뿐, 새 필수 요건은 메인테이너가 정한다 — 이 기본값은 메인테이너가 정했다), D4·D5,
  기존 task 산출물 형식 보존(소급 없음), 새 meta 필드·새 Done evidence 키 없음 — "plan.md가 곧 상태". 커밋·쓰기 차단은 두지 않는다.
  설계 정본은 `docs/chad/team-harness-improvements/team-harness-improvements-spec.md` "A5 + A3" 절이고, 아래에 직접 옮겨 쓴다.

## 범위 (In / Out)
*`- **In**: …`에 이번 task가 바꾸는 것(파일·모듈·동작)을, `- **Out**: …`에 하지 않기로 한 것과 그 이유 한 줄을 쓴다 —
요청하지 않은 기능·관련 없는 리팩터링이 섞이지 않게 긋는 경계다.*

- **In**: `src/commands/task.mjs`(게이트 단계 한 줄의 단일 정본 `reviewGateStep`, `taskPlanTemplate` 옵션, `runTask` 생성 경로·
  `--no-review-gate` 거부), `src/cli-args.mjs`(task 플래그), `src/commands/pr-check.mjs`(게이트가 든 plan의 템플릿 그대로 판정),
  `commands/harness-task.md`(게이트 절·통합 생성 질문·인자), `commands/harness-loop.md`(진입·Dev·`[사람]` 단계),
  `commands/harness-interview.md`(plan writer 인계 — Codex 리뷰 P2),
  `docs/harness-cycle.md` §2 S2 "현재" 열, `CHANGELOG.md` `[Unreleased]`, 관련 테스트.
- **Out**:
  - A3 `harness-team brief` 슬라이드 CLI — 별도 PR ②(`task-brief`). 이 PR의 artifact 기록은 늘 `슬라이드 없음`이고 문서는 `brief`를 호출 가능한 것으로 쓰지 않는다.
  - `templates/AGENTS.md.hbs` 변경 — AGENTS plan 계약 "하지 않은 단계를 미리 `- [x]`로 켜지 않는다"가 이미 `[사람]` 단계에 적용된다
    (그 단계의 "함"은 사람의 승인이다). eager 예산과 소비자 전원의 AGENTS 갱신을 늘리지 않는다. Cursor는 이 줄로 덮인다.
  - 설정 기본값(`.harness/config.json` 키) — 팀 공유 위치가 없다(R1 결정). 생성 시 빼기만 둔다.
  - 기존 task 소급·doctor 체크·커밋/쓰기 차단 — 설계 결정(강도: 프롬프트 수준 + 늦은 `done` 안전망).
  - A6의 `taskSpecTemplate(task, { reviewer })` 변형을 pr-check가 템플릿으로 보지 못하는 같은 부류의 공백 — 후속(아래 참고).

## 원천 검토 (R1)
*원천 문서(PRD·Figma·API 문서·기획서·정책서) 사이의 충돌·누락·모순을 Plan 전에 검토한다(`/harness-interview`).
충돌·모순은 `(unresolved)`, 누락은 `(open)`(다른 역할에 물을 것이면 `(ask:<역할>)`)으로 적고, `→ 결정: …`으로 해결한 뒤 재대조해 `- 검토 완료: <날짜>`로 닫는다.
원천이 없으면 `- 없음 — <사유>` 한 줄. 원천 위치는 프로젝트가 정한다.*

### 원천
- 설계 정본: `docs/chad/team-harness-improvements/team-harness-improvements-spec.md` — R1 "A5 nudge 모순" 결정, "공통 — 생성 시 질문 통합",
  "A5 + A3" 절(게이트 단계·누가 켜나·강도·결정 A5-2·PR 분할 ①). 설계 승인: 그 task plan의 `- [x] [사람]` 단계(2026-11-18).
- 코드: `origin/main` `7afaa40` — `src/commands/task.mjs`(`taskPlanTemplate`·`runTask`·`firstOpenPlanStep`), `src/cli-args.mjs`,
  `src/commands/pr-check.mjs`(`DOCS`·`doc.template`). 문서: `commands/harness-task.md`(다이어그램 옵트인 절), `commands/harness-loop.md`,
  `docs/harness-cycle.md` §2·§4-3, `MAINTAINING.md` 반복 실수 규칙표.

### 발견
- **A5 nudge 모순(설계 R1에서 이월된 결정)** — 브리프의 "기본 nudge"와 plan 체크박스(= `done` 가드 hard block)가 충돌했다.
  → 결정(2026-11-18, 사용자 = 메인테이너): 구현 전 사람 검토를 **기본**으로 한다. 검토자는 그 task의 user. `done` 차단은 끝내 검토하지
  않았을 때만 걸리는 늦은 안전망이다. 설정 기본값은 두지 않고 생성 시 빼기만 둔다. loop에도 같게 적용한다(A5-2).
- **질문 시점 모순** — 설계는 "생성 시 통합 질문에서 빼면 `task <name> --no-review-gate`로 넣지 않는다"인데, 통합 질문이 붙는 기존 계약
  (`commands/harness-task.md` 옵트인 절, `tests/agent-files.test.mjs`가 고정)은 `task` 출력이 `created:`일 **뒤**에만 묻는다. 질문 뒤에는
  이미 plan에 단계가 있으므로 그 플래그를 줄 기회가 없다.
  → 결정(2026-11-18, 이 task — 묻지 않고 내림, 완료 보고에 명시): 질문 시점은 기존대로 `created:` 뒤 1회. 게이트 선택지는 **빼기**로 묻는다
  (고르지 않으면 기본대로 남는다 — multiSelect에서 무응답이 옵트아웃이 되지 않게). 빼기를 고르면 에이전트가 방금 만든 plan에서 그 한 줄을
  지운다. `--no-review-gate`는 사용자가 생성 **전에** 이미 빼라고 했거나 스크립트로 만들 때 쓴다. 선택지는 다이어그램(레거시)·sequence·module·
  게이트 빼기 = 4개로 `AskUserQuestion` 상한 안이다.
- **pr-check 템플릿 판정 공백** — `pr-check`는 `doc.template(task)`를 인자 없이 불러 게이트 없는 plan만 "템플릿 그대로"로 잡는다. 게이트가
  든 손대지 않은 plan과, 게이트만 켠 plan이 통과해 버린다.
  → 결정: 판정 전에 plan의 게이트 줄(미완·완료 둘 다)을 빼고 게이트 없는 템플릿과 대조한다. 세 변형 모두 차단을 테스트한다.
- **`--no-review-gate`를 기존 task에 줄 때** — 설계는 "기존 task·`activated:`·`reopened:`에는 손대지 않는다"만 말한다. 조용히 무시하면
  에이전트가 게이트를 뺐다고 믿는다.
  → 결정(묻지 않고 내림): `--reviewer`와 같이 거부한다(exit 1, 활성 포인터·handoff·meta 그대로). 빼려면 plan의 그 줄을 손으로 지운다.
- **loop의 `[사람]` 판정 범위** — "`[사람]` 단계가 미완이면 멈춤"을 plan 전체로 읽으면 끝의 `[사람] PR 승인` 같은 단계가 진입을 영구히 막는다.
  → 결정: 루프가 **다음에 다룰** 미완 단계 기준이다. 진입 때 그 단계가 `[사람]`이면 멈추고, 도중에 닿으면 기존 **승인 필요** 멈춤으로 간다
  (멈춤 조건은 넷 그대로). Dev는 `[사람]` 단계를 구현하지 않고 오케스트레이터도 켜지 않는다.
- 슬라이드 경로: A3는 PR ②다. 지금 artifact 기록 형식의 슬라이드 칸은 `없음`이다.
- 검토 완료: 2026-11-18 — 위 결정 반영 후 재대조, 남은 `(unresolved)`·`(open)` 없음

## 설계 / 접근

**취지(2026-11-18 사용자)**: 구현에 들어가기 전에 사용자가 spec을 한 번 검토하는 절차를 기본으로 한다. 거킨·usecase-feature-id는 프로젝트 스펙이라 범위 밖.

- **게이트 단계**: 신규 task 생성(`created:`)이면 `harness-team task`가 `## 단계` **맨 위**에 `- [ ] [사람] spec 검토 승인 — <user>`를
  기본으로 넣는다(`runTask` 생성 경로 → `taskPlanTemplate(name, { reviewGateUser: user })`). `<user>`는 task의 user(`docs/<user>/`).
  `task <name> --no-review-gate`면 넣지 않는다(맨 플래그만 — `--no-review-gate=<값>`은 거부, Codex 리뷰 P2). 기존 task·`activated:`·`reopened:`에는 손대지 않는다(소급 없음).
  새 meta 필드·새 Done evidence 키 없음 — "plan.md가 곧 상태".
- **단일 정본**: 게이트 줄은 `reviewGateStep(user)`(`task.mjs` export) 하나가 만든다 — 템플릿·pr-check·테스트가 같이 쓴다.
  `taskPlanTemplate(name)`(옵션 없음)의 출력은 바이트 단위로 종전과 같다 — done-guard·session-context·pr-check 테스트가 그 형태에 기댄다.
- **누가 켜나**: 에이전트는 사용자가 대화에서 **명시적으로 승인한 뒤에만** `[x]`로 바꾸고 artifact `## 결과`에
  `- 검토 승인: <YYYY-MM-DD> · 슬라이드 <경로|없음>`을 남긴다. 승인 전에는 task 문서(`docs/<user>/<name>/`) 밖 파일을 고치지 않는다(규범).
- **강도**: 프롬프트 수준 — SessionStart의 "plan 첫 미완 단계" 주입(`firstOpenPlanStep`)이 이 단계를 가리키고, loop 진입과 위 규범이 받친다.
  끝내 검토하지 않으면 기존 `done` 가드가 미완 체크박스로 막는다(늦은 안전망). 커밋·쓰기 차단은 두지 않는다 — D11이 "task 시작 강제
  (쓰기 차단·pre-commit)"를 경계 모호로 기각.
- **결정 A5-2(loop 적용)**: loop 진입 1번에 "다음 미완 단계가 `[사람]` 단계면 멈춤"을 더하고, Dev는 `[사람]` 단계를 구현하지 않는다.
  근거: loop는 사람 없이 구현이 이어지는 경로라 사전 검토가 가장 필요하고, §4-3도 "spec·plan은 개발자가 확정한 뒤 loop"를 전제한다.
  loop 진입 질문("어떻게 진행할까")은 "spec이 맞는가"가 아니라서 검토를 대신하지 못한다.
- **생성 시 질문 통합**: 다이어그램(옵트인)과 게이트(기본 — 뺄 수 있음)를 `AskUserQuestion` 한 번(multiSelect)으로 묻는다 —
  정본은 `commands/harness-task.md` 옵트인 절. 시점·빼기 방식은 위 R1 결정.
- **출력**: 생성 평문 출력에 `review gate: <plan 경로> 첫 단계 — 사용자 승인 뒤에만 [x]` 한 줄. JSON envelope은 그대로(plan이 상태).
- **pr-check**: plan의 `reviewGateStep(user)`와 그 `[x]` 형태의 줄을 뺀 본문으로 빈 문서·템플릿 그대로를 판정한다.
- **거부 안내**: 기존 task 거부(`--reviewer`·`--no-review-gate`)의 재실행 명령은 member를 명시했을 때 `--member <user>`를 싣는다(Codex 리뷰 P2).
- **plan writer**: `commands/harness-interview.md` 인계가 게이트 단계를 지우지 말라고 말하고, 순서를 "plan 작성 → 사람 검토 승인 → 구현"으로 둔다(Codex 리뷰 P2).
- **문서 정본**: `commands/harness-task.md`(게이트 절·승인 규칙·통합 질문·인자), `commands/harness-loop.md` 진입·Dev·멈춤 조건 "승인 필요",
  `docs/harness-cycle.md` §2 S2 "현재" 열(△ → ✓ 게이트), `CHANGELOG.md` `[Unreleased]`.
- **호환**: 기존 task 불변. 옛 CLI는 게이트 줄을 평범한 체크박스로 본다(최소 버전 없음). 새 plan은 이 단계를 켤 때까지 `done`이 막힌다 — CHANGELOG에 적는다.

## Ontology
*이 task가 다루는 핵심 개념의 정의. "X가 정확히 뭔가?"에 답한다.*

- **사람 검토 단계(검토 게이트)**: plan `## 단계`의 `- [ ] [사람] spec 검토 승인 — <user>` 체크박스. 사람이 켜는 S2 게이트(구현 전 spec 검토)의
  기록이며, 신규 task에 기본으로 들어간다(생성 시 뺄 수 있음). 켜는 조건은 사용자의 명시적 승인뿐이다.
- **`[사람]` 단계**: 줄머리 체크박스 본문이 `[사람]`으로 시작하는 plan 단계 — 사람이 하는 일의 기록이라 Dev·오케스트레이터가 구현하거나 켜지 않는다.
  검토 게이트는 그 하나다.
- 게이트 근거(2026-11-18): 설계 결정은 상위 task에서 사용자가 승인했고(A5 기본값·A5-2), 이 task의 새 결정 셋(질문 시점·기존 task 거부·loop 범위)은
  R1에 닫혔다. Goal·Constraint·Success·Context 모두 명확 — 1.0.

## Ambiguity 자가진단
*각 항목이 명확하면 체크. 3개 이상 미체크면 구현 진입 금지 — 인터뷰/브레인스토밍으로 복귀해
모호성을 제거한다. 게이트를 통과하면 그 근거를 위 Ontology 섹션에 한 줄로 남긴다.*

- [x] **Goal 명확도** (40%) — 목표가 한 문장으로 구체화되었는가? — 신규 task plan에 사람 검토 단계를 기본으로 넣고 loop·규범이 그 단계를 존중한다
- [x] **Constraint 명확도** (30%) — 기술/시간/범위 제약이 명시되었는가? — 소급 없음·새 meta/Done evidence 키 없음·차단 없음·A3 제외
- [x] **Success 기준** (30%) — 완료를 어떻게 측정하는가? — 아래 Done evidence + `npm test`·`docs:check`·`pr-check --base origin/main` 통과
- [x] **Context 명확도** (brownfield 한정) — 영향 받는 기존 코드/파일을 식별했는가? — 범위 In 목록
- [x] **Ambiguity ≤ 0.2** — 위 항목 가중합 ≥ 0.8 — 1.0(2026-11-18)

<!-- 선택 선언. 아래 주석을 벗기면 done 가드가 검사한다.
     미선언 기본값: "tests": "optional" ("required"면 소스가 바뀔 때 테스트 파일 변경을 요구), "review": "optional",
     "verify": "optional" ("required"면 검증 프레이밍 kind 마커 — -adversarial 등 — 를 요구).
     R2(옵트인): "scenarios": [{ "id", "given", "when", "then", "test", "cmd" }] — 수용 기준을 Given/When/Then으로 쓰고
     증거(테스트 이름·명령)를 잇는다. `harness-team scenario check`가 cmd exit 0을, `review <engine> --framing scenario`가
     "증거가 Then을 검증하는가"를 판정한다. 선언하면 verify 증거는 -scenario kind만 센다. -->
## Done evidence
```json
{ "version": 1, "review": "required", "tests": "required" }
```

## 참고
*코드 기반 참조가 산문 설계보다 정밀하다 — 테스트 스위트·Boundary contract(JSON Schema)·
다이어그램·기존 코드 경로를 우선 링크하고, 산문은 코드로 표현 못 하는 의도만 담는다.*

- 테스트: `tests/task-templates.test.mjs`(게이트 줄·삽입 위치·`--no-review-gate`·재활성화 불변·기존 task 거부·`firstOpenPlanStep`),
  `tests/pr-check.test.mjs`(게이트 변형 차단), `tests/cli-args.test.mjs`(boolean·task 전용·help), `tests/loop-command.test.mjs`(진입·Dev·승인 필요),
  `tests/agent-files.test.mjs`(harness-task 게이트 절), `tests/review-model.test.mjs`(`--reviewer` 거부 안내의 `--member`).
- 후속(범위 밖): 다른 boolean 플래그도 `--flag=false`를 truthy 문자열로 받는다(파서 공통) — 이 task는 `--no-review-gate`만 거부한다.
- 후속(범위 밖): `--reviewer`로 만든 spec(`taskSpecTemplate(task, { reviewer })`)을 손대지 않고 커밋하면 pr-check가 템플릿 그대로로 잡지 못한다 — A6의 같은 부류.
- 다이어그램 옵트인: 2026-11-18 생성 시 — 묻지 않고 건너뜀(plan에 단계 없음). 사유: 템플릿 한 줄·플래그·문서 변경이라 구조 변화가 없다. 완료 보고에 명시.
- 이 task의 plan에는 게이트 단계가 없다 — 이 기능 전의 CLI로 만들었고(소급 없음), 설계 승인은 상위 task plan의 `[사람]` 단계에 있다.

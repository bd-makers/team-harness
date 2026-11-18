# spec-ask-markers — Spec

## 목적 / 요구사항
*문제(오늘 무엇이 안 되는가) → 영향받는 사용자·시스템 → 기대 결과 → 제약 순으로 쓴다.
답 없는 질문은 요구가 아니다 — `## 참고` 절에 `- (open) …`으로 남긴다.*

**문제**: spec의 답 없는 질문은 `(open)` 하나로만 적는다. 다른 역할(기획·디자인·백엔드 등)에 물어야 하는 질문을
"아직 안 물었다 / 물었고 답을 기다린다 / 답은 왔고 spec 반영만 남았다"로 구분할 수 없다. kc-platform 회고(A4)는
이를 `(open → ask:<역할>)`로 적자고 제안했지만, 그 문법은 기존 이월 문법 `(open → <대상>)`과 겹친다. interview의
열린 질문 검사는 대상이 적힌 `(open → …)`을 통과시키므로 답이 없는 질문이 게이트를 통과한다.
**영향**: spec을 쓰는 개발자, `/harness-spec`(writer)·`/harness-interview`(validator) 페르소나, 그 문서를 읽는 Codex·Cursor.
**기대 결과**: 외부 질의 질문에 상태 세 단계를 적는 별도 마커가 생기고, 세 상태 모두 게이트를 통과하지 못한다.
`/harness-spec`은 끝에 역할별 질의 목록을 낸다. 하네스는 어디에도 게시하지 않는다.
**제약**: 문서와 spec 템플릿 문구만 바꾼다. src 파서·새 설정 키·handler 발견 장치를 만들지 않는다(설계 결정 A4-1·A4-2).

- 마커 상태 계약 — `- (ask:<역할>) <질문>` → `- (asked:<역할> <YYYY-MM-DD> <링크>) <질문>` → `- (answered <링크>) <질문>`.
  답을 spec에 반영하면 마커를 지운다. 상태 전이는 사람이 적는다. (설계 A4-1)
- 세 상태는 열린 질문 검사와 R1 검사를 통과하지 못한다. 역할·`ask:`는 이월 대상이 아니다. (설계 A4-2)
- `/harness-spec` 6단계는 끝에 역할별 ask 목록을 낸다. 프로젝트가 정한 rule·skill이 있으면 그 실행을 제안만 한다. (설계 handler)

## 범위 (In / Out)
- **In**: `commands/harness-interview.md`(열린 질문 검사·R1 ②·표기 구분·차단 시 목록), `commands/harness-spec.md` 6·7단계,
  `src/commands/task.mjs` spec 템플릿 안내문 두 곳, `templates/docs/README.md` 규약 한 줄, pin 테스트
  (`tests/task-templates.test.mjs`·`tests/agent-files.test.mjs`), `CHANGELOG.md` `[Unreleased]`.
- **Out**: src 파서·기계 검사(설계: "src 파서 없음"), 외부 tracker 게시(하네스는 tracker 중립), handler 발견 장치·설정 키
  (설계 결정), ask 항목의 이월 경로(A4-2가 세 상태 모두 실패로 정함), 기존 `(open)`·`(open → <대상>)` 의미 변경.

## 원천 검토 (R1)
*원천 문서(PRD·Figma·API 문서·기획서·정책서) 사이의 충돌·누락·모순을 Plan 전에 검토한다(`/harness-interview`).
충돌·모순은 `(unresolved)`, 누락은 `(open)`으로 적고, `→ 결정: …`으로 해결한 뒤 재대조해 `- 검토 완료: <날짜>`로 닫는다.
원천이 없으면 `- 없음 — <사유>` 한 줄. 원천 위치는 프로젝트가 정한다.*

### 원천
- (설계) `docs/chad/team-harness-improvements/team-harness-improvements-spec.md` — "A4" 절, R1 발견 "A4 문법 충돌"
- (PR) bd-makers/team-harness PR #184 — 위 설계의 머지(`5993b27`)
- (코드) `commands/harness-interview.md` 6단계·R1, `commands/harness-spec.md` 6단계, `src/commands/task.mjs` `taskSpecTemplate`

### 발견
- **A4 문법 충돌** (설계 R1에서 옮김) — `(open → ask:<역할>)`은 기존 이월 문법 `(open → <대상>)`과 겹친다. interview 열린 질문 검사는
  대상이 적힌 `(open → …)`을 통과시키므로 답이 없는 질문이 게이트를 통과한다. R1 절은 이월 자체를 금지한다. handler 발견 방식은
  정의돼 있지 않고 `(open)`은 산문 규약뿐이며 src 파서는 없다.
  → 결정(2026-11-18 사용자 승인, A4-1·A4-2): 이월과 섞이지 않는 별도 태그 `ask:` → `asked:` → `answered` → 반영 후 삭제. 세 상태 모두 열린 질문 검사·R1을 통과하지 못한다. handler 발견 장치는 두지 않고 목록 출력과 실행 제안만 한다.
- 코드 대조 — 마커를 읽는 src 파서가 없다(`grep` 결과: `src/`·`tests/sim/`에 `(open)` 파서 없음). pr-check는 `taskSpecTemplate`
  함수를 직접 불러 "템플릿 그대로"를 판정하므로 문구 변경이 판정을 어긋내지 않는다. → 결정: 설계대로 문서·pin 테스트만 바꾼다.
- 검토 완료: 2026-11-18 — 새 발견 없음

## 설계 / 접근

### 마커 상태 계약
| 상태 | 표기 | 뜻 |
|---|---|---|
| 질의 필요 | `- (ask:<역할>) <질문>` | 이 역할에 물어야 한다. 아직 묻지 않았다 |
| 질의됨 | `- (asked:<역할> <YYYY-MM-DD> <링크>) <질문>` | 물었다. 링크는 질의 위치(이슈·댓글·스레드) |
| 답 받음 | `- (answered <링크>) <질문>` | 답이 왔다. 링크는 답 위치. spec 반영이 남았다 |
| 반영 | (마커 삭제) | 답을 요구사항·설계에 반영했다 |

- `(open)`과의 경계: `(open)`은 누구에게 물을지 정하지 않은 답 없는 질문이다. 다른 역할에 물어야 하면 `ask:`로 적는다.
- 이월과 섞지 않는다: `(open → <대상>)`의 대상은 다음 task·`docs/decisions.md` 같은 **기록 위치**다. 역할·`ask:`는 대상이 아니다 —
  `(open → ask:기획)`·`(open → 기획)`은 유효한 이월이 아니다.
- 상태 전이는 사람이 적는다. 하네스는 게시하지 않고, 게시 handler를 찾지 않는다.

### 문서별 변경
- `commands/harness-interview.md` 6단계 — 열린 질문 검사에 "spec 어디든 목록 항목의 ask 3상태는 통과하지 못함"과 이월 비대상 문장.
  R1 ②에 ask 3상태 추가(기존 pin 문자열은 그대로 두고 뒤에 덧붙임). 표기·언급 구분 문장을 ask 마커에도 적용. 통과를 못 하면
  남은 ask 항목을 역할별로 보인다.
- `commands/harness-spec.md` 6단계 — ask 마커 bullet 추가, 끝에 역할별 ask 목록 출력과 rule·skill 실행 제안(제안만). 7단계 인계에 ask 항목.
- `src/commands/task.mjs` 템플릿 — 목적 절·R1 절 안내문에 ask 마커 한 구절. 안내문은 목록 항목이 아니게 유지.
- `templates/docs/README.md` — 규약 줄에 ask 마커 한 구절.

## Ontology
*이 task가 다루는 핵심 개념의 정의. "X가 정확히 뭔가?"에 답한다.*

- **ask 마커**: 다른 역할의 답이 필요한 질문에 붙는 괄호 태그 `ask:`·`asked:`·`answered` 세 상태. 목록 항목에 맨 글자로 붙은 것만
  표기이고, 백틱 안 언급은 세지 않는다. 답이 spec에 반영되면 지운다.
- **역할**: 질문을 받을 사람·팀의 이름(예: 기획·디자인·백엔드). 프로젝트가 정하며 하네스는 목록을 두지 않는다.
- **이월 대상**: `(open → <대상>)`의 대상. 질문을 넘겨 기록하는 위치(다음 task·`docs/decisions.md`)이며 역할이 아니다.
- **handler**: 프로젝트가 정한, 질의를 외부에 게시하는 rule·skill. 하네스는 발견하지 않고 실행을 제안만 한다.
- 게이트 통과 근거(2026-11-18): Goal(문제·기대 결과 문장)·Constraint(문서만·파서 없음)·Success(Done evidence의 `npm test`·pin 테스트)·
  Context(바뀌는 파일 목록) 모두 본문 인용 가능. 설계 결정 A4-1·A4-2가 사용자 승인으로 확정돼 열린 질문 없음. R1 검토 완료.

## Ambiguity 자가진단
*각 항목이 명확하면 체크. 3개 이상 미체크면 구현 진입 금지 — 인터뷰/브레인스토밍으로 복귀해
모호성을 제거한다. 게이트를 통과하면 그 근거를 위 Ontology 섹션에 한 줄로 남긴다.*

- [x] **Goal 명확도** (40%) — 목표가 한 문장으로 구체화되었는가? — 목적 절 "문제"·"기대 결과"
- [x] **Constraint 명확도** (30%) — 기술/시간/범위 제약이 명시되었는가? — 목적 절 "제약", 범위 Out
- [x] **Success 기준** (30%) — 완료를 어떻게 측정하는가? — `npm test` 통과(새 pin 포함), `docs:check`
- [x] **Context 명확도** (brownfield 한정) — 영향 받는 기존 코드/파일을 식별했는가? — 범위 In 파일 목록
- [x] **Ambiguity ≤ 0.2** — 위 항목 가중합 ≥ 0.8

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

- 설계 정본: `docs/chad/team-harness-improvements/team-harness-improvements-spec.md` "A4" 절
- pin 테스트: `tests/task-templates.test.mjs`(템플릿 안내문), `tests/agent-files.test.mjs`(interview·spec 명령 문구)

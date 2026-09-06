# intent-md-alignment — Spec

## 목적 / 요구사항

Anthropic 블로그 "The AI-Native SDLC Playbook"(2026-09-06 검토,
https://claude.com/blog/the-ai-native-sdlc-playbook)의 Stage 1 `intent.md`를 하네스와 대조한 결과다.
별도 intent 파일은 두지 않고, intent 템플릿의 두 요소(Problem · Open questions)만 기존 spec 표면에
흡수하며, Stage 6의 "관측 이탈 → intent 작성" 루프백을 `observe`의 nudge로 붙인다.

**문제 — 오늘 무엇이 안 되는가:**
- `/harness-spec` 인터뷰 차원(Goal·Constraint·Success·Context·Ontology)에 "오늘 무엇이 안 되고 누가
  영향받는가"를 묻는 축이 없다. 사람이 직접 쓴 spec은 관행으로 문제를 먼저 적지만
  (`summary-branch-guard`·`scaffold-pm-permissions`) AI writer 경로와 직접 작성 경로 어디에도 그 안내가 없다.
- 이월할 열린 질문의 집이 없다. writer의 `(unresolved)`는 소스 충돌 전용이고 validator의 follow-up은
  범위 내 질문만 다룬다. 범위 밖 질문(블로그 예: "제3자 손해사정인도 접근이 필요한가?")은 사라진다.
- `harness-team observe`는 트립와이어 발화 시 exit 1과 세션 로그 추적 안내로 끝난다
  (`src/commands/observe.mjs:320`). 발화 내용이 task로 이어지는 간선이 없다.

**영향받는 사용자:** 하네스로 task를 여는 드라이버(Claude 세션·사람), Codex 래퍼 스킬 사용자.

**인도할 것:**
1. `commands/harness-spec.md` — 인터뷰 차원에 **Problem**(오늘 못 하는 것·영향받는 사용자)을 추가한다.
   열린 질문 규약: 답을 못 받은 질문은 `## 참고` 절에 `- (open) …` 항목으로 남기고 인계 시 명시한다.
2. `commands/harness-interview.md` — §2 선행 채점에서 Goal pass 근거로 기대 결과 문장과 **문제 문장**
   (오늘 못 하는 것) 인용을 함께 요구한다. §3 Goal 각도에 문제 질문을 넣는다. §6 게이트에 "`(open)` 항목마다
   답이 spec에 반영됐거나 이월 대상이 적혀 있어야 통과"를 추가한다.
3. `src/commands/task.mjs` spec 템플릿 — `## 목적 / 요구사항` 아래 이탤릭 안내문 1줄(문제·영향받는 사용자·
   기대 결과·제약). 목록 항목이 아니므로 sim 출처 태그 규칙(`tests/sim/rules.mjs` `reqItems`)에 잡히지 않는다.
4. `src/commands/observe.mjs` — 트립 시 `next_actions` 둘째 줄과 텍스트 렌더의 트립와이어 줄 바로 아래(표 앞) `next:` 줄에
   `harness-team task observe-<wire-id>-<day>` 제안과 "spec 목적 절에 발화 id·수치를 문제 진술로 옮겨라"
   (`<day>`는 실행일이 아니라 **발화 사건의 UTC 날짜** — Codex P2 반영: `repeat-failure-3x`는 창 전체를 보므로
   실행일로 키를 잡으면 같은 사건이 매일 다른 이름을 받는다)
   nudge를 넣는다. **자동 생성은 없다.** `tests/observe.test.mjs` 트립 케이스에 assert를 추가한다.
5. `commands/harness-observe.md` · README observe 절 · `templates/docs/README.md` 규약 줄에 바뀐 계약을 반영하고
   CHANGELOG `[Unreleased]`에 적는다.

**비목표 — 검토에서 기각·보류한 것:**
- `<name>-intent.md` 6번째 파일: AGENTS.md "포인터 껍데기 금지"와 doctor `checkActiveSpecGate`가 막아 둔
  실패 모드(spec 목적 절이 intent를 가리키는 껍데기가 됨)를 되살린다. 표면은 이미 6개(SSOT 4 + TCC + meta).
- PO accept/reject 게이트 · intent home · 비엔지니어 발의 경로: 역할표(D2)에 PO가 없다. 도입은 D 결정 선행.
- 요청자(author) 필드: 요청자 ≠ 실행자가 실제로 생길 때 `meta.json`에 넣는다. 지금은 거의 항상 동일인.
- 요구 churn 지표(첫 plan 커밋 이후 spec 커밋 수): 읽을 소비자가 없다.
- Problem을 5번째 가중 축으로(B안): 문제공간 누락이 반복 관측되면 승격한다. 가중치를 파싱하는 코드는 없어
  승격 비용은 템플릿 + 명령 문서 2개뿐이다.
- observe 발화 시 task **자동 생성**: 임계값(20·5·2×·3회)이 실사용 보정 전이라 오탐 task를 만든다. nudge까지만.

## 설계 / 접근

- 게이트·doctor·done 가드·summary 렌더러·SSOT 4파일 계약은 바꾸지 않는다. eager 계층(AGENTS.md·CLAUDE.md)도
  바꾸지 않는다 — 절차는 lazy 명령 문서에 둔다.
- **Problem을 채점 차원으로 만들지 않는 이유:** harness-interview §3은 채점표의 fail/na 차원에만 질문을 만든다.
  별도 각도로 두면 트리거가 없고, 가중 축으로 만들면 기존 task 템플릿과 갈린다(B안). Goal 차원 안에 넣으면
  기존 다섯 차원 구조 안에서 발사된다.
- **열린 질문에 절을 만들지 않는 이유:** 점수 없는 산문 절은 "고쳐진 것처럼 보이는" 표면만 늘린다.
  `## 참고` 절 + `(open)` 마커는 grep 가능한 규약이고 §6 게이트 조건으로 검사된다.
- observe nudge 문구는 JSON `next_actions`와 텍스트 렌더 양쪽에 같은 문장을 둔다. task 이름 후보에
  트립와이어 id와 day를 넣어 재실행 시 `activated:` 경로로 자연 수렴하게 한다.
- 릴리스 크기: ① 표면 기능 추가 → minor(MAINTAINING.md 기준). 이 task는 릴리스하지 않고 `[Unreleased]`에만 적는다.

## Ontology
*이 task가 다루는 핵심 개념의 정의. "X가 정확히 뭔가?"에 답한다.*

- **Problem 축**: spec Goal 차원 안에서 "오늘 무엇이 안 되는가 · 누가 영향받는가"를 답하는 문장.
  블로그 intent.md의 Problem + Affected users에 대응한다. 별도 체크박스·가중치는 없다.
- **(open) 항목**: `## 참고` 절의 `- (open) …` 목록 항목. 답이 spec에 반영되면 마커를 지우고,
  이월하면 `- (open → <대상>) …`으로 대상(다음 task·decisions.md 등)을 적는다.
- **루프백 nudge**: observe 트립 시 출력되는 task 생성 제안 문장. emitter가 아니다 — 사람 또는 에이전트가
  따를 때만 task가 생긴다. SessionStart task-gate와 같은 nudge 계층이다.
- 게이트 통과 근거(2026-09-06): 범위는 두 세션 검토(현재 세션 권고 3건 + opus 분석 조정 2건)로 확정됐고,
  사용자가 "A + observe 루프백 진행"으로 승인했다. 문서 + 소규모 코드 변경이라 CLAUDE.md 게이트 생략 조건에도 든다.

## Ambiguity 자가진단
*각 항목이 명확하면 체크. 3개 이상 미체크면 구현 진입 금지 — 인터뷰/브레인스토밍으로 복귀해
모호성을 제거한다. 게이트를 통과하면 그 근거를 위 Ontology 섹션에 한 줄로 남긴다.*

- [x] **Goal 명확도** (40%) — 인도할 것 1~5로 구체화. 근거: 두 세션 검토에서 범위 확정.
- [x] **Constraint 명확도** (30%) — 템플릿 절·가중치·SSOT 파일 수·eager 계층 무변경, task 자동 생성 금지.
- [x] **Success 기준** (30%) — `npm test` 통과, observe 트립 assert 신규 통과, manifest-sync·docs:check green.
- [x] **Context 명확도** (brownfield 한정) — 영향 파일: commands/harness-spec.md · harness-interview.md ·
  harness-observe.md, src/commands/task.mjs · observe.mjs, tests/observe.test.mjs · task-templates.test.mjs,
  templates/docs/README.md, README.md, CHANGELOG.md.
- [x] **Ambiguity ≤ 0.2** — 위 항목 가중합 1.0. 근거는 Ontology 마지막 줄.

<!-- 선택 선언. 아래 주석을 벗기면 done 가드가 검사한다.
     미선언 기본값: "tests": "required" (소스가 바뀌면 테스트 파일 변경을 요구), "review": "optional",
     "verify": "optional" ("required"면 검증 프레이밍 kind 마커 — -adversarial 등 — 를 요구). -->
## Done evidence
<!--
```json
{ "version": 1, "review": "required", "tests": "skip" }
```
-->

## 참고
*코드 기반 참조가 산문 설계보다 정밀하다 — 테스트 스위트·Boundary contract(JSON Schema)·
다이어그램·기존 코드 경로를 우선 링크하고, 산문은 코드로 표현 못 하는 의도만 담는다.*

- 블로그 원문: https://claude.com/blog/the-ai-native-sdlc-playbook — WebFetch 추출 2회 교차 + 원문 HTML에서
  핵심 문구 8개 grep 대조(2026-09-06).
- 외부 지침 선별 적용 선례: `docs/hslee/claude5-context-apply/claude5-context-apply-spec.md`.
- 인터뷰 트리거 구조: `commands/harness-interview.md` §2~§3 (fail/na 차원만 질문).
- sim 출처 태그 규칙: `tests/sim/rules.mjs` `reqItems` — 목록 항목만 센다.
- observe 트립 케이스 테스트: `tests/observe.test.mjs` "three hook failures … tripped".

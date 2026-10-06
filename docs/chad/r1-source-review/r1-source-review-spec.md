# r1-source-review — Spec

## 목적 / 요구사항
*문제(오늘 무엇이 안 되는가) → 영향받는 사용자·시스템 → 기대 결과 → 제약 순으로 쓴다.
답 없는 질문은 요구가 아니다 — `## 참고` 절에 `- (open) …`으로 남긴다.*

**문제**: 사이클 S1의 R1 "원천 문서 검토"가 없다. 원천 문서(PRD·Figma·API 문서·기획서·정책서) **사이**의 충돌·누락·모순을
Plan 전에 걸러내는 장치가 하네스에 없다. Ambiguity 게이트와 contrarian(A1–A4)은 spec 문서 자체만 본다(cycle §4-1).
게다가 `/harness-spec`이 이미 소스 간 충돌을 `(unresolved)`로 표기하지만(`commands/harness-spec.md:47`) 그 표기를
읽는 게이트가 없다 — `/harness-interview` 6단계는 `(open)`만 검사한다. 충돌이 표기된 채로 Plan에 들어갈 수 있다.

**영향받는 사용자**: 기획이 동결되지 않은 원천(kc_vault·Confluence·Figma)에서 spec을 뽑는 소비자 팀원(kc-platform 등).
원천끼리 어긋난 채로 plan·구현에 들어가면 그 어긋남이 코드와 리뷰 단계에서 늦게, 비싸게 드러난다.

**기대 결과**: spec 단계가 끝나기 전에 원천 사이의 충돌·누락·모순을 찾아 사용자에게 고지하고, 해결된 뒤에만
`/harness-interview`가 통과를 선언해 Plan으로 넘어간다. 해결은 spec에 기록된다.

**요구사항**
1. spec 템플릿에 R1 전용 절 `## 원천 검토 (R1)`을 둔다 — 원천 목록(종류·경로|URL)과 발견(충돌·누락·모순)과 그 결정을
   담는다. 원천이 없는 task는 `- 없음 — <사유>` 한 줄로 끝낸다. (interview)
2. 원천 목록은 커밋되는 spec에 선언한다. `.harness/config.json`(사용자별·gitignore)에 두지 않는다 — 팀원마다 원천이
   달라지는 함정(cycle §4-2 정정과 같은 원인). (interview)
3. 하네스는 원천 위치의 분류 체계(예: kc-platform `wiki/10_ssot/`)를 코드·템플릿 기본값에 박지 않는다(D11 — 프로젝트
   데이터). 문서에는 소비자 예시로만 언급한다. (interview)
4. R1 실행은 `/harness-interview` 안의 단계로 한다 — 세션 안에서 돌아 Confluence·Figma MCP와 로컬 파일 모두에 닿는다. (interview)
5. 발견 표기는 기존 어휘를 재사용한다 — 충돌·모순은 `(unresolved)`, 누락은 `(open)`. 새 마커를 만들지 않는다. (interview)
6. "해결된 뒤에만 Plan"은 규범으로 지킨다: interview 6단계가 ① R1 절에 `없음 — 사유` 또는 `검토 완료` 줄이 없거나
   ② R1 절 목록 항목에 `(unresolved)`·`(open)`이 남았거나 ③ spec 어디든 목록 항목에 `(unresolved)`가 남았으면 통과를
   선언하지 않는다. R1 절에는 `(open → <대상>)` 이월을 허용하지 않는다 — 결정 줄(`→ 결정: …`, 임시 결정 포함)이 해결이다. 표기는 목록 항목의 맨 글자 괄호 태그(`(interview, unresolved)` 포함)이고, 백틱 안의 언급은 세지 않는다(codex 리뷰 P2 반영). (interview)
7. 해결 후 재검토: 결정을 반영한 뒤 대조를 한 번 더 돌려 새 발견이 없을 때 `검토 완료` 줄을 남긴다 — 해결안이 새
   불일치를 만들 수 있다. (interview)
8. `/harness-spec`은 수집에 쓴 원천 위치를 R1 절의 원천 목록에도 적는다(3소스 재사용). (interview)

**성공 기준** (interview 2026-10-06 합의)
1. pin 테스트 — 템플릿의 `## 원천 검토 (R1)` 절(위치: `## 목적 / 요구사항` 다음)과 interview 6단계 통과 조건 ①–③ 문구를
   고정하고 `npm run test`가 green이다. 문구 삭제 회귀만 잡는다.
2. 자체 검증 — 이 spec의 R1 절이 새 형식으로 실제 발견을 기록·해결하고 `검토 완료` 줄로 닫혔다.
- 보장하지 않는 범위: 에이전트가 규범을 실제로 지키는지(agent-in-the-loop)는 측정하지 않는다 — `harness-sim` 실측은 생략(사용자 결정).

**제약**
- 기계 차단을 추가하지 않는다 — D11상 PR 강제는 4문서뿐이다(아래 R1 절 발견 1의 결정).
- A1(`r2-scenario-evidence`)과 병렬 진행 중이다. `review-prompts.mjs`·`VERIFY_KIND_SUFFIXES`는 건드리지 않고,
  spec 템플릿 변경은 `## Done evidence`(A1 예상 영역)에서 떨어진 위치로 한정한다.

## 원천 검토 (R1)
*원천 문서(PRD·Figma·API 문서·기획서·정책서) 사이의 충돌·누락·모순을 Plan 전에 검토한다(`/harness-interview`).*

### 원천
- (기획서) `docs/harness-cycle.md` §4-1 R1 정의 · §4-3 루프 모양 · §4-4 메인테이너 입력(2026-10-06) · §5 2차 장치 규칙
- (정책서) `docs/decisions.md` D11 — 범위 헌장
- (기획서) 메인테이너 브리프(2026-10-06, 이 세션 지시) — (a)–(d) 결정 항목

### 발견
- 충돌: cycle §2 표의 R1 게이트 "(차단)"·§4-1 "해결된 뒤에만 Plan" vs D11 "강제하는 것(하나뿐): PR의 task 문서" —
  R1을 기계로 막으면 D11 위반. → 결정: 차단은 규범 — interview가 통과를 선언하지 않는 것이 차단이다. 기계 차단은 두지 않는다
  (브리프 (c) 기본값).
- 누락: 원천이 저장소 밖(kc_vault)·MCP 뒤(Confluence·Figma)에 있을 때 누가 어떻게 읽는지 원천 어디에도 없다(§4-4는
  `10_ssot`가 "입력 자리와 겹친다"까지만). → 결정: 세션 안 실행(요구 4) — 로컬 경로는 직접, URL은 MCP, 둘 다 실패하면
  사용자 붙여넣기. 그래도 못 읽은 원천은 `(open)` 발견으로 남는다.
- 충돌: §4-4 "`10_ssot/`가 R1 입력 자리" vs D11 "위키 분류 체계를 코드에 박지 않는다". → 결정: 원천 경로를 spec에 선언(요구 2·3).
- 검토 완료: 2026-10-06 — 결정 반영 후 재대조, 새 발견 없음

## 설계 / 접근

**변경 대상** (모두 문서·템플릿 — CLI 동작 변경 없음)
| 파일 | 변경 |
|---|---|
| `src/commands/task.mjs` `taskSpecTemplate` | `## 목적 / 요구사항` 다음에 `## 원천 검토 (R1)` 절(`### 원천`·`### 발견` 골격) |
| `tests/fixtures/task-paths-golden/expected.txt` | 템플릿 변경 반영 |
| `commands/harness-interview.md` | 1단계에서 R1 절차를 먼저 수행 + `## R1 원천 검토` 절 + 6단계 통과 조건 ①–③ |
| `commands/harness-spec.md` | 6단계: 원천 위치를 R1 절에도 적는다 |
| `tests/task-templates.test.mjs`·`tests/agent-files.test.mjs` | 템플릿 절 순서·interview 게이트 문구 pin |
| `docs/harness-cycle.md` | §2 S1 "현재" 칸 · §4-1 구현 메모 |
| `CHANGELOG.md` | `[Unreleased]` |

Codex 스킬 래퍼(`skills/harness-interview`)는 커맨드 문서를 정본으로 읽으므로 고치지 않는다. 기존 task의 spec은 절이 없다 —
interview는 절이 없으면 만들어 채운다(migrate 불필요). `pr-check`는 템플릿 동일성으로 판정하므로 새 절은 판정을 바꾸지 않는다.

**기각한 대안** (2차 장치 규칙 §5 — 원래 장치를 늘리지 않는 쪽부터 검토)
- **contrarian 확장(A5 행 추가)** — 기각. contrarian은 spec·plan을 읽는데 R1 시점엔 plan이 없다. A행을 바꾸면 기존
  `-contrarian` 증거(meta.reviews)의 의미가 바뀐다. 묻는 것도 다르다 — "가정이 옳은가" 대 "원천끼리 맞는가".
- **`--framing sourcecheck` (외부 read-only 엔진)** — 보류. ① codex read-only에는 Confluence·Figma MCP가 없어 로컬 파일만
  읽는다 — 원천 일부만 본다. ② `meta.reviews`는 task 끝의 done 가드만 읽어 "Plan 전" 게이트가 되지 못한다. ③ A1이 고칠
  가능성이 큰 파일(`VERIFY_KIND_SUFFIXES`, 템플릿 7종 pin, `review.mjs:442`·`scope.mjs:16` 문자열)과 정면 충돌한다.
  독립 엔진의 이점(편향 분리)은 R1에서 작다 — 원천의 작성자는 기획자이지 세션이 아니다. 소비자 수요가 생기면 재검토.
- **별도 스킬·커맨드 `/harness-source-review`** — 기각. 새 커맨드·스킬 래퍼·매니페스트 등록이 생기고, Plan 전 통과 선언은
  이미 interview가 맡는다 — 같은 결정 지점을 둘로 나눈다.
- **기계 차단(plan 체크 시 `(unresolved)` 검사 등)** — 기각. D11 강제 범위 밖. 규범 + 기록(spec 절)이 기본값이고,
  기계 차단을 원할 근거(규범 우회 사례)가 아직 없다.

## Ontology
*이 task가 다루는 핵심 개념의 정의. "X가 정확히 뭔가?"에 답한다.*

- **원천 문서**: spec이 요구를 뽑아 온 1차 문서 — PRD·Figma·API 문서·기획서·정책서. spec 자체·task 문서·코드는 원천이 아니다.
- **충돌**: 두 원천이 같은 대상을 다르게 정의한다 → `(unresolved)`.
- **모순**: 한 원천 안에서 두 진술이 양립하지 않는다 → `(unresolved)`.
- **누락**: 한 원천이 전제하는 것을 어느 원천도 정의하지 않는다(예: Figma 화면의 에러 상태에 정책 없음), 또는 원천을 읽지 못했다 → `(open)`.
- **해결**: 발견 줄에서 마커를 지우고 `→ 결정: …`을 붙인 상태. 임시 결정(가정 + 원천 수정 대상)도 해결이다.
- **검토 완료**: 해결 반영 후 재대조에서 새 발견이 없음을 날짜와 함께 남긴 줄. R1 통과의 기록이다.
- **게이트 통과 (2026-10-06 /harness-interview)**: Goal·Constraint·Success·Context·Ontology 전부 pass(Success는 인터뷰로 성공 기준 절 추가), 열린 질문 없음 → Ambiguity ≤ 0.2.

## Ambiguity 자가진단
*각 항목이 명확하면 체크. 3개 이상 미체크면 구현 진입 금지 — 인터뷰/브레인스토밍으로 복귀해
모호성을 제거한다. 게이트를 통과하면 그 근거를 위 Ontology 섹션에 한 줄로 남긴다.*

- [x] **Goal 명확도** (40%) — 목표가 한 문장으로 구체화되었는가? — 문제 문장(`(unresolved)`를 읽는 게이트가 없다)과 기대 결과(해결된 뒤에만 interview가 통과 선언)
- [x] **Constraint 명확도** (30%) — 기술/시간/범위 제약이 명시되었는가? — 제약 절: 기계 차단 없음(D11), A1 파일 회피
- [x] **Success 기준** (30%) — 완료를 어떻게 측정하는가? — 성공 기준 절: pin 테스트 green + 이 spec R1 절 자체 검증 (sim 생략)
- [x] **Context 명확도** (brownfield 한정) — 영향 받는 기존 코드/파일을 식별했는가? — 설계 절 변경 대상 표
- [x] **Ambiguity ≤ 0.2** — 위 항목 가중합 ≥ 0.8

<!-- 선택 선언. 아래 주석을 벗기면 done 가드가 검사한다.
     미선언 기본값: "tests": "required" (소스가 바뀌면 테스트 파일 변경을 요구), "review": "optional",
     "verify": "optional" ("required"면 검증 프레이밍 kind 마커 — -adversarial 등 — 를 요구). -->
## Done evidence

```json
{ "version": 1, "review": "required" }
```

## 참고
*코드 기반 참조가 산문 설계보다 정밀하다 — 테스트 스위트·Boundary contract(JSON Schema)·
다이어그램·기존 코드 경로를 우선 링크하고, 산문은 코드로 표현 못 하는 의도만 담는다.*

- 정본: `docs/harness-cycle.md` §4-1(R1), §4-4(위키 입력), §5(2차 장치 규칙) · `docs/decisions.md` D11
- 기존 장치: `commands/harness-spec.md` 6단계(`(unresolved)`·`(open)` 규약) · `commands/harness-interview.md` 6단계(열린 질문 검사)
- 보류 대안 관련 코드: `src/commands/review-prompts.mjs` · `src/commands/task.mjs` `VERIFY_KIND_SUFFIXES` · `src/commands/review.mjs:442` · `src/commands/scope.mjs:16`
- 병렬 task: A1 `r2-scenario-evidence` — 겹칠 수 있는 파일: spec 템플릿(`task.mjs`), golden fixture. 나중에 머지하는 쪽이 main을 받아 해소.

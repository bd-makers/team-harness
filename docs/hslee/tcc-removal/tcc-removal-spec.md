# tcc-removal — Spec

## 목적 / 요구사항
**문제.** Task Context Card(`<name>-context.md`, TCC)는 손으로 유지하는 비-SSOT 캐시인데, 재개에 쓰였다는 증거가 없고 유지 비용은 실재한다.
AGENTS.md의 세션 시작 프로토콜(handoff → plan → spec)에는 TCC가 들어 있지 않고, 관측된 재개는 plan·handoff로 갔다.

**측정(2026-11-04).**
- 이 저장소: task 175, 카드 149, 빈 스캐폴드 45, 커밋 1회뿐 112. Claude SessionStart 훅이 없어 카드가 Claude에 주입된 적이 없다.
- `hs-react-monorepo`(훅 있음, 소비자 최대): 카드 68, 빈 스캐폴드 38, 커밋 1회뿐 57.
- 세션 기록: 훅이 돈 Claude 세션 46개 중 카드 주입 13(리뷰어 8), 재개 실사례 2, 카드 반영 직접 증거 0, 낡은 카드 사고 0, 부재로 막힘 0, capsule 재참조 0.
- 표본이 작다. "쓰였다는 증거가 없다"이지 "안 쓰였다는 증명"이 아니다. capsule `Cause`는 2026-11-03 도입이라 사용량으로 판단하지 않는다.

**기대 결과.** TCC를 폐지하고, SessionStart는 plan의 첫 미완 단계를 기계적으로 주입한다. 재현 가능한 실패 기록은 artifact로 옮긴다. eager 예산을 약 1.5 KB 돌려받는다.

**제약.** 새 명령·새 장치를 만들지 않는다(D11 2차 장치 규칙). 기존 `-context.md` 파일은 지우지 않는다. 소비자 migrate·init은 실행하지 않는다.

## 범위 (In / Out)
- **In**: `context` 명령과 `src/commands/context.mjs` 삭제, task 생성의 `context.md` 제거, `session-context`의 카드 주입을 plan 단계 주입으로 교체.
- **In**: AGENTS.md·템플릿의 TCC 절·JIT retrieval 절 삭제, task-gate 설명 갱신.
- **In**: `fix-bug`·`new-feature` 스킬의 failure capsule 지시를 artifact로 이동, 직전 스킬을 stock 픽스처로 등록.
- **In**: D12 정정, followups 25번 종결, 현행 문서·다이어그램 갱신, CHANGELOG BREAKING.
- **Out**: 기존 `-context.md` 파일 삭제(이 저장소 149개, 소비자 포함). 읽는 코드가 없어질 뿐이고 이력이다.
- **Out**: 판별 버전이 붙은 과거 문서(`*-0.x.y.html`, `what-changes-*`)와 당시 코드를 서술한 `docs/spec-monorepo-scope.md`.
- **Out**: `taskArtifactTemplate` 변경. `## Failures`는 필요할 때 만든다(pr-check 템플릿 대조와 리뷰 삽입 위치를 건드리지 않는다).
- **Out**: 소비자 migrate·init 실행, 릴리스.

## 원천 검토 (R1)
*원천 문서(PRD·Figma·API 문서·기획서·정책서) 사이의 충돌·누락·모순을 Plan 전에 검토한다(`/harness-interview`).
충돌·모순은 `(unresolved)`, 누락은 `(open)`으로 적고, `→ 결정: …`으로 해결한 뒤 재대조해 `- 검토 완료: <날짜>`로 닫는다.
원천이 없으면 `- 없음 — <사유>` 한 줄. 원천 위치는 프로젝트가 정한다.*

### 원천
- `docs/followups.md` 25번, `docs/hslee/subsystem-audit/subsystem-audit-spec.md` 후보 E, `docs/decisions.md` D11(2차 장치 규칙)·D12(실패 귀인 칸).

### 발견
- 후보 안의 "task 생성 시 plan 첫 단계로 채우기"는 글자 그대로 불가능하다. 생성 시 plan의 단계는 빈 `- [ ]`다.
  → 결정: 생성 시점이 아니라 주입 시점에 plan을 읽는다.
- 후보 안의 "handoff로 대체"도 그대로는 안 된다. task handoff는 post-commit 커밋 로그라 다음 단계가 없다.
  → 결정: 대체재는 handoff가 아니라 plan이다.
- D12 ③은 실패 귀인 칸을 capsule에 뒀고 capsule은 TCC 안에 있다. → 결정: 메인테이너가 폐지를 고른 2026-11-04 결정으로 artifact로 옮기고 D12에 정정을 남긴다.


## 설계 / 접근
1. `src/commands/task.mjs`에 `firstOpenPlanStep(content)`를 `planHasOpenBoxes` 옆에 둔다. 미완의 정의는 같다(줄머리 `- [ ]`). 내용 없는 체크박스는 건너뛴다.
2. `session-context`의 활성 task 경로: done-on-main 판정은 그대로 두고, breadcrumb 다음에 `[harness] 현재 단계: <줄>`을 한 줄 낸다. plan이 없거나 읽히지 않거나 미완 단계가 없으면 breadcrumb만 낸다. 줄은 `PLAN_STEP_MAX_CHARS`로 자른다(SessionStart 출력을 짧게 유지한다).
3. `context` 명령은 shim 없이 지운다. 0.x 표면 제거는 minor다(`MAINTAINING.md`). 옛 AGENTS.md가 부르면 unknown command로 exit 1이다.
4. failure 기록: 스킬이 artifact의 `## Failures`(없으면 만든다)에 `### F-NNN`으로 남기라고 지시한다. 해소해도 지우지 않고 `Resolved:` 줄을 붙인다. 귀인 기록을 남기는 것이 D12의 목적이다. 3개 상한은 없앤다. 카드 예산에서 온 제한이기 때문이다.

**기각.**
- 빈 칸일 때만 plan 단계 주입(카드 유지): 증상만 가리고 장치가 하나 늘어난다.
- 필드 축소: 쓰임이 증명된 필드가 없어서 무엇을 남길지 근거가 없고, 손으로 유지하는 비용은 남는다.
- capsule만 남긴 카드: 파일 하나와 명령 하나를 채운 사례 소수를 위해 유지하게 된다.
- `context` deprecation shim: 사용자가 직접 치는 명령이 아니고 2차 장치다.

## Ontology
*이 task가 다루는 핵심 개념의 정의. "X가 정확히 뭔가?"에 답한다.*

- **현재 단계**: plan에서 내용이 있는 첫 미완 체크박스 줄. 파생값이라 저장하지 않는다.
- **Failure 기록**: artifact `## Failures`의 `### F-NNN` 항목. 재현 가능한 실패의 신호·시도·가설·원인 범주·판별법·source. 해소돼도 남는다. 옛 failure capsule을 대체한다.
- 게이트 근거: 목표·제약·완료 기준을 메인테이너가 폐지안 표로 승인했다(2026-11-04).

## Ambiguity 자가진단
*각 항목이 명확하면 체크. 3개 이상 미체크면 구현 진입 금지 — 인터뷰/브레인스토밍으로 복귀해
모호성을 제거한다. 게이트를 통과하면 그 근거를 위 Ontology 섹션에 한 줄로 남긴다.*

- [x] **Goal 명확도** (40%) — 목표가 한 문장으로 구체화되었는가?
- [x] **Constraint 명확도** (30%) — 기술/시간/범위 제약이 명시되었는가?
- [x] **Success 기준** (30%) — 완료를 어떻게 측정하는가?
- [x] **Context 명확도** (brownfield 한정) — 영향 받는 기존 코드/파일을 식별했는가?
- [x] **Ambiguity ≤ 0.2** — 위 항목 가중합 ≥ 0.8

<!-- 선택 선언. 아래 주석을 벗기면 done 가드가 검사한다.
     미선언 기본값: "tests": "optional" ("required"면 소스가 바뀔 때 테스트 파일 변경을 요구), "review": "optional",
     "verify": "optional" ("required"면 검증 프레이밍 kind 마커 — -adversarial 등 — 를 요구).
     R2(옵트인): "scenarios": [{ "id", "given", "when", "then", "test", "cmd" }] — 수용 기준을 Given/When/Then으로 쓰고
     증거(테스트 이름·명령)를 잇는다. `harness-team scenario check`가 cmd exit 0을, `review <engine> --framing scenario`가
     "증거가 Then을 검증하는가"를 판정한다. 선언하면 verify 증거는 -scenario kind만 센다. -->
## Done evidence
<!--
```json
{ "version": 1, "review": "required", "tests": "required" }
```
-->

## 참고
*코드 기반 참조가 산문 설계보다 정밀하다.*

- 완료 기준: `npm test`·`npm run docs:check` 통과, 현행 표면에 `context init|check` 안내가 0건, 새 task에 `-context.md`가 생기지 않음, `session-context`가 첫 미완 단계를 낸다.
- 코드: `src/commands/session-context.mjs`, `src/commands/task.mjs`, `tests/session-context.test.mjs`.

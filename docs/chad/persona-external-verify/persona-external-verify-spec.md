# persona-external-verify — Spec

## 목적 / 요구사항

적대적 검증(D6) 도입 **3단계**: 페르소나 층(spec/plan 문서)에도 별도 컨텍스트의
read-only 검증자를 옵트인으로 연결한다. `adversarial-verify-rubric`(1–2단계)의
"범위 제외" 절에서 이월된 범위이며, 같은 패턴의 **순수 명령 문서 편집 + 규범 pin
테스트**다 (src 변경은 4단계 후속 task).

요구사항:

1. **contrarian external 엔진 옵션** — `commands/harness-contrarian.md`에 옵트인
   외부 엔진 실행 절을 추가한다. 첫 토큰이 `codex`·`claude`·`gemini`·`custom`이면
   해당 엔진으로 실행하고(절차·엔진 표는 `/harness-review` 재사용), 기존 4각도
   반론을 A1–A4 루브릭 표(심각도 BLOCKER/MAJOR/MINOR)로 승격하며, 마커는
   `kind=<engine>-contrarian`으로 활성 task artifact `## Reviews`에 남긴다.
   인수가 없으면 기존 대화형 페르소나 경로 그대로다.
2. **simplifier external 엔진 옵션** — `commands/harness-simplifier.md`에 동일
   패턴을 추가한다. 기존 4개 체크리스트를 R1–R4 루브릭 표로 승격, 마커는
   `kind=<engine>-simplifier`. external 모드에서 검증자는 제거안을 **제안만**
   하고, plan.md 수정은 driver가 사용자 승인 후 수행한다(기존 3번 규칙 유지).
3. **interview 채점 선행 단계** — `commands/harness-interview.md`의 질문 생성(2번)
   앞에 **선행 채점** 단계를 넣는다: spec 텍스트 증거만으로 4차원(Goal·Constraint·
   Success·Ontology)을 pass/fail/na로 먼저 채점하고, fail/na 차원만 질문 대상으로
   삼으며, Ambiguity 체크박스 갱신은 채점표 갱신에만 근거한다(D6 정직성 규칙:
   증거 없는 항목은 pass가 아니라 na). 외부 엔진은 쓰지 않는다 — 질문은 여전히
   사용자와의 대화다.
4. **kind 접미사 목록 확장** — `commands/harness-review.md` 5단계 접미사 열거에
   `-contrarian`·`-simplifier`를 추가한다 (D-log의 D6 전문은 역사 기록이므로
   수정하지 않는다 — 마커 계약의 정본은 harness-review 명령 문서다).
5. **회귀 pin 테스트** — `tests/agent-files.test.mjs`의 kind 접미사 소비 표면
   테스트를 4곳 → 6곳(contrarian·simplifier)으로 확장하고, interview 선행 채점
   규범(fail/na만 질문·증거 없는 pass 금지)을 pin 한다.
6. **CHANGELOG `[Unreleased]` 갱신.**

범위 제외 (후속 task = 4단계): `done` 가드 `verify` evidence 키·kind allowlist 등
`src/commands/task.mjs` 변경, sim 순수 채점 함수의 rule 층 승격, AO 워커 §8 검증
슬롯(`docs/ao-worker-rules.md`, ≤100행 제약).

## 설계 / 접근

- **새 메커니즘을 만들지 않는다.** `harness-adversarial-review`가 확립한 "절차·엔진
  표는 harness-review 재사용, 리뷰 프롬프트만 교체, kind 접미사로 구분" 패턴을
  페르소나 두 개에 그대로 적용한다.
- **층 구분이 정체성이다.** contrarian/simplifier external은 **spec/plan 문서 층**을
  공격한다 — 구현 diff 층을 공격하는 `harness-adversarial-review`와 대상이 다르므로
  서로 대체하지 않는다. 따라서 harness-review의 scope 결정(2단계, git diff)은
  재사용하지 않고 활성 task의 spec/plan 경로를 프롬프트에 직접 준다. 마커 scope는
  `scope=task-docs`로 남긴다 (가드 파서는 scope 값을 제한하지 않음 —
  `parseReviewMarkers`는 kind 존재 + 유효 `at`만 요구).
- **대화형 기본값은 그대로.** 페르소나의 존재 이유는 사용자와의 문답이다. external은
  엔진 인수를 준 경우에만 켜지는 옵트인이고, 검증자의 반론·제거안은 주장이다 —
  driver가 사용자와 함께 판별한 뒤 단일 스레드로 반영한다(D4·자동 수정 루프 금지).
- **루브릭은 기존 항목의 승격이다.** contrarian 4각도(반대가 사실이라면·필요 없다면·
  숨은 비용·잘못된 추상화) → A1–A4, simplifier 4체크(YAGNI·단일 사용처 추상화·중복
  단계·죽은 옵션) → R1–R4. 새 기준을 발명하지 않는다. id 접두는 기존 T/C/I/S와
  충돌하지 않게 A(assumption)·R(removal)을 쓴다.
- **interview는 외부 엔진 없이 채점만 선행한다.** 소크라테스식 문답은 사용자의 답을
  끌어내는 것이 목적이라 외부 엔진으로 대체할 수 없다. 바꾸는 것은 판정 근거뿐이다 —
  "질문하고 나서 감으로 체크"를 "증거로 먼저 채점하고, 구멍만 질문하고, 채점표로만
  체크"로 뒤집는다.

## Ontology
*이 task가 다루는 핵심 개념의 정의. "X가 정확히 뭔가?"에 답한다.*

- **페르소나 external 모드**: `/harness-contrarian <engine>`처럼 엔진 인수를 줘서
  페르소나의 비평 프레이밍을 별도 컨텍스트의 read-only 엔진(harness-review 엔진 표의
  한 행)으로 실행하는 것. 산출은 루브릭 finding이고, 반영은 대화형 경로와 동일하게
  driver·사용자가 결정한다.
- **선행 채점 (interview)**: 질문 전에 spec 텍스트 증거만으로 4차원을 pass/fail/na로
  판정한 표. 질문 선별 기준(fail/na만)이자 체크박스 갱신의 유일한 근거.
- **scope=task-docs**: 페르소나 검증의 리뷰 대상이 git diff가 아니라 활성 task의
  spec/plan 문서임을 나타내는 마커 scope 값.
- 게이트 통과 근거: 요구사항 6건이 파일·섹션 단위로 특정되었고, 성공 기준이
  `npm run test:unit`·`npm run docs:check` 통과 + 외부 리뷰 기록이라는 관찰 가능한
  신호로 정의되었으며, 범위 제외(4단계)가 명시됨 (사용자 범위 확인: 3단계 문서만,
  다이어그램 옵트아웃).

## Ambiguity 자가진단
*각 항목이 명확하면 체크. 3개 이상 미체크면 구현 진입 금지 — 인터뷰/브레인스토밍으로 복귀해
모호성을 제거한다. 게이트를 통과하면 그 근거를 위 Ontology 섹션에 한 줄로 남긴다.*

- [x] **Goal 명확도** (40%) — 목표가 한 문장으로 구체화되었는가?
- [x] **Constraint 명확도** (30%) — 기술/시간/범위 제약이 명시되었는가?
- [x] **Success 기준** (30%) — 완료를 어떻게 측정하는가?
- [x] **Context 명확도** (brownfield 한정) — 영향 받는 기존 코드/파일을 식별했는가?
- [x] **Ambiguity ≤ 0.2** — 위 항목 가중합 ≥ 0.8

## Done evidence
```json
{ "version": 1, "review": "required", "tests": "required" }
```

## 참고
- `docs/chad/adversarial-verify-rubric/` — 1–2단계 task (패턴·범위 제외 출처)
- `commands/harness-adversarial-review.md` — "프롬프트 교체 + kind 접미사" 선례
- `docs/decisions.md` D6 — finding 스키마·정직성 규칙·자동 수정 루프 금지
- 사용자 분리 지시 (2026-08-26): 3단계=문서만, 4단계=src+유닛테스트(`review: required`)

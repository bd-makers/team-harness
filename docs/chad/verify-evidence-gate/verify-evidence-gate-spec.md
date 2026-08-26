# verify-evidence-gate — Spec

## 목적 / 요구사항

적대적 검증(D6) 도입 **4단계(최종)**: 1–3단계가 문서 층에 심은 검증 마커 계약을
결정론적 표면(src + 유닛테스트)에 연결한다. `persona-external-verify`(3단계) spec의
"범위 제외" 절에서 이월된 범위이며, 사용자 분리 지시(2026-08-26): 4단계 = src +
유닛테스트(`review: required`).

요구사항:

1. **done 가드 `verify` evidence 키** — `src/commands/task.mjs`의 Done evidence
   선언에 `verify` 키를 추가한다(`required | optional`, 기본 `optional` — review와
   같은 근거: 마커 신뢰 기반 부분 검증이라 전체 강제는 `--force` 훈련이 된다).
   `verify: "required"`이면 판정 창(firstActivatedAt 이후) 안에 **검증 프레이밍
   kind** 마커가 artifact에 있어야 done을 통과한다. (interview 답변)
2. **verify kind allowlist** — 검증 프레이밍 접미사 목록
   (`-adversarial`·`-testcritic`·`-shipcheck`·`-contrarian`·`-simplifier`)을 src
   상수로 두고, verify 판정은 kind가 이 접미사로 끝나는 마커만 센다. 일반
   `review` 증거는 현행대로 kind 비대조(변경 없음 — 어떤 kind든 인정).
   열거의 정본은 `commands/harness-review.md` 5단계이므로 src 상수 ↔ 문서 열거
   동기화를 pin 테스트로 고정하고, 같은 문서의 "가드는 kind 값을 목록 대조하지
   않으므로" 문구를 review/verify 구분에 맞게 갱신한다. spec 템플릿 주석
   (`taskSpecTemplate`)에도 `verify` 키를 문서화한다. (interview 답변)
3. **sim 순수 채점 함수 rule 층 승격** — `tests/sim/rules.mjs`를 신설해
   `agentloop.mjs`의 순수 채점 함수(sig·na·sanitizeNote·sectionBody·
   ambiguityCounts·forceAllChecked·scoreSpecArtifacts·aggregateTrials·
   renderSignals)를 이동하고, `codex-agentloop.mjs`(sanitizeNote·sig·na·
   renderSignals 중복)·`skilltest.mjs`(renderSignals 중복)의 **동일 구현** 중복을
   rule 모듈로 통일한다. 구현이 다른 헬퍼는 통일하지 말고 차이를 artifact에
   기록한다. 동작 불변(순수 리팩토링) — `tests/agentloop-spec-signals.test.mjs`
   import 경로 갱신, 기존 assert 유지. (사용자 확인 2026-08-26: tests/sim 내
   분리, src/ 아님 — sim 채점은 dev 전용이라 배포 코드에 넣지 않는다)
4. **AO 워커 §8 검증 슬롯** — `docs/ao-worker-rules.md` §8 보고 계약 목록에
   외부 검증 항목 1개를 **최소 추가**한다(실행한 검증 kind·요약 또는 미실행
   사유). 파일이 이미 127행으로 자기 제약(≤100행)을 넘긴 상태는 이 task 범위가
   아니다 — 건드리지 않고 초과 사실만 보고한다. (사용자 확인 2026-08-26)
5. **유닛테스트** — `tests/done-guard.test.mjs`에 verify 케이스(required +
   allowlist 마커 → 통과, required + 일반 리뷰 마커만 → 차단, 기본 optional →
   미검사, 창 밖 verify 마커 무효, 잘못된 값 → invalid)와 allowlist ↔ 문서 열거
   동기화 pin을 추가한다. rules.mjs 분리 후 `npm run test:unit` green.
6. **CHANGELOG `[Unreleased]` 갱신.**

범위 제외: `done` 가드가 finding 내용(BLOCKER/severity)을 판정하는 것 — D6
"결정론 게이트에 LLM 판정 금지"에 따라 가드는 마커 존재·kind·시각만 읽는다.
ao-worker-rules.md 100행 압축, 버전 범프·릴리스.

## 설계 / 접근

- **가드는 마커를 읽고, 내용은 판정하지 않는다.** D6 결정: "검증자는 마커를
  남기는 쪽이고, done 가드는 마커를 결정론적으로 읽는 현행 구조를 유지한다."
  verify 키는 review 키와 같은 부류의 망각 방지 장치이고, allowlist는 "일반
  리뷰를 검증으로 오인 기록"하는 것만 걸러낸다.
- **allowlist는 접미사 대조다.** kind = `<engine>-<프레이밍>`에서 엔진 자리는
  custom 엔진 이름이 올 수 있어 열거 불가 — 접미사(`-adversarial` 등)만 대조한다.
  정본은 harness-review.md 5단계 열거이며, src 상수는 pin 테스트로만 묶는다
  (1–2단계에서 kind 계약 모순이 문서·가드 사이에 생겼던 회귀의 재발 방지).
- **verify 마커는 review 증거도 겸한다.** parseReviewMarkers는 모든 마커를
  돌려주므로 `review: required`는 verify 마커로도 만족된다 — 현행 동작 유지,
  역은 성립하지 않는다(일반 리뷰 마커는 verify를 만족하지 못한다).
- **rule 층은 tests/sim 안의 층이다.** 채점 함수는 하네스(I/O·spawn)와 분리된
  순수 함수라는 것이 정체성이고, 소비자는 sim 하네스 3개와 유닛테스트다. 배포
  CLI(src/)와는 공유점이 없으므로 올리지 않는다.
- **자기 dogfooding 함정**: 이 task의 spec에는 `verify` 키를 선언하지 않는다 —
  done 가드는 설치된 플러그인(0.19.0)으로 실행되므로 신 키를 선언하면
  "알 수 없는 키"로 done이 차단된다. verify 키의 실사용은 다음 릴리스 이후다.

## Ontology
*이 task가 다루는 핵심 개념의 정의. "X가 정확히 뭔가?"에 답한다.*

- **verify evidence**: Done evidence의 새 키. 판정 창 안에 검증 프레이밍 kind
  마커가 존재해야 함을 선언한다(`required | optional`, 기본 `optional`).
- **검증 프레이밍 kind allowlist**: verify 증거로 인정되는 kind 접미사 목록
  (`-adversarial`·`-testcritic`·`-shipcheck`·`-contrarian`·`-simplifier`).
  정본은 harness-review.md 5단계 열거, src 상수는 pin 테스트로 동기화.
- **sim rule 층**: `tests/sim/rules.mjs` — I/O 없는 순수 채점 함수(신호 생성·
  집계·렌더)의 전용 모듈. sim 하네스 3개가 import하는 dev 전용 층.
- **AO §8 검증 슬롯**: AO 워커 보고 계약에 추가되는 외부 검증 결과 항목
  (kind·요약 또는 미실행 사유).
- 게이트 통과 근거: 요구사항 6건이 파일·함수 단위로 특정되었고, 성공 기준이
  `npm run test:unit`·`npm run docs:check` 통과 + 외부 리뷰 기록이라는 관찰
  가능한 신호로 정의되었으며, 모호 항목 3건(다이어그램·rule 층 해석·§8 100행)은
  AskUserQuestion으로 해소됨(2026-08-26, 다이어그램 옵트아웃).

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
- `docs/chad/persona-external-verify/` — 3단계 task (범위 제외 출처)
- `docs/chad/adversarial-verify-rubric/` — 1–2단계 task (D6 도입 순서 정본)
- `docs/decisions.md` D6 — 마커 계약·정직성 규칙·"결정론 게이트에 LLM 판정 금지"
- `commands/harness-review.md` 5단계 — kind 접미사 열거(정본)·마커 계약
- 사용자 확인 (2026-08-26, AskUserQuestion): rule 층 = tests/sim 내 분리,
  AO §8 = 슬롯만 최소 추가, 다이어그램 = 옵트아웃

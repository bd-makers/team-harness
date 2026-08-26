# adversarial-verify-rubric — Spec

## 목적 / 요구사항

작업(worker) 에이전트의 산출물을 **별도 컨텍스트의 read-only 검증자**가 루브릭으로
반박·채점하는 "적대적 검증"을 하네스 규범·문서에 도입한다. 0.19.0 조사 결과
(대화 검토 보고, 2026-08-26) 품질 판단이 전부 작업자 자신에게 있는 지점 중
**코드 무변경으로 닫을 수 있는 범위(도입 순서 1–2단계)** 를 이번 task로 처리한다.

요구사항:

1. **D6 결정 추가** — `docs/decisions.md`에 D6(적대적 검증 = D2의 단위 적용) 전문을
   append 하고, `templates/docs/decisions.md`와 byte-identical 유지
   (`tests/agent-files.test.mjs`의 동일성 테스트가 강제).
2. **AGENTS.md 결정 규범 요약에 D6 한 줄 추가** — roles 관리 절이므로
   `templates/AGENTS.md.hbs`와 짝수정 (드리프트 테스트가 강제).
3. **리뷰 마커 kind 접미사 규약 명문화** — `commands/harness-review.md`의 마커 계약에
   `kind=<engine>-<프레이밍>` 접미사 규약(기존 `-adversarial` 일반화)을 기록한다.
4. **테스트 3형제 §6에 검증자 인계(옵트인) + testcritic 루브릭** —
   `harness-unittest.md`·`harness-comptest.md`·`harness-inttest.md`의
   "검증 (완료 선언 전 필수)"에 기존 자가점검 항목을 루브릭 표로 승격하고,
   중요한 변경이면 별도 검증자에게 채점시키는 인계 단락을 추가한다.
5. **harness-ship에 정합 검증 단계 + shipcheck 루브릭** — 준비 완료 보고 직전에
   문서↔diff 정합을 검증자가 반박하는 옵트인 단계를 추가한다.
6. **회귀 고정 테스트** — 위 규범·표면을 `tests/agent-files.test.mjs`에 pin 한다
   (이 저장소의 규범 변경 표준 절차).
7. **CHANGELOG `[Unreleased]` 갱신.**

범위 제외 (후속 task): contrarian/simplifier external 옵션·interview 채점 선행(3단계),
`done` 가드 `verify` evidence 키·kind allowlist 등 src 변경(4단계), AO 워커 규칙
§8 검증 슬롯(별도 저장소 소유 파일).

## 설계 / 접근

- **새 메커니즘을 만들지 않는다.** 실행 경로는 `/harness-review`의 엔진 runner 표
  (codex·gemini·claude·custom, read-only)와 `<!-- harness:review kind=... -->` 마커
  계약을 재사용한다. `kind=<engine>-adversarial`이 이미 보여준 확장점을
  `-testcritic`(테스트 비평)·`-shipcheck`(ship 정합)으로 일반화한다.
- **검증자는 반박만 하고 고치지 않는다.** 발견은 주장이다(harness-review 4단계) —
  driver(작성 세션)가 재현·판별 후 단일 스레드로 반영한다. 검증자→작업자 자동 수정
  루프는 만들지 않는다 (D4·read-only 원칙 동시 보호).
- **루브릭은 기존 자가점검 항목의 승격이다.** 테스트 3형제 §6의 뮤테이션 자가점검·
  mock 반향 금지 등 이미 verbatim으로 있는 기준을 finding 스키마
  (id·항목·심각도 BLOCKER/MAJOR/MINOR)로 표 형식화한다 — 새 기준을 발명하지 않는다.
- **옵트인 강도는 리뷰 프로토콜과 동일** — "중요한 변경(새 기능·아키텍처·복잡한
  리팩토링·보안·스키마/API)" 기준을 상속하고, 사소한 변경에는 강제하지 않는다.
- **결정론 게이트에는 LLM 판정을 넣지 않는다** — 검증자는 마커를 남기는 쪽이고,
  `done` 가드는 마커를 결정론적으로 읽는 현행 구조를 유지한다
  (`th-resident-verify` spec의 "LLM 판정 금지" 제약과 일치).

## Ontology
*이 task가 다루는 핵심 개념의 정의. "X가 정확히 뭔가?"에 답한다.*

- **적대적 검증 (adversarial verification)**: 작업 에이전트의 산출물에 별도 컨텍스트의
  read-only 검증자를 붙여 루브릭에 따라 반박·채점하게 하는 것. 새 병렬 모델이 아니라
  **D2(작성자·리뷰어 분리)의 작업 단위 적용**이다.
- **검증자 (verifier)**: harness-review 엔진 표의 한 행으로 실행되는 read-only
  외부 프로세스/세션. 발견을 보고할 뿐 쓰지 않는다.
- **루브릭 (rubric)**: finding의 목록. 각 finding은 `id · 항목 · 심각도
  (BLOCKER/MAJOR/MINOR) · 판정(pass/fail/na) · 근거`를 갖는다. BLOCKER fail이
  하나라도 있으면 해당 게이트(완료 선언·준비 완료 선언)를 통과하지 못한다.
- **kind 접미사**: 리뷰 마커의 `kind=<engine>-<프레이밍>` 규약. 프레이밍이 없으면
  일반 리뷰(`kind=<engine>`), 있으면 `-adversarial`·`-testcritic`·`-shipcheck`.
- **정직성 규칙** (harness-sim 루브릭 상속): 산문은 신호가 아니다 — PASS는 파일·git·
  실행 출력 증거에만 근거하고, 증거 없는 항목은 pass가 아니라 na다.
- 게이트 통과 근거: 요구사항 7건이 파일·섹션 단위로 특정되었고, 성공 기준이
  `npm run test:unit`·`docs:check` 통과 + 외부 리뷰 기록이라는 관찰 가능한 신호로
  정의되었으며, 범위 제외가 명시됨 (사용자 범위 확인: 1–2단계, 다이어그램 없음).

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
- 대화 검토 보고 (2026-08-26): 적용 후보 5곳 + 도입 순서 4단계
- `commands/harness-review.md` — 엔진 runner 표·마커 계약 (재사용 대상)
- `tests/sim/agentloop.mjs` `scoreSpecArtifacts`·`aggregateTrials` — 증거 기반 루브릭 채점 선례
- `docs/chad/sim-agentloop-redesign/sim-agentloop-redesign-spec.md` — "산문 신뢰 금지" 루브릭 결정
- rubric-evaluator 플러그인 0.1.1 — finding 스키마·심각도→등급 매핑 차용처

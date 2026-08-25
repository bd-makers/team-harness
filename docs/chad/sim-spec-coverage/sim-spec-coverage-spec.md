# sim-spec-coverage — Spec

## 목적 / 요구사항

`/harness-spec`(0.18.0 신설)은 sim 커버리지가 **0건**이다 — `tests/sim/` 전체에 `harness-spec`
문자열이 없다. task `spec-writing-skill`의 plan 마지막 항목("대화형 드라이런")이 그 사유로
열려 있고, artifact의 `### 검증 한계`에 미수행이 기록돼 있다.

이 task는 그 항목을 **sim 시나리오 추가**로 닫는다.

### 검증 대상 (범위 안)
1. 네임스페이스 슬래시 트리거 `/harness-aijient-team:harness-spec`가 해석된다 (pass-rate 방식)
2. spec.md 초안이 생성되고 요구사항 항목에 `(interview)` 출처 태그가 붙는다
3. Ambiguity 자가진단 절이 생성된다
4. **체크 상태와 무관하게** `/harness-interview` 인계 문구가 항상 나온다
   (2차 외부 리뷰 P1 — writer 자기 채점 차단의 회귀 감시)
5. `specSources`가 `.harness/config.json`에 lazy 저장되고 **기존 키(`user`)가 보존**된다
   (read-modify-write — Codex 리뷰 3번 조치분)
6. 기존 spec이 있을 때 merge(기본) 분기가 알 수 없는 절을 보존한다

### 검증하지 않는 것 (명시적 범위 밖)
- Confluence / Figma **MCP fetch 경로** — 실 인증·라이브 MCP 서버 필요. 프롬프트에 본문을
  미리 붙여넣어 "MCP 부재 폴백" 경로만 태운다.
- **실제 멀티턴 인터뷰 UX** — `runHeadless`는 단발 `claude -p`다. 답변을 프롬프트에 미리 심어
  단일 턴으로 접는다. 주고받는 대화 자체는 재현 불가.
- replace / cancel 분기 — merge(기본)만 검증한다. 나머지는 AskUserQuestion 응답이 필요하다.

이 두 목록은 리포트에 **N/A + 사유**로 렌더된다. 조용히 빼지 않는다.

## 설계 / 접근

### SC5 일반화 대신 전용 SC7
SC5(`sc5Triggers`)를 커맨드 목록 기반으로 일반화하는 안은 **기각**한다:
- SC5는 `canon.dir`(SC3·SC4와 공유)에서 돈다. `harness-spec`은 **writer**라 spec.md를 쓴다 —
  공유 샌드박스를 오염시킨다.
- SC4가 끝에서 `active.json`을 null로 만들기 때문에, 그 자리에서 `/harness-spec`을 돌리면
  절차 1단계(활성 task 없음 → 안내 후 종료)로 빠진다. 비파괴적이지만 **아무것도 검증하지 않고**
  신호가 SC4의 실행 순서에 조용히 결합된다.
- 항목 2~6은 애초에 pass-rate 신호가 아니라 결정적 산출물 검사다.

→ **SC7을 전용 샌드박스로 추가**하고, 트리거 신호만 SC5의 `rate()` 관용구를 그대로 쓴다.
SC5·SC6은 건드리지 않는다.

### 샌드박스 준비는 CLI로 (SC6 관례)
`cli(['apply','--yes'])` → `cli(['task', slug])` → 그 다음에야 에이전트 1회. `ensureUsername`이
`--yes`에서 git config를 읽어 `{"user":"simbot"}`를 쓰므로, 항목 5의 "기존 키"는 **인위적 시드 없이**
자연 발생한다.

### 프롬프트 접기
SC1의 비대화 관용구("Run NON-INTERACTIVELY … do NOT ask any questions")를 그대로 쓰고 뒤에
답변을 덧붙인다. `specSources`는 **외부 소스를 골라야만** 수집되므로(절차 4단계) 소스를
`confluence + interview`로 지정하고 `baseUrl`·`spaceKey`와 Confluence 본문을 미리 심는다.

### 순수 채점 함수 분리
`scoreSpecArtifacts({ specBody, configRaw, resultText, transcriptBody })`를 export 하고
`tests/agentloop-spec-signals.test.mjs`로 단위 테스트한다. sim 실행에는 인증 토큰이 필요하지만
**채점 로직 자체는 토큰 없이 CI에서 검증된다**. 선례: `codex-agentloop.mjs`의 `parseCodexJsonl`
+ `tests/codex-agentloop-parser.test.mjs`. import 시 자동 실행을 막기 위해 `codex-agentloop.mjs`와
동일한 엔트리 가드(`import.meta.url === pathToFileURL(process.argv[1]).href`)를 `agentloop.mjs`에도 넣는다.

### 산문 신호 예외 선언
항목 4(인계 문구)는 파일이 아닌 **에이전트 산문**이 유일한 관측면이다. 이 레포는 "산문은 신호가
아니다"를 계약으로 두므로, 이 신호는 라벨에 `(산문 예외)`를 달고 리포트 각주로 사유를 남긴다.
증거는 `result` 블롭이 아니라 **디스크의 transcript**에서 읽는다.

## Ontology
*이 task가 다루는 핵심 개념의 정의. "X가 정확히 뭔가?"에 답한다.*

- **SC7**: `/harness-spec` 커맨드의 결정적 산출물(spec 초안 · 출처 태그 · 자가진단 · 인계 문구 ·
  config read-modify-write · merge 보존)을 전용 샌드박스에서 검증하는 agentloop 시나리오.
  SC5(트리거 신뢰도)·SC6(라이프사이클)과 샌드박스를 공유하지 않는다.
- **프롬프트 접기(prompt folding)**: 멀티턴 대화가 필요한 커맨드를, 사람이 할 답변을 프롬프트에
  미리 심어 단일 턴 `claude -p`로 실행 가능하게 만드는 기법. 대화 UX는 검증하지 못하고
  **결정적 산출물만** 검증한다 — 이 한계는 리포트에 N/A로 명시한다.
- **산문 예외 신호(prose-exception signal)**: 파일·git·transcript 어디에도 구조화된 증거가 없고
  에이전트 산문만이 관측면인 신호. 기본 계약("산문은 신호가 아니다")의 예외로, 라벨과 각주에
  예외임을 선언해야만 PASS/FAIL로 채점한다.

## Ambiguity 자가진단
*각 항목이 명확하면 체크. 3개 이상 미체크면 구현 진입 금지 — 인터뷰/브레인스토밍으로 복귀해
모호성을 제거한다. 게이트를 통과하면 그 근거를 위 Ontology 섹션에 한 줄로 남긴다.*

- [x] **Goal 명확도** (40%) — `/harness-spec`의 결정적 산출물 6가지를 sim SC7로 검증하고
      `spec-writing-skill` plan의 마지막 항목을 닫는다.
- [x] **Constraint 명확도** (30%) — 멀티턴 없음(단발 `claude -p`) · MCP fetch 검증 불가 ·
      SC5/SC6 비침습 · 병렬 워커 `-20`의 `docs/what-changes-*.html` 경로 회피.
- [x] **Success 기준** (30%) — ① SC7 6개 신호 구현 ② 순수 채점 함수 단위 테스트 그린
      ③ `npm run test` 전체 그린 ④ sim SC7 실제 실행 리포트(토큰 있으면) ⑤ plan 항목 닫힘.
- [x] **Context 명확도** (brownfield 한정) — `tests/sim/agentloop.mjs`(SC5:373 · SC6:399 · runFull:530),
      `commands/harness-spec.md`, `src/user-config.mjs`, `docs/chad/spec-writing-skill/{plan,artifact}.md`.
- [x] **Ambiguity ≤ 0.2** — 위 항목 가중합 = 1.0

## Done evidence
<!--
```json
{ "version": 1, "review": "required", "tests": "skip" }
```
-->

## 참고
- 상위 task: `docs/chad/spec-writing-skill/` (PR #37, v0.18.0)
- 커맨드 계약: `commands/harness-spec.md`
- 선례: `tests/sim/codex-agentloop.mjs` `parseCodexJsonl` + `tests/codex-agentloop-parser.test.mjs`

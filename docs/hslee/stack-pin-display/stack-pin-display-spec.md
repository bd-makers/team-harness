# stack-pin-display — Spec

## 목적 / 요구사항
*문제(오늘 무엇이 안 되는가) → 영향받는 사용자·시스템 → 기대 결과 → 제약 순으로 쓴다.
답 없는 질문은 요구가 아니다 — `## 참고` 절에 `- (open) …`으로 남긴다.*

- 문제: #111 이후 `init --stack X`는 `.harness/render-state.json`의 `stack`에 고정되지만, `harness-team stack`(text·`--json`)은
  감지값만 보여 준다. 관리 절은 X로 렌더되는데 stack 출력은 감지 스택을 말해, 고정 사실과 해제 방법을 알 길이 없다.
- 기대: 고정값이 있으면 감지 스택·고정 스택·유효 스택·해제 방법(`init --stack <감지 id>`)이 text와 JSON 양쪽에 드러난다.
- 제약: JSON 계약은 **필드 추가만** — 기존 `stack`·`testing`·`summary`·`status`·`next_actions` 값은 불변. text 요약 5줄 계약 유지.

## 설계 / 접근
- `runStack`이 `loadRenderState(targetDir).stack`을 읽는다(로더가 모르는 id는 이미 버린다).
- JSON: 새 필드 `stackPin` — 고정 없으면 `null`, 있으면 `{ pinned, detected, effective, unpin }`.
  `effective`는 관리 절 렌더에 쓰이는 스택(= pinned). `unpin`은 `harness-team init --stack <detected> --target '<조회 경로>'`(셸 인용) — `stack --target`으로 다른 디렉터리를 본 경우에도 그대로 실행 가능해야 한다.
- text: 5줄 요약 밖에 한 줄 `pin: <pinned> (detected: <detected> → effective: <pinned>) — unpin: <unpin>`.
- 기존 `stack` 필드는 그대로 감지(또는 명령의 `--stack`) 결과 — testing 소비자(unittest·comptest·inttest 0단계)를 흔들지 않는다.

## Ontology
*이 task가 다루는 핵심 개념의 정의. "X가 정확히 뭔가?"에 답한다.*

- **감지 스택(detected)**: `detectStack(dir)`의 id — 매니페스트에서 얻는다.
- **고정 스택(pinned)**: render-state의 `stack` — 감지와 다른 `init --stack X`의 X.
- **유효 스택(effective)**: 관리 절 렌더에 쓰이는 스택 = pinned ?? detected.
- 게이트 근거: 목표·제약·성공 기준·영향 파일(`src/commands/stack.mjs`, `tests/detect-testing.test.mjs`)이 모두 확정.

## Ambiguity 자가진단
*각 항목이 명확하면 체크. 3개 이상 미체크면 구현 진입 금지 — 인터뷰/브레인스토밍으로 복귀해
모호성을 제거한다. 게이트를 통과하면 그 근거를 위 Ontology 섹션에 한 줄로 남긴다.*

- [x] **Goal 명확도** (40%) — 목표가 한 문장으로 구체화되었는가?
- [x] **Constraint 명확도** (30%) — 기술/시간/범위 제약이 명시되었는가?
- [x] **Success 기준** (30%) — 완료를 어떻게 측정하는가?
- [x] **Context 명확도** (brownfield 한정) — 영향 받는 기존 코드/파일을 식별했는가?
- [x] **Ambiguity ≤ 0.2** — 위 항목 가중합 ≥ 0.8

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

- 출처: `docs/hslee/init-stack-stale-false-positive/` artifact 후속 후보.
- 코드: `src/commands/stack.mjs`, `src/render-state.mjs`, `src/commands/init.mjs`(pinNote).

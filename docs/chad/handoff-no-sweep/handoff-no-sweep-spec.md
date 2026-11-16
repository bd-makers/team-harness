# handoff-no-sweep — Spec

## 목적 / 요구사항
*문제(오늘 무엇이 안 되는가) → 영향받는 사용자·시스템 → 기대 결과 → 제약 순으로 쓴다.
답 없는 질문은 요구가 아니다 — `## 참고` 절에 `- (open) …`으로 남긴다.*

post-commit 훅이 추적되는 `<name>-handoff.md`에 `git log -1`과 `--stat` 사본을 쓴다. 그래서 커밋 직후 트리는 항상 dirty이고, `pr-check`가 그 파일의 커밋을 요구해 handoff만 담은 커밋이 생긴다.
규칙 커밋 `685b744` 뒤 병합된 브랜치 70개에 그런 커밋이 78개 있고, 40개는 뒤에 작업이 이어진다. 문서 규칙(`commands/harness-task.md`)만으로는 재발했다.

영향은 에이전트와 소비자 저장소의 이력이다. 기대 결과는 활성 task가 있어도 커밋 직후 `git status`가 비어 있는 것이다. 그러면 sweep을 만들 이유가 없다.

제약: 기존 완료 task의 handoff 마커는 계속 읽는다. 워크트리 로컬 `<user>-handoff.md`는 세션 진입점이라 유지한다. 설치된 훅이 부르는 `harness-team handoff` 이름은 바꾸지 않는다.

## 범위 (In / Out)
*`- **In**: …`에 이번 task가 바꾸는 것(파일·모듈·동작)을, `- **Out**: …`에 하지 않기로 한 것과 그 이유 한 줄을 쓴다 —
요청하지 않은 기능·관련 없는 리팩터링이 섞이지 않게 긋는 경계다.*

- **In**: `runHandoffAuto`가 추적 파일을 쓰지 않는다. `runDone`은 완료 마커를 쓰지 않고 `meta.json`만 쓴다. `pr-check` 필수 문서에서 handoff를 뺀다. `done`·`review` 제외 집합을 user handoff로 줄인다. 진입점 포인터를 plan으로 옮긴다. D11·규칙표·문서·stock `templates/docs/README.md`를 맞춘다.
- **Out**: `<name>-handoff.md` 폐지 — 10/177 task가 직접 메모를 남겼고, 4문서 구조 전체를 바꾸는 별도 결정이다.
- **Out**: `harness-team handoff` 이름 변경 — 소비자에게 설치된 훅이 그 이름을 부른다.
- **Out**: 완료된 task의 기존 handoff 내용 변환 — 읽기 호환만 유지한다.
- **Out**: Codex 리뷰, `--shape`·`--rubric` 가드, 시그널 처리 — 이 task의 범위가 아니다.

## 원천 검토 (R1)
*원천 문서(PRD·Figma·API 문서·기획서·정책서) 사이의 충돌·누락·모순을 Plan 전에 검토한다(`/harness-interview`).
충돌·모순은 `(unresolved)`, 누락은 `(open)`으로 적고, `→ 결정: …`으로 해결한 뒤 재대조해 `- 검토 완료: <날짜>`로 닫는다.
원천이 없으면 `- 없음 — <사유>` 한 줄. 원천 위치는 프로젝트가 정한다.*

### 원천
- 없음 — 외부 기획 문서 없는 저장소 내부 개선. 입력은 `docs/chad/correct-guards/correct-guards-artifact.md`의 "결정 대기: handoff 단독 커밋"과 이력 실측이다.

### 발견
- 검토 완료: 2026-11-06


## 설계 / 접근

데이터 구조는 이미 있다. `meta.json`이 `status`·`closedAt`을 들고 있고 `collectTasks`는 meta를 먼저 읽는다. 마커는 meta가 없을 때만 쓰이는 중복 표지였다. 이 변경은 대부분 삭제다.

- 훅이 쓰는 것은 gitignore된 `<user>-handoff.md` 하나다. 그 파일이 추적 중이거나 무시 줄이 없는 구 저장소에서는 쓰지 않는다. 그래서 "훅은 트리를 더럽히지 않는다"가 모든 설치본에서 성립한다. 활성화와 `done`은 구 저장소에서도 쓴다. `done`까지 막으면 진입점이 종결된 task를 가리킨 채 얼어붙기 때문이다.
- sweep 판정(`commitTouchesOnlyHandoff`)과 amend 교정(`amendCutPoint`)은 append 때문에만 있었으므로 함께 지운다.
- `task`는 `<name>-handoff.md`를 계속 만든다. 의미는 자동 로그에서 선택 메모로 바뀐다.
- D11의 필수 문서는 spec·plan·artifact다. 기각안과 근거는 `docs/decisions.md` D11 정정에 남긴다.

린트 방식은 기각했다. 이미 푸시한 sweep과 위반을 구분하려면 원격 sha가 필요해 CI와 pre-push 판정이 갈린다.

2차 장치 규칙: 새 장치를 더하지 않고 장치를 뺀다.

## Ontology
*이 task가 다루는 핵심 개념의 정의. "X가 정확히 뭔가?"에 답한다.*

- **task handoff**: `<name>-handoff.md`. 사람이나 에이전트가 직접 쓰는 선택 메모다. 훅은 쓰지 않고 `pr-check`도 요구하지 않는다.
- **user handoff**: `<user>-handoff.md`. 훅이 커밋마다 렌더하는 워크트리 로컬 세션 진입점이다.
- **완료 표지**: `meta.json`의 `status`·`closedAt`. handoff 마커는 meta 없는 옛 task에서 읽기만 한다.
- 게이트 근거: 목표는 "커밋 직후 트리가 깨끗하다" 한 문장이고, 제약과 성공 기준은 픽스처와 변이로 측정한다.

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

```json
{ "version": 1, "tests": "required" }
```

## 참고
*코드 기반 참조가 산문 설계보다 정밀하다 — 테스트 스위트·Boundary contract(JSON Schema)·
다이어그램·기존 코드 경로를 우선 링크하고, 산문은 코드로 표현 못 하는 의도만 담는다.*

- `tests/handoff-hook-churn.test.mjs` — 훅 불변식을 실제 커밋으로 고정한다.
- `docs/chad/correct-guards/correct-guards-artifact.md` — 결정 대기 항목과 실측 수치.

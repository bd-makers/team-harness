# correct-guards — Spec

## 목적 / 요구사항
*문제(오늘 무엇이 안 되는가) → 영향받는 사용자·시스템 → 기대 결과 → 제약 순으로 쓴다.
답 없는 질문은 요구가 아니다 — `## 참고` 절에 `- (open) …`으로 남긴다.*

에이전트가 이 저장소에서 같은 실수를 반복한다(`/pstack:correct`, 2026-11-06 전수 조사). 그중 산문 규칙으로 남아 있고
기계로 막을 수 있는 두 부류를 구조로 없앤다.

- 머신 상태 의존 테스트: 실제 `~/.claude`를 읽는 테스트가 로컬에서 통과하고 CI에서만 깨진다.
- 플래그 복제 시 가드 누락: `--stack`·`--scope`를 새 커맨드에 복제하면서 값 검증을 빠뜨렸다.

영향은 메인테이너·이 저장소의 에이전트이고, 소비자에게는 `review --scope <오타>`의 오류 형태만 바뀐다.

## 범위 (In / Out)
*`- **In**: …`에 이번 task가 바꾸는 것(파일·모듈·동작)을, `- **Out**: …`에 하지 않기로 한 것과 그 이유 한 줄을 쓴다 —
요청하지 않은 기능·관련 없는 리팩터링이 섞이지 않게 긋는 경계다.*

- **In**: `scripts/test-isolated.mjs`·`package.json`·`.github/workflows/*`(테스트 진입점), `src/cli-args.mjs`와 인라인 가드 삭제(`init`·`stack`·`scope`·`review`), `MAINTAINING.md` 규칙표.
- **Out**: handoff 단독 커밋 제거 — 5개 파일 이상과 D11 계약을 바꾸므로 메인테이너 결정 대기(artifact 참조).
- **Out**: 위치 인자 개수 검증 — 커맨드별 판단이 필요하고 실제 사례가 `config` 1건이다.
- **Out**: 검증 산문·증명 못 하는 테스트의 게이트화 — 판단 영역이고, `done` 필수화는 D-기록(`docs/decisions.md:205`)이 되돌린 방향이다.

## 원천 검토 (R1)
*원천 문서(PRD·Figma·API 문서·기획서·정책서) 사이의 충돌·누락·모순을 Plan 전에 검토한다(`/harness-interview`).
충돌·모순은 `(unresolved)`, 누락은 `(open)`으로 적고, `→ 결정: …`으로 해결한 뒤 재대조해 `- 검토 완료: <날짜>`로 닫는다.
원천이 없으면 `- 없음 — <사유>` 한 줄. 원천 위치는 프로젝트가 정한다.*

### 원천
- 없음 — 외부 기획 문서 없는 저장소 내부 개선. 입력은 커밋 이력과 task artifact다.

### 발견
- 검토 완료: 2026-11-06


## 설계 / 접근

- 테스트 진입점을 `scripts/test-isolated.mjs` 하나로 모은다. 임시 HOME과 git identity를 만들고 전역 설치 환경변수를 지운다. CI의 git 설정 단계는 삭제해 로컬과 같은 명령을 돌린다.
- 값 검증을 플래그 **이름**에 묶는다. `FLAG_CHOICES`(`src/cli-args.mjs`)에 등록된 플래그는 어느 커맨드에 선언해도 파서가 검사하므로 복제해도 가드가 따라간다. 커맨드의 인라인 가드는 삭제한다.


## Ontology
*이 task가 다루는 핵심 개념의 정의. "X가 정확히 뭔가?"에 답한다.*

- **격리 러너**: `npm test` 계열의 유일한 진입점. 머신 전역 상태를 테스트에서 가린다.
- **FLAG_CHOICES**: 플래그 이름 → 허용 값 목록. 플래그의 값 계약의 단일 정본이다.
- 게이트 근거: 목표·제약·성공 기준 모두 과거 실패 재현으로 측정 가능하다.

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
*코드 기반 참조가 산문 설계보다 정밀하다 — 테스트 스위트·Boundary contract(JSON Schema)·
다이어그램·기존 코드 경로를 우선 링크하고, 산문은 코드로 표현 못 하는 의도만 담는다.*

- `tests/test-isolation.test.mjs`, `tests/cli-args.test.mjs`
- 과거 실패: `1eb9aef^`(실제 `~/.claude` 읽기), `docs/hslee/scope-resolve-cli/scope-resolve-cli-artifact.md:194`, `docs/hslee/stack-detection-cli/stack-detection-cli-artifact.md:156`

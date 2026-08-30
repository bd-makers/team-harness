# claude5-context-followups — Spec

## 목적 / 요구사항

Claude 5 컨텍스트 엔지니어링 검토(PR #64)의 후속 후보 2건을 구현한다.

- **요구사항 A — spec 템플릿 rich-references 유도**: `src/commands/task.mjs`의
  `taskSpecTemplate`이 생성하는 spec의 `## 참고` 섹션에, 산문 설계보다 코드 기반 참조
  (테스트 스위트·Boundary contract JSON Schema·다이어그램·기존 코드 경로)를 우선하라는
  안내 문구를 내장한다. 기존 pin/snapshot 테스트가 옛 템플릿 내용을 단언하면 새 내용에
  맞게 갱신한다(의도된 동작 변경).
- **요구사항 B — stack 조건부 rules 복사**: `src/harness.mjs`의 `copyStaticAssets`가
  React Native 전용 rules 4종(`navigation.md`·`state-management.md`·`styling.md`·
  `testing.md`)을 `--stack python|node|generic` 등 비-RN 프로젝트에도 무조건 복사하는
  결함을 고친다. 명시적 비-RN stack은 제외하고, RN 계열 stack과 `--stack` 미지정(자동감지
  경로)은 기존 동작(무조건 복사)을 유지한다 — 하위 호환.

## 설계 / 접근

- A: `taskSpecTemplate`의 `## 참고` 섹션 본문을 지시된 안내 문구로 교체.
- B: `copyStaticAssets`가 `.claude/rules`를 복사할 때 `ctx.flags.stack`(명시적 플래그
  값)을 확인해, 값이 있고 RN 계열(`react-native`)이 아니면 RN 전용 4개 파일명을
  `copyTree`의 새 `exclude` 옵션으로 걸러낸다. `--stack` 자체가 없으면(자동감지 경로)
  기존처럼 게이트 없이 전부 복사한다 — auto-detect 결과로는 게이트하지 않는 것이 핵심
  설계 결정(하위 호환 우선, 최소 영향).
  `.cursor/rules` 미러(`mirrorCursorRules`)는 이미 `.claude/rules`의 실제 내용을 읽어
  미러링하므로, 원본에서 빠지면 미러도 자연히 빠진다 — 별도 게이트 불필요.

## Ontology
*이 task가 다루는 핵심 개념의 정의. "X가 정확히 뭔가?"에 답한다.*

- **명시적 stack**: CLI `--stack <id>` 플래그로 사용자가 직접 지정한 값(`ctx.flags.stack`).
  값이 없으면(플래그 미지정) `detectStack()`이 프로젝트를 스캔해 추정하지만, 그 추정 결과는
  이 task의 게이트 대상이 아니다.
- **RN 계열 stack**: `detectStack()`이 실제로 정의하는 유일한 식별자는 `'react-native'`
  (Expo·순정 RN 의존성 둘 다 이 하나로 수렴). CLI가 이 값을 검증하지 않는 자유 문자열이라
  사용자가 `--stack expo`를 타이핑할 가능성을 방어적으로 함께 인정했다.

## Ambiguity 자가진단
*각 항목이 명확하면 체크. 3개 이상 미체크면 구현 진입 금지 — 인터뷰/브레인스토밍으로 복귀해
모호성을 제거한다. 게이트를 통과하면 그 근거를 위 Ontology 섹션에 한 줄로 남긴다.*

- [x] **Goal 명확도** (40%) — 근거: 작은 변경 2건(A: 템플릿 문구 교체, B: 조건부 복사)으로
  범위가 브리프에 사전 확정됨.
- [x] **Constraint 명확도** (30%) — 근거: 대상 파일(`src/commands/task.mjs`,
  `src/harness.mjs`, `src/fsx.mjs`)과 정확한 교체 문구·게이트 규칙이 브리프에 명시됨.
- [x] **Success 기준** (30%) — 근거: `npm test` 전체 통과 + 외부 리뷰 기록이 완료 기준으로
  사전 정의됨.
- [x] **Context 명확도** (brownfield 한정) — 근거: 영향 파일과 기존 호출 경로(`init.mjs` →
  `copyStaticAssets` → `copyTree`, `mirrorCursorRules`)를 사전 조사로 확인함.
- [x] **Ambiguity ≤ 0.2** — 위 항목 가중합 1.0 ≥ 0.8

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
-

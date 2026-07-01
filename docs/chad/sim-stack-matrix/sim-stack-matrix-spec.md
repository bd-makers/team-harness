# sim-stack-matrix — Spec

## 목적 / 요구사항

선행 task `sim-agentloop-redesign`(done)에서 만든 L5 agent-in-the-loop sim
(`tests/sim/agentloop.mjs`)은 throwaway 샌드박스의 `package.json`이 `{name, version}`뿐이라
(agentloop.mjs:160) 하네스가 **항상 generic/node 스택으로만** 감지된다. 결과적으로 init/apply를
**단일 스택**에서만 검증했다.

**요구사항:** stack-민감 시나리오(SC1 init, SC2 apply)를 `node`/`next`/`react-native` 3 stack
전부에서 굴리고 리포트를 **stack별 매트릭스**로 렌더한다. stack-무관 시나리오
(SC3 task, SC4 hook, SC5 trigger)는 1회(canonical=node) 유지한다. 스냅샷은
`sim-snapshots/<version>/<stack>-{init,apply}/`로 분리해 stack delta를 골든 diff로 보존한다.

## 설계 / 접근

### 핵심 결정 1 — STACKS 재사용 (SSOT)
`tests/e2e/sandbox.mjs`가 export하는 `STACKS`(node/next/react-native 시그니처)를 그대로 import.
매트릭스의 stack 정의를 sim에서 재선언하지 않는다.

### 핵심 결정 2 — makeSandbox가 stack pkg를 받도록 확장
현재 하드코딩된 `agentloop.mjs:160` (`{ name, version:'0.0.0' }`)을 옵션 `pkg`로 대체.
미지정 시 기존 기본값 유지(하위호환). 루프에서 dir 이름 충돌을 피하려 name을
`init-<stack.id>` / `apply-<stack.id>`로 구분한다.

### 핵심 결정 3 — runFull에서 SC1/SC2를 STACKS 루프로
SC1/SC2를 stack별로 실행. SC3/SC4/SC5는 canonical stack(`node`)의 apply dir 위에서 1회.
→ claude 호출 ~13회(authCheck 1 + SC1×3 + SC2×3 + SC3 1 + SC4 1[SessionStart] + SC5 4).

### 핵심 결정 4 — stack-discriminating signal 추가 (⚠️ 필수)
**중요:** 현재 코드에서 stack별로 실제 갈리는 산출물은 **AGENTS.md `## 기술 스택` 섹션의
`{{stackLabel}}` 한 줄뿐**이다. rules(`copyTree` 무조건), settings/permissions(정적 템플릿
deep-merge), 그리고 packageManager·language·cmd*(STACKS pkg에 `scripts` 없음 → 전부
`(configure)`/`npm`)는 **stack 무관**이다.

따라서 SC1/SC2의 기존 구조-존재 신호(marker·import·hooks·rules·doctor)만으로는 매트릭스가
**3열 동일 PASS**가 되어 아무것도 측정하지 못한다. **독립 오라클**(literal 기대 라벨,
`detectStack()` 재호출 금지)로 렌더된 AGENTS.md에 stack별 기대 라벨이 실렸는지 이진 판정하는
신호를 SC1에 추가한다:
- node → `Node.js`
- next → `Next.js`
- react-native → `React Native (Expo)`

### 핵심 결정 5 — 매트릭스 리포트 렌더
SC1/SC2는 신호 라벨을 행, stack을 열로 하는 매트릭스 테이블로 렌더(셀=✅/❌/⚠️).
같은 함수(sc1Init/sc2Apply)가 stack 전반에서 동일 라벨·순서 신호를 내므로 행 정렬 보장.
SC3/SC4/SC5는 기존 리스트 포맷 유지(stack 무관).

### 핵심 결정 6 — 스냅샷 분리
`snapshot(version, "<stack.id>-init", dir)` / `"<stack.id>-apply"`. stack 간·버전 간
`git diff`로 stack-section delta 회귀 탐지.

### 정직성 규칙 계승 (선행 task 계승)
- 산문 응답은 신호가 아니다 — 파일/git/transcript 이진 판정.
- PreToolUse protect-files는 계속 `⚠️manual`.
- 의심 FAIL은 CLI 레벨로 격리 검증.
- **전제 정정 명시:** 이 매트릭스는 "stack별 rules·permissions"를 검증하지 **않는다**.
  검증 대상은 ① init/apply 전 과정의 stack별 완주 ② AGENTS.md stack 섹션 라벨 렌더
  ③ 스냅샷의 stack delta 포착. 리포트 헤더에 이 범위를 명시해 false 신호 방지.

## Ontology
- **stack matrix**: SC1/SC2를 N개 stack 시그니처에서 굴려 신호를 stack×signal 격자로 배치한 리포트.
- **stack-discriminating signal**: stack별로 값이 갈리는 산출물(현재는 AGENTS.md stackLabel)을
  독립 literal 오라클로 판정하는 신호. 구조-존재 신호(stack 무관)와 구분.
- **canonical stack**: stack-무관 시나리오(SC3/4/5)를 1회만 돌리기 위해 고정한 대표 stack(=node).

## Ambiguity 자가진단
- [x] **Goal 명확도** (40%) — "SC1/SC2를 3 stack 매트릭스로, SC3/4/5는 canonical 1회, 스냅샷 stack별 분리."
- [x] **Constraint 명확도** (30%) — STACKS 재사용·무오염·정직성 계승·stack-discriminating signal 필수·auth 허가 게이트.
- [x] **Success 기준** (30%) — stack×signal 매트릭스 리포트 + stack별 골든 스냅샷 + 무오염 사후검증.
- [x] **Context 명확도** (brownfield) — 선행 sim 전체, STACKS export, detect-stack/템플릿 확인 완료.
- [x] **Ambiguity ≤ 0.2** — 가중합 ≥ 0.8 (게이트 통과).

> **게이트 통과 근거:** 목표·제약·성공기준 명확, brownfield 컨텍스트 코드로 확인 완료.
> 전제 모호성(rules/permissions stack별 차이)은 코드 검증으로 해소 — 실제 차이는 stackLabel뿐임을
> 확정하고 stack-discriminating signal로 대응.

## 참고
- 선행 task: `docs/chad/sim-agentloop-redesign/` (spec·artifact)
- STACKS 정의: `tests/e2e/sandbox.mjs:19`
- stack 감지: `src/detect-stack.mjs` (id→stackLabel 매핑)
- 템플릿: `templates/AGENTS.md.hbs:15-27` (stack 섹션 = 유일 stack-varying 출력)
- 실행: auth = `~/.claude-sim-oauth-token`, 헤드리스 스코프 allowlist. 백그라운드 ~50-80분, ~13콜.

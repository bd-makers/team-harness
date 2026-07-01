# sim-stack-matrix — Artifact

*최종 결과물과 학습 내용을 기록한다.*

## 결과

`tests/sim/agentloop.mjs`의 stack-민감 시나리오(SC1 init·SC2 apply)를 node/next/react-native
3 stack 매트릭스로 확장. stack-무관(SC3 task·SC4 hook·SC5 trigger)은 canonical=node 1회 유지.

### 변경 (agentloop.mjs)
- `STACKS` import(`tests/e2e/sandbox.mjs` SSOT 재사용) + `EXPECTED_LABEL` 독립 오라클 + `CANONICAL_STACK`.
- `makeSandbox(name, {seed, pkg})` — 하드코딩 pkg(구 line 160)를 옵션화, 미지정 시 기존 기본값 하위호환.
- `sc1Init(token, stack)`/`sc2Apply(token, stack)` — stack pkg 주입 + **stack-discriminating 신호**
  (렌더된 AGENTS.md에 stack별 기대 stackLabel이 실렸는지 literal 오라클로 이진 판정).
- `runFull` — SC1/SC2를 STACKS 루프, SC3/4/5는 canonical apply dir 위 1회. 스냅샷을
  `sim-snapshots/<version>/<stack>-{init,apply}`로 분리.
- `renderMatrix(title, perStack)` — signal×stack 격자 테이블. 셀은 아이콘 전용이므로 note(AUTH
  FAILED·FLAKY 등)는 각주로 노출해 선행 포맷의 정직성 유지(❌가 이유를 숨기지 않음). 리포트 헤더에
  검증 범위(전제 정정) 명시.

### 1차 풀런 (2026-07-01T1301, v0.9.5 @ 80b9ad6) — PASS 51 · FAIL 0 · MANUAL 1
- **SC1 init 매트릭스**: node/next/react-native 8신호 전부 ✅ (라벨 신호 포함).
- **SC2 apply 매트릭스**: 3 stack 6신호 전부 ✅ (비파괴 보존·라벨 렌더).
- **SC3/4/5 (canonical=node)**: task 5/5, hook 2/3(PreToolUse는 계승대로 ⚠️manual), trigger 2/2·2/2.
- **스냅샷 stack delta 실증**: `sim-snapshots/0.9.5/{node,next,react-native}-init/AGENTS.md`의
  `## 기술 스택` Runtime이 각각 `Node.js`/`Next.js`/`React Native (Expo)` — 매트릭스가 장식이
  아니라 실제로 다른 렌더 출력을 검증했음을 증명.
- **무오염**: throwaway `.sim-tmp/<TS>` 제거 + 빈 부모 dir까지 정리, playground 3프로젝트 clean.

### 검증된/정정된 전제
- **전제 정정 (advisor 발견):** 배경설명의 "init/apply는 stack별로 rules·permissions·scaffold가
  달라진다"는 **현재 코드 기준 거짓**. rules(`copyTree` 무조건)·settings/permissions(정적 템플릿
  deep-merge)는 stack 무관. STACKS pkg에 `scripts`가 없어 packageManager(`npm`)·language·
  cmd*(`(configure)`)도 3 stack 동일. **실제 stack-varying 산출물은 AGENTS.md `## 기술 스택`
  섹션의 `{{stackLabel}}` 한 줄뿐** (`templates/AGENTS.md.hbs:15-27` 확인).
- 이 정정이 없었으면 매트릭스는 구조-존재 신호만 담아 **3열 동일 PASS(장식)**가 될 뻔했다.
  → stack-discriminating 라벨 신호를 추가해 매 열이 실제로 다른 것을 측정하도록 했고, 리포트
  헤더·spec·artifact에 검증 범위를 못박아 false 신호를 차단.

## Reviews
*Codex/Gemini 등 리뷰 실행 시 결과(요약·발견·조치)를 날짜와 함께 남긴다. 남기지 않은 리뷰는 "안 한 것"으로 간주.*


## Learnings
- **매트릭스 확장 전에 "무엇이 실제로 갈리는지"를 코드로 확인하라.** 배경설명이 "stack별로 다르다"고
  해도 렌더러/템플릿을 읽어 실제 varying 축을 특정하지 않으면, N열 매트릭스가 전부 동일 PASS인
  장식이 되어 비싼 실행(~13콜)을 태우고도 아무것도 측정 못 한다.
- **독립 오라클 원칙:** stack-discriminating 신호는 `detectStack()` 재호출이 아니라 literal 기대값
  (`Node.js` 등)으로 판정해야 진짜 검증이다. 측정 대상 함수로 기대값을 만들면 tautology.
- **선행 sim의 계약은 재사용 안전:** makeSandbox에 `pkg` 옵션을 하위호환으로 추가해 probe/기존
  경로 무회귀. STACKS를 e2e에서 import해 stack 정의 SSOT 유지(sim에서 재선언 안 함).
- 스냅샷을 stack별로 분리(`<stack>-{init,apply}`)하면 매트릭스 PASS의 근거를 diff로 사후 실증 가능 —
  "신호 ✅"와 "실제 delta 존재"를 이중으로 확인.


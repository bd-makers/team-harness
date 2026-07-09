# codex-plugin-sim-check — Spec

## 목적 / 요구사항
- Codex plugin support 이후 설치된 harness가 소비자 프로젝트에서 실제 agent-in-the-loop(L5)로 동작하는지 검증한다.
- `skills/harness-sim/SKILL.md` 절차에 따라 `node tests/sim/agentloop.mjs probe`를 먼저 실행하고, 통과 시 full run 가능 여부를 판단한다.
- full run 가능 시 `node tests/sim/agentloop.mjs run`을 실행해 파일/git/transcript/hook-stderr 증거 기반 PASS/FAIL/MANUAL 결과를 수집한다.
- 실패가 있으면 CLI 레벨 격리 검증으로 sim artifact인지 실제 결함인지 구분한다.
- 소스 변경은 필요한 경우에만 최소로 수행하고, unrelated dirty 파일은 건드리지 않는다.
- 커밋은 사용자가 명시적으로 요청하기 전까지 만들지 않는다.

## 설계 / 접근
- Phase 0: AGENTS.md, 활성 task 상태, playground, `harness-team` PATH, OAuth token 파일을 확인한다.
- Phase 1: `agentloop.mjs probe`로 auth/slash/transcript 계약을 검증한다.
- Phase 2: probe가 신뢰 가능한 경우 full run을 백그라운드로 실행하고 report/snapshot 산출물을 확인한다.
- Phase 3: report의 PASS/FAIL/MANUAL 집계를 artifact에 기록하고, 필요 시 CLI 격리 검증을 수행한다.
- Phase 4: task plan/artifact/handoff를 최신 상태로 갱신한다.

## Ontology
*이 task가 다루는 핵심 개념의 정의. "X가 정확히 뭔가?"에 답한다.*

- **L5 시뮬레이션**: 실제 `claude -p` agent 세션을 소비자 프로젝트 cwd에서 실행해 설치된 harness의 slash/CLI/hook 동작을 관찰하는 검증 레이어.
- **probe**: full run 전에 auth, JSON envelope, transcript lookup, namespaced slash 해석 계약을 빠르게 확인하는 사전 검증.
- **PASS 증거**: 산문이 아니라 파일, git 상태, transcript, hook stderr 등 관찰 가능한 증거.
- **MANUAL**: headless 환경에서 안정적으로 관찰할 수 없어 수동 확인으로 남기는 항목. PreToolUse protect-files가 대표적이다.

## Ambiguity 자가진단
*각 항목이 명확하면 체크. 3개 이상 미체크면 진입 금지(브레인스토밍으로 복귀).*

- [x] **Goal 명확도** (40%) — 목표가 한 문장으로 구체화되었는가?
- [x] **Constraint 명확도** (30%) — 기술/시간/범위 제약이 명시되었는가?
- [x] **Success 기준** (30%) — 완료를 어떻게 측정하는가?
- [x] **Context 명확도** (brownfield 한정) — 영향 받는 기존 코드/파일을 식별했는가?
- [x] **Ambiguity ≤ 0.2** — 위 항목 가중합 ≥ 0.8

## 참고
- `skills/harness-sim/SKILL.md`
- `tests/sim/agentloop.mjs`

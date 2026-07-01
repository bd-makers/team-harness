# sim-lifecycle-sc6 — Spec

## 목적 / 요구사항

L5 agent-in-the-loop sim(`tests/sim/agentloop.mjs`)의 task-워크플로우 검증을
현재 SC3(생성+4 SSOT+active 포인터+spec 게이트)까지에서 **풀 라이프사이클**까지 확장한다.
새 시나리오 `sc6Lifecycle`로 추가:

1. plan 체크박스 진행 (`- [ ]` → `- [x]`, `planHasOpenBoxes` open→closed)
2. done-guard 차단 — 미완 조건에서 `done`이 차단(exit 1, "종결 가드에 걸림")되고 active 유지
3. done 완료 — 모든 조건 충족 시 `done`이 완료되고 active.json 해제(null)
4. handoff done 마커 — `<name>-handoff.md`에 `## <ts> — 완료` 갱신

## 설계 / 접근

- **전용 applied 샌드박스**(격리): 라이프사이클 끝에서 active.json을 null로 만들므로
  canon.dir(SC3/4/5 공유)를 오염시키지 않도록 자체 샌드박스에서 CLI 구동.
- **CLI 결정적 구동**: done-guard/done/plan은 CLI 머신러리 → `node BIN` 직접 호출 +
  파일 편집. 에이전트 헤드리스 불필요 → auth 독립·결정적.
- **순서(advisor 교정)**: task 생성 → **done-guard 블록**(4조건 전부 발동: 미완 박스 +
  artifact 템플릿 + 커밋0 + 미커밋) → 박스 flip(plan 진행 신호) → artifact 실내용 + commit →
  **done 완료**(정상 경로) → handoff 마커.
- **cause 문자열 assert**: "걸림 떴다"를 "올바른 조건 감지"로 승격 — 4개 cause 문자열 각각 확인.
- **--force는 finding**: `collectDoneIssues`가 handoff 2파일을 realDirty에서 제외하고
  `runHandoffAuto`는 그 2파일만 건드리므로 정상 done은 --force 없이 통과. 억지 force 금지.

## Ontology
*이 task가 다루는 핵심 개념의 정의.*

- **done-guard**: `collectDoneIssues()` — plan 미완박스/artifact 템플릿/커밋0/미커밋 4조건
  검사. 하나라도 걸리면 `done`이 exit 1 + "종결 가드에 걸림" + active 유지.
- **라이프사이클 신호**: 파일/git 이진 증거만. 산문 응답은 신호 아님.
- **휴먼 게이트**: AskUserQuestion "done 처리할까요?" — 헤드리스 재현 불가 → ⚠️manual.

## Ambiguity 자가진단

- [x] **Goal 명확도** (40%) — SC3를 풀 라이프사이클 4단계까지 확장(sc6Lifecycle).
- [x] **Constraint 명확도** (30%) — 전용 샌드박스·CLI 구동·정직성 규칙·무오염.
- [x] **Success 기준** (30%) — 스크래치 손검증 + auth'd full run + 리포트 SC6 섹션.
- [x] **Context 명확도** (brownfield) — agentloop.mjs sc3Task/sc4Hooks/runFull, task.mjs
  collectDoneIssues/runDone/runHandoffAuto 식별 완료.
- [x] **Ambiguity ≤ 0.2** — 가중합 ≥ 0.8

> **게이트 통과 근거**: 4개 조건 명확, done-guard/done/handoff 로직 원본 확인 완료.

## 참고
- 선행 task: docs/chad/sim-agentloop-redesign/ (done) — SC4 순서·헤드리스 인증 학습.
- skills/harness-sim/SKILL.md — 정직성 규칙.

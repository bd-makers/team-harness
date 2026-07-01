# sim-lifecycle-sc6 — Artifact

*최종 결과물과 학습 내용을 기록한다.*

## 결과

`tests/sim/agentloop.mjs`에 **`sc6Lifecycle`** 추가 — SC3(생성+4 SSOT+active+spec 게이트)를
task **풀 라이프사이클**까지 확장. 검증 항목(파일/git 이진 증거):
1. plan 체크박스 진행 (`- [ ]`→`- [x]`, `planHasOpenBoxes` open→closed)
2. done-guard 차단 — 4조건 전부 발동(미완 박스+artifact 템플릿+커밋0+미커밋) → exit 1 +
   "종결 가드에 걸림" + active 유지 + **cause 4문자열 각각 assert**
3. done 완료 — 조건 충족 시 exit 0 + active.json→null
4. handoff done 마커 — `## <ts> — 완료` 기록

부가: `sc6` standalone 서브커맨드 추가(`node tests/sim/agentloop.mjs sc6`) — auth·에이전트
없이 task 머신러리를 결정적으로 회귀 검증. runFull에는 **마지막 배치 + 전용 applied 샌드박스**로
wire-in(끝에서 active를 null로 만들어 canon.dir 오염 방지).

### 검증 (2026-07-01T1525, v0.9.5 @ 878d586)
- 스크래치 손검증(auth 독립) + 통합 standalone 둘 다 **PASS 8 · FAIL 0 · MANUAL 1**.
- 무오염: `.sim-tmp` 자체 정리, playground 3개 git clean(0).
- auth'd 풀런(SC1–5)은 **사용자 선택으로 생략**(토큰 미소모) — SC6는 CLI 결정적이라 독립 검증됨.
- 리포트: `../harness-playground/sim-reports/agentloop-2026-07-01T1525.md`.

## Reviews
*Codex/Gemini 등 리뷰 실행 시 결과(요약·발견·조치)를 날짜와 함께 남긴다. 남기지 않은 리뷰는 "안 한 것"으로 간주.*

### 2026-07-01 — advisor 리뷰 (반영 완료)
- **순서 교정**: done-guard 블록을 체크박스 flip 이전(task 생성 직후)에 쳐 4조건 전부 발동 →
  반영. cause 4문자열 각각 assert 추가.
- **--force finding**: 억지 force 시나리오 금지, empirical 분기 유지 → 반영(usedForce=false 실측).
- **범위 정직성**: `run` 통합 경로 미실행을 리포트에 직접 명시 → 반영.

### 2026-07-01 — 외부 리뷰(Codex/Gemini) 의도적 생략
- 이번 변경은 **test-harness 확장**(sc6Lifecycle + sc6 서브커맨드)으로, 스크래치 손검증 +
  통합 standalone 2회(8 PASS·1 MANUAL) **이진 증거**로 동작이 결정적으로 입증됨.
- 사용자가 최소 범위(SC6 standalone)로 마무리를 선택 → `/review`(Codex+Gemini) 외부 리뷰는
  **의도적 생략**. (누락 아님. 필요 시 `/review`로 추후 실행 가능.)


## Learnings

- **done-guard 마찰은 handoff 제외 로직으로 이미 해소됨 (finding)**: 선행 task 아티팩트의
  "재커밋 후 --force" 지침은 옛 코드 기준. 현재 `collectDoneIssues`가 handoff 2파일을 realDirty
  에서 제외 + `runHandoffAuto`는 그 2파일만 건드림 → post-commit 후에도 클린 `done` 통과.
  실측으로 `usedForce=false` 확인. **지침을 그대로 따르지 말고 코드로 재확인**해서 억지 --force
  시나리오를 피함.
- **advisor 교정 (순서)**: done-guard 블록을 체크박스 flip **이전**(task 생성 직후)에 쳐야
  4조건이 모두 present. flip 후엔 "미완 박스" 조건이 빠져 3개만 검증됨 → 커버리지 구멍.
  "걸림 떴다"를 "올바른 조건 감지"로 승격하려면 cause 문자열 각각 assert.
- **CLI 머신러리는 에이전트 없이 검증**: done/done-guard/handoff는 결정적 → `node BIN` 직접
  호출이 헤드리스 스폰보다 빠르고 auth 독립하며 flaky하지 않음. 통합 전 스크래치 손검증으로
  로직 확정 후 wire-in.


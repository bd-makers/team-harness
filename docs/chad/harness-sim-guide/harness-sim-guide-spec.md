# harness-sim-guide — Spec

## 목적 / 요구사항
harness-sim(L5 agent-in-the-loop 시뮬레이션)에 대한 **독립 실행형 단일 HTML 가이드**.
오프라인 열람(외부 의존 0, 인라인 CSS), 한국어, 기존 `docs/harness-*.html` 다크 테마와 일관.
출력: `docs/chad/harness-sim-guide.html`

### 섹션 (7)
1. 개념 — L4(CLI 배관) vs L5(agent-in-the-loop), 왜 L5만 설치된 하네스(2번) 측정 가능
2. 아키텍처 — throwaway 샌드박스 → 실 `claude -p` spawn → 사이드이펙트 신호 채점 + 흐름 다이어그램(inline SVG)
3. 시나리오 — SC1~SC5 각각 측정 대상 + stack 매트릭스(node/next/react-native, SC1/SC2)
4. 실행법 — auth(토큰/ambient), 권한 allowlist, probe→run, 백그라운드/소요시간, 무오염
5. 리포트 해석 — PASS/FAIL/MANUAL, pass-rate(N=2), 정직성 규칙, 의심 FAIL 격리 검증
6. 버전 간 비교 — 하이브리드 상태관리(baseline clean · 골든 스냅샷 · 누적 리포트)
7. 트러블슈팅 — 401/토큰, setup-token 타임아웃, 헤드리스 권한, init 대화형 멈춤

## 설계 / 접근
참조 파일에 실재하는 사실만 사용. 지어낸 플래그·경로·명령 금지. 관찰 불가 항목(PreToolUse)은 "수동확인" 표기.
스타일은 harness-overview.html의 CSS var/nav/hero/section/card/table을 재사용해 인라인화.

## Ontology
- **L5 agent-in-the-loop**: 실 `claude -p` 세션을 부수 프로세스로 spawn해 사이드이펙트를 채점하는 검증 레이어.
- **2번(설치된 하네스)**: 소비자 프로젝트에 설치돼 cwd=프로젝트 세션에서만 발화하는 hook/SessionStart/slash 체인.
- **신호(signal)**: 파일/git/transcript/hook-stderr로 이진 판정하는 관찰 단위. 산문은 신호 아님.

## Ambiguity 자가진단
- [x] **Goal 명확도** (40%) — 7섹션 구조·출력경로·스타일 매칭까지 사용자가 명시.
- [x] **Constraint 명확도** (30%) — 단일 HTML·인라인 CSS·정확성 계약·정직 표기 명시.
- [x] **Success 기준** (30%) — 렌더 확인 + 앵커 동작 + agentloop.mjs 사실 대조.
- [x] **Context 명확도** (brownfield) — 참조 파일·기존 HTML 스타일 모두 존재, 읽어서 검증.
- [x] **Ambiguity ≤ 0.2** — 가중합 ≥ 0.8 (게이트 통과).

> 게이트 통과 근거: 입력이 상세 스펙 수준. 유일한 판단은 다이어그램 SVG 세부이며 자명.

## 참고
- `tests/sim/agentloop.mjs`, `skills/harness-sim/SKILL.md`, `tests/e2e/sandbox.mjs`
- `docs/chad/sim-agentloop-redesign/*`, `../harness-playground/sim-reports/agentloop-*.md`

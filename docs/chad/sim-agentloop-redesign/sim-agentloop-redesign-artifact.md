# sim-agentloop-redesign — Artifact

*최종 결과물과 학습 내용을 기록한다.*

## 결과

`tests/sim/agentloop.mjs` — L5 agent-in-the-loop 하네스. 실제 `claude -p` 세션을
throwaway 샌드박스에서 띄워 설치된 하네스(2번)를 사이드이펙트 신호로 측정.

### 1차 풀런 (2026-06-30T1819, v0.9.5 @ 4280f1c) — PASS 13 · FAIL 8 · MANUAL 1
- **진짜 발견 (CLI sim이 못 잡는 것):** `harness-init`은 **대화형**("백업 스크립트 저장 위치"
  등 질문) → 헤드리스/비대화형 컨텍스트에서 **멈춤**, scaffold 미생성. `harness-apply`는
  헤드리스에서 **완주**(풀 scaffold). → init은 자동화-적대적.
- SC2 apply 5/5, SC3 task 5/5, SC5 트리거 2/2·2/2 정상.
- SC4(설치-hook) 실패는 **init 멈춤의 결과**(hook 미설치)였지 hook 결함 아님 — sim 의존성 버그.
- 검증된 메커니즘: 네임스페이스 slash(`/harness-aijient-team:*`), transcript=session_id 글롭,
  헤드리스 권한 게이트(스코프 allowlist 필요), nested claude 인증=토큰 or ambient.

### 2차 풀런 (2026-06-30T1835) — PASS 20 · FAIL 1 · MANUAL 1
- **SC1 init**: 비대화형 지시 주니 헤드리스 **완주 7/7**. → init은 *기본은* 대화형이나
  에이전트가 비대화형으로 구동 가능. (refined finding)
- **SC4 SessionStart nudge ✅ 주입됨** — applied 프로젝트 2nd 세션에서 설치된 SessionStart
  hook 발화, transcript에 "활성 task가 없습니다" 주입. **핵심 2번 측정 성공** (CLI sim이
  "⚠️수동확인"하던 것을 자동 PASS로 전환).
- **SC4 post-commit handoff ❌** = **sim 버그**(하네스 정상). CLI 격리 증명:
  post-commit hook 설치됨(`.git/hooks/post-commit`→`harness-team handoff`), **active task
  있으면 handoff mtime 갱신**, 없으면 no-op. SC4가 SessionStart 테스트 위해 active를 먼저
  null로 만든 뒤 커밋해 false FAIL. → **SC4 순서 교체**(post-commit 먼저)로 수정.

### 3차 최종 클린 런 (실행 중)
1. SC4 순서: post-commit(active 살아있을 때) → SessionStart(null). 2. SC1 산문 노트 제거.
3. sanitizeNote 대시 제거.

### 학습 (sim 설계)
- 헤드리스 에이전트는 **권한 게이트** → 스코프 allowlist 필요(`Bash(node:*),Bash(git:*),
  Bash(harness-team:*)`). 블랭킷 skip은 classifier 차단 + 위험.
- nested `claude -p`는 자식세션 인증 미상속 → 토큰(파일) or ambient(유저-런).
- 시나리오 **의존성**에 주의: hook 측정은 init 멈춤/active-task null 같은 선행 상태에 오염됨.
  의심 FAIL은 **CLI 레벨로 격리 검증** 후 진짜/아티팩트 판별.

## Reviews
*Codex/Gemini 등 리뷰 실행 시 결과(요약·발견·조치)를 날짜와 함께 남긴다. 남기지 않은 리뷰는 "안 한 것"으로 간주.*


## Learnings


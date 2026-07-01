# sim-agentloop-redesign — Plan

## 목표
CLI 배관 sim → `claude -p` agent-in-the-loop 유저-런 하네스로 전면 재작성.
init→apply→task 실세션을 사이드이펙트 신호 루브릭으로 측정, pass-rate 리포트.

## 단계
- [x] **P1. 신호 루브릭 정의** — spec "신호 루브릭" SC1~SC5 확정
- [x] **P2. 하네스 스크립트 스캐폴드** — `tests/sim/agentloop.mjs`: auth 가드·runHeadless·findTranscript·makeSandbox·`probe` 모드 (구문·가드 검증됨)
- [x] **P0. probe — 메커니즘 검증 완료** — slash는 네임스페이스(`/harness-aijient-team:*`) 필요, transcript는 session_id 글롭으로 찾음, JSON 파싱 OK. **auth-의존 실행만 미검증**(토큰 무효 401).
- [x] **P3. 시나리오 구현 (init)** — `sc1Init`: scaffold 7신호. *코드 완료, authed 실행 검증 대기*
- [x] **P4. 시나리오 구현 (apply)** — `sc2Apply`: 비파괴 5신호(해시 불변). *코드 완료, 검증 대기*
- [x] **P5. 시나리오 구현 (task+hook)** — `sc3Task`(4 SSOT)·`sc4Hooks`(SessionStart nudge + post-commit). *코드 완료, 검증 대기*
- [x] **P6. 신호 채점 + N-trial pass-rate** — `sc5Triggers`(slash/자연어 N=2), 집계+렌더.
- [x] **P6b. 골든 스냅샷** — `snapshot()`: `sim-snapshots/<version>/<scenario>/` rsync.
- [x] **P7. 무오염 정리** — `.sim-tmp/<TS>` 삭제, 전 시나리오 throwaway(영속 프로젝트 미사용).
- [x] **P8. 리포트 생성** — `agentloop-<TS>.md` 신호집계+섹션+스냅샷+정리.
- [x] **P10. authed 풀런 검증** — 3차 캐논 런(2026-06-30T1854) PASS 21·FAIL 0·MANUAL 1, 무오염 ✓.
- [x] **P9. 스킬 본문 재작성** — `skills/harness-sim/SKILL.md`(L5 agentloop 중심) + `commands/harness-sim.md` 래퍼 갱신.

## 후속 task (이번 범위 밖 — 별도 task로 진행)
- **테스트 시뮬레이션 가이드 HTML** — sim 사용법·결과 해석·버전 비교 워크플로우 가이드 문서. (이 task 범위 아님)

## 결정 로그
- 인증: **B(토큰 자동화)** — `claude setup-token` → `~/.claude-sim-oauth-token`(600), 스크립트가 nested claude env에만 주입.
- 테스트 프로젝트 위치: repo 밖(`../harness-playground`) 유지 — nested-git/오염 회피.
- init/apply/task = CLI 커맨드, slash는 마켓플레이스 플러그인이 래핑.

## Ontology 변경 로그
- agent-in-the-loop / 신호 / pass-rate / 유저-런 정의 추가 (spec Ontology 반영됨)

## 참고
- spec: `sim-agentloop-redesign-spec.md`
- 현 스킬: `skills/harness-sim/SKILL.md`

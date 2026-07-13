---
name: harness-sim
description: 설치된 하네스가 소비자 프로젝트에서 진짜 작동하는지 실제 claude -p 에이전트 세션으로 검증하고(L5 agent-in-the-loop) 날짜 리포트를 남긴다. "하네스 시뮬레이션", "harness sim", "playground 검증", "하네스 동작 점검", "설치된 하네스 테스트" 요청에 사용.
allowed-tools: Read, Write, Edit, Bash, Glob
---

# /harness-sim — agent-in-the-loop L5 시뮬레이션 + 리포트

## Codex command surface

This skill also serves as the Codex `$harness-sim` entry corresponding to Claude
Code `/harness-sim`. The Claude wrapper lives at `../../commands/harness-sim.md`;
keep this SKILL.md as the SSOT for the simulation procedure.

**측정 대상(2번):** `harness-init`/`apply`/`task`로 소비자 프로젝트에 *설치된* 하네스가
실제로 작동하는가 — slash→CLI 체인, 설치된 hook(SessionStart·post-commit) 발화,
트리거 신뢰성. 이 레이어는 실제 **`claude -p` 에이전트 세션을 cwd=테스트프로젝트에서
띄워야만** 관찰된다(한 세션 안에서 도는 스킬은 못 본다).

> **두 레이어를 구분하라.**
> - **L4 (CLI 배관, 빠름):** `tests/e2e/*` + `doctor --json`. 휘발성 tmpdir에서 기계 검증.
>   플러그인 CLI 로직만 본다. auth·에이전트 불필요.
> - **L5 (agent-in-the-loop, 이 스킬):** `tests/sim/agentloop.mjs`. 실 에이전트 세션의
>   사이드이펙트를 채점. **설치된 하네스(2번)** 를 측정하는 유일한 경로. auth·권한·시간 필요.
> - **L5-skill (에이전트-워크플로우 스킬 검증, 자매 하네스):** `tests/sim/skilltest.mjs`.
>   `/harness-unittest`·`/harness-comptest` 처럼 CLI가 아닌 **에이전트 워크플로우 스킬**을
>   fixture 프로젝트에서 실제 `claude -p` 로 구동해 작성된 테스트 side-effect(파일·GWT·query
>   우선순위·`npm test` 통과)를 채점. `agentloop.mjs`(scaffold)가 못 보는 레이어. auth 필요.
>   `selftest`(스코어러 자체검증)·`warm`(fixture 프리빌드)은 **auth 불필요**.

핵심 판정 도구는 `tests/sim/agentloop.mjs`(scaffold)와 `tests/sim/skilltest.mjs`(command 스킬)다.
이 스킬은 그것들을 **구동하고 리포트를 해석**한다 — assert를 새로 짜지 않는다.

## 정직성 규칙 (위조 금지)
- **산문은 신호가 아니다.** PASS는 반드시 파일/git/transcript/hook-stderr **증거**에 근거.
- **PreToolUse protect-files**는 헤드리스에서 신뢰성 있게 관찰 불가 → 항상 `⚠️manual`.
- **의심 FAIL은 CLI 레벨로 격리 검증** 후 "진짜 결함 vs sim 아티팩트"를 판별해 리포트에 명시.
  (예: 시나리오 선행 상태 — init 멈춤, active-task null — 때문에 생긴 false FAIL을 그냥
  하네스 결함으로 적지 말 것.)
- 비결정 항목(트리거)은 단일 PASS가 아니라 **pass-rate(N=2)** 로 표기.

---

## Phase 0 — 프리플라이트

1. **playground 존재** — `../harness-playground` 없으면 "dev 전용 도구 — playground 부재"
   안내하고 우아하게 종료(에러 아님).
2. **harness-team PATH** — `command -v harness-team`. 없으면 설치된 post-commit 훅이
   `harness-team`을 못 불러 검증이 거짓 통과. 없으면 안내: plugin repo에서 `npm link`.
3. **auth 준비** — nested `claude -p`는 자식세션 인증을 **상속하지 못한다**(검증됨).
   두 경로 중 하나 필요:
   - **토큰:** `~/.claude-sim-oauth-token`(600) 존재 → `agentloop.mjs`가 child env에만 주입.
     없으면 만들기: `claude setup-token` → `umask 077; echo '<token>' > ~/.claude-sim-oauth-token`.
   - **유저-런:** 토큰 없으면 인증된 터미널에서 유저가 직접 `node tests/sim/agentloop.mjs run`.
4. **권한 인지** — 헤드리스 에이전트는 권한 게이트라 `node`/`git` 실행이 막힌다.
   `agentloop.mjs`가 **스코프 allowlist**(`Bash(node:*),Bash(git:*),Bash(harness-team:*)` +
   파일툴)로 spawn한다. **어시스턴트가 대신 돌리려면 사용자 허가가 필요**(블랭킷 skip 금지).

## Phase 1 — probe (계약 검증, 선택이지만 권장)

`node tests/sim/agentloop.mjs probe` — 헤드리스 계약을 굳힌다:
- auth 작동(토큰/ambient), envelope 파싱, transcript을 session_id로 찾음,
  slash 형태(`/harness-aijient-team:*` 네임스페이스가 해석됨).
- auth 실패면 여기서 드러난다(401 등) → 풀런 전에 토큰 재발급.

## Phase 2 — run (풀 시뮬레이션)

`node tests/sim/agentloop.mjs run` — **~30-50분**(헤드리스 콜 ~10개). **백그라운드 실행 필수.**
throwaway `.sim-tmp/<TS>/` 샌드박스에서 실 에이전트를 띄워 SC1~SC5를 채점:

- **SC1 init** — 빈 dir + `/harness-aijient-team:harness-init`(비대화형 지시) → scaffold 7신호.
- **SC2 apply** — 기존파일 dir + `harness-apply` → 비파괴(해시 불변) + 코어 주입 + doctor green.
- **SC3 task** — applied dir + `harness-task` → 4 SSOT + active.json + spec 게이트 섹션.
- **SC4 설치-hook(핵심 2번)** — applied dir에서 post-commit handoff(active task 있을 때
  mtime 갱신) + **2nd 세션 SessionStart nudge transcript 주입** + PreToolUse(`⚠️manual`).
- **SC5 트리거** — 네임스페이스 slash + 자연어, 각 N=2 pass-rate.

산출: `../harness-playground/sim-reports/agentloop-<TS>.md` +
골든 스냅샷 `sim-snapshots/<version>/{init,apply}`(버전 간 `git diff`용). 정리 후 `.sim-tmp` 삭제.

## Phase 3 — 해석 & 보고

1. 리포트의 신호 집계(PASS/FAIL/MANUAL)와 SC 매트릭스를 읽는다.
2. **FAIL이 있으면** 시나리오 의존성부터 의심 → CLI 레벨로 격리 검증(예: 임시 dir에서
   `harness-team apply --yes` 후 `.git/hooks/post-commit`·handoff mtime 직접 확인).
   진짜 결함이면 남기고, sim 아티팩트면 `agentloop.mjs`를 고쳐 재실행.
3. 무오염 확인: `.sim-tmp` 삭제됨 + 영속 playground 3프로젝트 `git status` clean.
4. 리포트 경로를 사용자에게 보고. (sim-reports/·sim-snapshots/는 playground 소속 — 커밋 정책은 유저.)

## 상태 관리 (하이브리드 — 버전 간 비교)
- **baseline**: 매 런 throwaway → 시작 조건 동일(비교가능성).
- **하네스 산출물**: `sim-snapshots/<version>/`에 골든 스냅샷 → `git diff <v1>..<v2>`로 회귀 탐지.
- **리포트**: 날짜+버전 박아 누적.

## 주의
- 실제 `src/`·영속 프로젝트를 바꾸지 않는다 — 모든 변경은 throwaway `.sim-tmp`에 국한.
- 어떤 단계가 죽어도 정리는 best-effort, 정리 실패를 리포트에 남긴다.
- PASS는 반드시 증거에 근거. 추측 green 금지.

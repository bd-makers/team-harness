---
description: 설치된 하네스가 소비자 프로젝트에서 진짜 작동하는지 실제 claude -p 세션으로 검증 (L5 agent-in-the-loop) + 날짜 리포트 (harness-sim 스킬 위임)
argument-hint: "[run|probe]"
tags:
  - project
  - ai
  - obsidian
created: 2026-06-29
modified: 2026-07-01
---

이 커맨드는 **`harness-sim` 스킬**의 얇은 래퍼입니다 (프리픽스 슬래시 형태 제공).
절차의 단일 소스(SSOT)는 스킬 본문입니다 — 여기서 복제하지 않습니다.

`${CLAUDE_PLUGIN_ROOT}/skills/harness-sim/SKILL.md` 를 읽고 그 절차를 그대로 실행하세요:

- 판정 도구는 `tests/sim/agentloop.mjs` — 실제 `claude -p` 에이전트 세션을 throwaway
  샌드박스에서 띄워 **설치된 하네스(2번)** 를 사이드이펙트 신호로 채점.
- Phase 0 프리플라이트(playground·PATH·**auth 토큰/ambient**·권한 인지) → Phase 1 `probe`
  (계약 검증) → Phase 2 `run`(~30-50분, **백그라운드**) → Phase 3 해석·무오염 확인·보고.
- 스킬의 **정직성 규칙**(산문은 신호 아님, PreToolUse는 `⚠️manual`, 의심 FAIL은 CLI 격리
  검증, 증거 없는 PASS 금지)을 준수하세요.

작성된 리포트 경로(`harness-playground/sim-reports/agentloop-<TS>.md`)를 사용자에게 보고하세요.

---
description: 설치된 하네스와 에이전트 워크플로우 스킬이 진짜 작동하는지 실제 claude -p 세션으로 검증 (L5 agent-in-the-loop) + 날짜 리포트 (harness-sim 스킬 위임)
phase: Simulation
argument-hint: "[run|probe]"
tags:
  - project
  - ai
  - obsidian
created: 2026-06-29
modified: 2026-07-01
---

이 커맨드는 **`harness-sim` 스킬**의 얇은 래퍼입니다 (프리픽스 슬래시 형태 제공).
절차·판정 도구·리포트 경로의 단일 소스(SSOT)는 스킬 본문입니다 — 여기서 복제하지 않습니다.

`${CLAUDE_PLUGIN_ROOT}/skills/harness-sim/SKILL.md` 를 읽고 그 절차를 그대로 실행하세요.
프리플라이트에서 **어느 하네스를 돌릴지** 먼저 정하고, 스킬의 **정직성 규칙**(산문은 신호가
아님, 증거 없는 PASS 금지)을 준수한 뒤, 스킬이 지정한 리포트 경로를 사용자에게 보고하세요.

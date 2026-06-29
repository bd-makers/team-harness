---
description: playground 3개 프로젝트에서 설치된 하네스를 굴려 L4 시뮬레이션 + 날짜 리포트 (harness-sim 스킬 위임)
argument-hint: "[all|bare-node|next-app|rn-app]"
tags:
  - project
  - ai
  - obsidian
created: 2026-06-29
modified: 2026-06-29
---

이 커맨드는 **`harness-sim` 스킬**의 얇은 래퍼입니다 (프리픽스 슬래시 형태 제공).
절차의 단일 소스(SSOT)는 스킬 본문입니다 — 여기서 복제하지 않습니다.

`${CLAUDE_PLUGIN_ROOT}/skills/harness-sim/SKILL.md` 를 읽고 그 절차를 그대로 실행하세요:

- 대상 프로젝트: `$ARGUMENTS` (없으면 `all` → bare-node / next-app / rn-app)
- Phase 0 프리플라이트(PATH·playground 존재·잔재 reclaim·스냅샷) → Phase 1 프로젝트별
  S1(코어&스킬)·S2(새 피처)·S3(기존 수정) → Phase 2 정리(무오염) → Phase 3 날짜 리포트.
- 스킬의 **정직성 규칙**(slash/skill/SessionStart nudge는 `⚠️수동확인`, 증거 없는 PASS 금지)을 준수하세요.

작성된 리포트 경로(`harness-playground/sim-reports/harness-sim-<TS>.md`)를 사용자에게 보고하세요.

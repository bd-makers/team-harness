---
description: 하네스 무결성 점검 (파일, hooks, CLI PATH)
phase: Validation
tags:
  - project
  - ai
  - obsidian
created: 2026-04-28
modified: 2026-09-09
---

```bash
node "${CLAUDE_PLUGIN_ROOT}/bin/harness-team.mjs" doctor
```

**observe 트립와이어 경고**

관측 로그(`.harness/observability/`)의 트립와이어가 발화한 상태면 `observe trip wires` 경고 1건을 낸다 — wire id·수치·
`harness-team observe` 안내·루프백 nudge. warn 수준이라 exit code에 영향이 없고(임계값이 실사용 보정 전이라 오탐이 CI를
깨면 안 된다), task를 자동 생성하지 않는다. 로그가 없거나 발화가 없으면 항목 자체가 없다. 판정 정본은 `/harness-observe`.

**CLAUDE.md 커스텀 내용 점검**

doctor 실행 결과와 함께, 현재 디렉토리의 `CLAUDE.md`를 읽어 하네스 마커(`<!-- harness:section -->`, `<!-- harness:user -->`) 외부에 커스텀 내용이 있는지 확인하고 결과를 보고하세요:

- ✅ **반영됨** — CLAUDE.md가 없거나, 모든 내용이 하네스 마커 내부에 있음
- ⚠️ **미반영 내용 있음** — 하네스 마커 외부에 커스텀 내용이 있음 (`/harness-init`으로 `<!-- harness:user -->` 섹션에 이전 가능)

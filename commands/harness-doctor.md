---
description: 하네스 무결성 점검 (symlink, hooks, settings)
phase: Validation
tags:
  - project
  - ai
  - obsidian
created: 2026-04-28
modified: 2026-04-28
---

```bash
node "${CLAUDE_PLUGIN_ROOT}/bin/harness-team.mjs" doctor
```

**CLAUDE.md 커스텀 내용 점검**

doctor 실행 결과와 함께, 현재 디렉토리의 `CLAUDE.md`를 읽어 하네스 마커(`<!-- harness:section -->`, `<!-- harness:user -->`) 외부에 커스텀 내용이 있는지 확인하고 결과를 보고하세요:

- ✅ **반영됨** — CLAUDE.md가 없거나, 모든 내용이 하네스 마커 내부에 있음
- ⚠️ **미반영 내용 있음** — 하네스 마커 외부에 커스텀 내용이 있음 (`/harness-apply` 또는 `/harness-init`으로 `<!-- harness:user -->` 섹션에 이전 가능)

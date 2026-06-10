---
description: 구버전 구조(실제 파일)를 신버전(symlink)으로 원스텝 마이그레이션
argument-hint: [--yes] [--backup-dir <path>] [--target <dir>]
tags:
  - project
  - ai
  - obsidian
created: 2026-04-27
modified: 2026-04-27
---

```bash
node "${CLAUDE_PLUGIN_ROOT}/bin/harness-team.mjs" upgrade $ARGUMENTS
```

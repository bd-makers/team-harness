---
description: project → backup dir 동기화 (merge, newer-wins)
phase: Backup
argument-hint: [--yes] [--target <dir>]
tags:
  - project
  - ai
  - obsidian
created: 2026-04-24
modified: 2026-04-24
---

```bash
node "${CLAUDE_PLUGIN_ROOT}/bin/harness-team.mjs" clone $ARGUMENTS
```

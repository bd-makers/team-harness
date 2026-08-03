---
description: backup dir → project symlink 생성/교체
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
node "${CLAUDE_PLUGIN_ROOT}/bin/harness-team.mjs" symlink $ARGUMENTS
```

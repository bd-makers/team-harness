---
description: project에서 harness symlink 제거
phase: Cleanup
argument-hint: [--yes] [--target <dir>]
tags:
  - project
  - ai
  - obsidian
created: 2026-04-24
modified: 2026-04-24
---

```bash
node "${CLAUDE_PLUGIN_ROOT}/bin/harness-team.mjs" delete $ARGUMENTS
```

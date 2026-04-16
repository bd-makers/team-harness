---
description: task 관리 (new/list/switch/done) — docs/<member>/<feature|fix>/<name>/ 구조
argument-hint: new feature <name> | new fix <name> | list | switch <id> | done
---

```bash
node "${CLAUDE_PLUGIN_ROOT}/bin/harness-team.mjs" task $ARGUMENTS
```

예시:
- `/harness-task new feature auth-redesign`
- `/harness-task list`
- `/harness-task switch feature/auth-redesign`
- `/harness-task done`

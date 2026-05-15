---
description: task 관리 (task/list/done/handoff) — docs/<user>/<name>/ 구조
argument-hint: <name> | list | done
---

```bash
node "${CLAUDE_PLUGIN_ROOT}/bin/harness-team.mjs" task $ARGUMENTS
```

예시:
- `harness-team task auth-redesign`   # 생성 또는 활성화
- `harness-team list`                 # 전체 task 목록
- `harness-team done`                 # 활성 task 완료 처리

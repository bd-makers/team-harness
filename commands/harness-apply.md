---
description: 기존 프로젝트에 팀 하네스를 비파괴적으로 적용 (dry-run 후 병합)
argument-hint: [--yes]
---

기존 `CLAUDE.md`/`settings.json`이 있으면 HTML 마커 섹션 단위로 병합하고, 나머지는 비어있는 파일만 채웁니다.

실행:

```bash
node "${CLAUDE_PLUGIN_ROOT}/bin/harness-team.mjs" apply $ARGUMENTS
```

`--yes`를 붙이지 않으면 diff를 보여주고 승인을 요청합니다.

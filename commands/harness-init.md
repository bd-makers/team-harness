---
description: 현재 프로젝트에 팀 하네스를 신규 scaffold합니다 (Claude 메인 + Codex/Gemini/Cursor/OpenCode)
argument-hint: [--stack react-native|next|node|python|generic] [--yes]
---

현재 작업 디렉토리에 팀용 하네스를 설치합니다.

실행:

```bash
node "${CLAUDE_PLUGIN_ROOT}/bin/harness-team.mjs" init $ARGUMENTS
```

결과 확인 후 `/harness-doctor`로 무결성 점검을 권장합니다.

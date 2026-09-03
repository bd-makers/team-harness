---
description: project에서 harness symlink 제거
phase: Cleanup
argument-hint: '[--include-real] [--yes] [--backup-dir <path>] [--target <dir>]'
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

기본은 백업 dir을 가리키는 symlink만 제거한다. `--include-real`은 실파일·디렉터리(`docs/`·`.harness/` 포함)까지
**영구 삭제**하며, `--yes`는 그 "PERMANENTLY delete" 확인까지 건너뛴다 — 두 플래그를 함께 넘기기 전에
사용자에게 삭제 대상을 보여주고 명시적으로 확인받는다.

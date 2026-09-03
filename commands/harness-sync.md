---
description: ".claude/rules → .cursor/rules 미러 재생성(단방향) + post-commit 훅 재설치"
phase: Maintenance
tags:
  - project
  - ai
  - obsidian
created: 2026-04-14
modified: 2026-04-14
---

```bash
node "${CLAUDE_PLUGIN_ROOT}/bin/harness-team.mjs" sync
```

하는 일은 둘뿐이다: `.claude/rules/*.md`를 `.cursor/rules/*.mdc`로 미러(원본이 사라진 미러는 정리)하고
git post-commit 훅을 재설치한다. symlink를 만들지 않으며, 에이전트 파일(`AGENTS.md`/`CLAUDE.md`) 갱신은
`/harness-init` 재실행이 담당한다.

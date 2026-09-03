---
description: 구버전 구조(실제 파일)를 신버전(symlink)으로 원스텝 마이그레이션
phase: Migration
argument-hint: '[--yes] [--backup-dir <path>] [--target <dir>]'
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

내부 순서: 백업 dir 동기화(clone) → 실파일 목록 확인 → `delete --include-real --yes`(영구 삭제) → symlink 재생성.
확인 프롬프트는 한 번뿐이고 `--yes`는 그것마저 건너뛴다 — 비대화식으로 돌리기 전에 백업 dir이 최신인지
사용자와 확인한다.

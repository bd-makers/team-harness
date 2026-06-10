---
description: 구버전 구조를 최신으로 마이그레이션 — backup dir 스크립트 → project root, task 구조(pre-0.6→0.6, 0.6→0.7 artifact.md 분리)
argument-hint: [--yes] [--target <dir>]
tags:
  - project
  - ai
  - obsidian
created: 2026-06-02
modified: 2026-06-02
---

**사전 확인 — 기존 CLAUDE.md 커스텀 내용**

현재 디렉토리에 `CLAUDE.md`가 있으면 내용을 읽고, 하네스 마커(`<!-- harness:section -->`, `<!-- harness:user -->`) 외부에 커스텀 내용이 있는지 확인하세요.

커스텀 내용이 있다면 `AskUserQuestion` 툴로 다음을 물어보세요:

> 현재 CLAUDE.md에 하네스 마커 외부의 내용이 있습니다.
> 이 내용을 하네스의 `<!-- harness:user -->` 섹션으로 이전할까요?
>
> **예** — migrate 완료 후 해당 내용을 `<!-- harness:user:begin -->` 블록에 추가합니다
> **아니오** — 건너뜁니다

**예** 선택 시: migrate 실행 완료 후, 기존 커스텀 내용을 `CLAUDE.md`의 `<!-- harness:user:begin -->` ~ `<!-- harness:user:end -->` 사이에 추가합니다.

```bash
node "${CLAUDE_PLUGIN_ROOT}/bin/harness-team.mjs" migrate $ARGUMENTS
```

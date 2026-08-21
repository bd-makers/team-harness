---
description: (deprecated) /harness-review codex 로 대체 — 다음 마이너 버전에서 제거 예정
phase: Workflow
argument-hint: '[--base <ref>] [focus ...]'
---

이 명령은 엔진 중립 재편으로 `/harness-review`에 통합되었다. 이 이름은 호환을 위해
1개 마이너 버전 동안만 유지된다 — 새 이름으로 전환하라.

지금 바로 `harness-review.md`를 읽고 **엔진 `codex`** 로 그 절차를 그대로 수행하라.
인수 해석(`--base <ref>`, focus)은 새 명령과 동일하며, Raw slash-command 인수를
그대로 전달한다:

`$ARGUMENTS`

보고 시 사용자에게 이 이름이 deprecated이며 다음부터는
`/harness-review codex`(또는 엔진 자동 선택 `/harness-review`)를 쓰라고 한 줄 안내한다.

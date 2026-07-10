---
name: harness-comptest
description: Codex wrapper for writing Testing Trophy component tests in React/React Native projects. Use when the user asks for /harness-comptest, component or screen test writing, Testing Library integration tests, user-event interaction tests, form-flow tests, msw-boundary component tests, or React Native Testing Library authoring.
---

# Harness Comptest

Use this skill as the Codex equivalent of Claude Code `/harness-comptest`.

## Source of Truth

- Read `../../commands/harness-comptest.md` before acting.
- Follow that command contract, plus `AGENTS.md` and active task docs when present.
- This command is an agent workflow, not a `harness-team` CLI subcommand. Follow the command contract directly.
- Scope boundary: this command targets code whose concern is rendering and user interaction (components, screens, UI hooks, form flows). Pure logic extractable from a component (formatters, calculations, reducers) belongs to `/harness-unittest` — extract it and route it there.
- Translate Claude-only references for Codex:
  - `${CLAUDE_PLUGIN_ROOT}` means this installed plugin root or this repository root.
  - `AskUserQuestion` means ask a concise user question only when required (e.g. installing a missing test runner or testing library, or confirming scope); otherwise proceed with safe defaults.
  - Subagent delegation for large scopes means process the file groups sequentially yourself.
- Do not create commits unless the user explicitly asks.

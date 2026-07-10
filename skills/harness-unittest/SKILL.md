---
name: harness-unittest
description: Codex wrapper for writing Khorikov-style unit tests in JS/TS/React/React Native projects. Use when the user asks for /harness-unittest, unit test writing, test coverage for a file or feature, Given-When-Then tests, Testing Library tests, or Vitest/Jest test authoring.
---

# Harness Unittest

Use this skill as the Codex equivalent of Claude Code `/harness-unittest`.

## Source of Truth

- Read `../../commands/harness-unittest.md` before acting.
- Follow that command contract, plus `AGENTS.md` and active task docs when present.
- This command is an agent workflow, not a `harness-team` CLI subcommand. Follow the command contract directly.
- Translate Claude-only references for Codex:
  - `${CLAUDE_PLUGIN_ROOT}` means this installed plugin root or this repository root.
  - `AskUserQuestion` means ask a concise user question only when required (e.g. installing a missing test runner, or confirming scope); otherwise proceed with safe defaults.
  - Subagent delegation for large scopes means process the file groups sequentially yourself.
- Do not create commits unless the user explicitly asks.

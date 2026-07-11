---
name: harness-inttest
description: Codex wrapper for writing Khorikov Part III integration tests in JS/TS backend projects. Use when the user asks for /harness-inttest, integration test writing, API route or handler tests, repository or database access tests, testcontainers setup, msw-node outbound-HTTP boundary tests, or process-boundary vertical-slice tests.
---

# Harness Inttest

Use this skill as the Codex equivalent of Claude Code `/harness-inttest`.

## Source of Truth

- Read `../../commands/harness-inttest.md` before acting.
- Follow that command contract, plus `AGENTS.md` and active task docs when present.
- This command is an agent workflow, not a `harness-team` CLI subcommand. Follow the command contract directly.
- Scope boundary: this command targets code that crosses a process boundary or wires several modules together with real infrastructure (API routes/handlers, repository and DB access layers, cache/queue, filesystem, outbound HTTP slices). Pure logic (calculations, validation, reducers) belongs to `/harness-unittest`; rendering and user interaction belong to `/harness-comptest`. Route accordingly.
- Translate Claude-only references for Codex:
  - `${CLAUDE_PLUGIN_ROOT}` means this installed plugin root or this repository root.
  - `AskUserQuestion` means ask a concise user question only when required (e.g. installing a missing test runner or infrastructure, or confirming scope); otherwise proceed with safe defaults.
  - Docker availability checks (`docker info`) and subagent delegation for large scopes: run the checks yourself and process the file groups sequentially.
- Do not create commits unless the user explicitly asks.

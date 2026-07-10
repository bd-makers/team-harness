---
name: harness-simplifier
description: Codex wrapper for simplifying the active task plan. Use when the user asks for /harness-simplifier, harness simplifier, YAGNI review, remove overengineering, or simplify plan steps.
---

# Harness Simplifier

Use this skill as the Codex equivalent of Claude Code `/harness-simplifier`.

## Source of Truth

- Read `../../commands/harness-simplifier.md` before acting.
- Follow that command contract, plus `AGENTS.md` and active task docs when present.
- This command is an agent workflow, not a `harness-team` CLI subcommand. Follow the command contract directly.
- Translate Claude-only references for Codex:
  - `${CLAUDE_PLUGIN_ROOT}` means this installed plugin root or this repository root.
  - `AskUserQuestion` means ask a concise user question only when required; otherwise proceed with safe defaults.
- Do not create commits unless the user explicitly asks.

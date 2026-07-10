---
name: harness-interview
description: Codex wrapper for Socratic spec clarification on the active task. Use when the user asks for /harness-interview, harness interview, ambiguity review, spec interview, or Socratic task questions.
---

# Harness Interview

Use this skill as the Codex equivalent of Claude Code `/harness-interview`.

## Source of Truth

- Read `../../commands/harness-interview.md` before acting.
- Follow that command contract, plus `AGENTS.md` and active task docs when present.
- This command is an agent workflow, not a `harness-team` CLI subcommand. Follow the command contract directly.
- Translate Claude-only references for Codex:
  - `${CLAUDE_PLUGIN_ROOT}` means this installed plugin root or this repository root.
  - `AskUserQuestion` means ask a concise user question only when required; otherwise proceed with safe defaults.
- Do not create commits unless the user explicitly asks.

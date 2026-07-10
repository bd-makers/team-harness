---
name: harness-contrarian
description: Codex wrapper for challenging active task assumptions. Use when the user asks for /harness-contrarian, contrarian review, assumption challenge, hidden cost review, or plan/spec pushback.
---

# Harness Contrarian

Use this skill as the Codex equivalent of Claude Code `/harness-contrarian`.

## Source of Truth

- Read `../../commands/harness-contrarian.md` before acting.
- Follow that command contract, plus `AGENTS.md` and active task docs when present.
- This command is an agent workflow, not a `harness-team` CLI subcommand. Follow the command contract directly.
- Translate Claude-only references for Codex:
  - `${CLAUDE_PLUGIN_ROOT}` means this installed plugin root or this repository root.
  - `AskUserQuestion` means ask a concise user question only when required; otherwise proceed with safe defaults.
- Do not create commits unless the user explicitly asks.

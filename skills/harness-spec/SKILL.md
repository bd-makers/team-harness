---
name: harness-spec
description: Codex wrapper for drafting the active task spec from Confluence, Figma, or an interview. Use when the user asks for /harness-spec, harness spec, spec draft, spec generation, or writing spec.md from PRD or design sources.
---

# Harness Spec

Use this skill as the Codex equivalent of Claude Code `/harness-spec`.

## Source of Truth

- Read `../../commands/harness-spec.md` before acting.
- Follow that command contract, plus `AGENTS.md` and active task docs when present.
- This command is an agent workflow, not a `harness-team` CLI subcommand. Follow the command contract directly.
- Translate Claude-only references for Codex:
  - `${CLAUDE_PLUGIN_ROOT}` means this installed plugin root or this repository root.
  - `AskUserQuestion` means ask a concise user question only when required; otherwise proceed with safe defaults.
  - MCP tools (Atlassian, Figma): check availability first and use them when connected; fall back to the contract's manual paste path only when they are absent or fail.
- Do not create commits unless the user explicitly asks.

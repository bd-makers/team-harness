---
name: harness-delete
description: Codex wrapper for removing harness symlinks from a project. Use when the user asks for /harness-delete, harness delete, remove harness symlinks, or uninstall project harness links.
---

# Harness Delete

Use this skill as the Codex equivalent of Claude Code `/harness-delete`.

## Source of Truth

- Read `../../commands/harness-delete.md` before acting.
- Follow that command contract, plus `AGENTS.md` and active task docs when present.
- Prefer the shared CLI instead of reimplementing behavior:
  - In this plugin source repo, run: `node bin/harness-team.mjs delete ...`
  - In a consumer project with `harness-team` on PATH, run: `harness-team delete ...`
- Translate Claude-only references for Codex:
  - `${CLAUDE_PLUGIN_ROOT}` means this installed plugin root or this repository root.
  - `AskUserQuestion` means ask a concise user question only when required; otherwise proceed with safe defaults.
- Do not create commits unless the user explicitly asks.

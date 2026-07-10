---
name: harness-upgrade
description: Codex wrapper for upgrading older real-file harness setups to symlink-based layout. Use when the user asks for /harness-upgrade, harness upgrade, symlink migration, or old harness upgrade.
---

# Harness Upgrade

Use this skill as the Codex equivalent of Claude Code `/harness-upgrade`.

## Source of Truth

- Read `../../commands/harness-upgrade.md` before acting.
- Follow that command contract, plus `AGENTS.md` and active task docs when present.
- Prefer the shared CLI instead of reimplementing behavior:
  - In this plugin source repo, run: `node bin/harness-team.mjs upgrade ...`
  - In a consumer project with `harness-team` on PATH, run: `harness-team upgrade ...`
- Translate Claude-only references for Codex:
  - `${CLAUDE_PLUGIN_ROOT}` means this installed plugin root or this repository root.
  - `AskUserQuestion` means ask a concise user question only when required; otherwise proceed with safe defaults.
- Do not create commits unless the user explicitly asks.

---
name: harness-clone
description: Codex wrapper for syncing a project into its harness backup directory. Use when the user asks for /harness-clone, harness clone, project backup sync, merge sync, or newer-wins backup copy.
---

# Harness Clone

Use this skill as the Codex equivalent of Claude Code `/harness-clone`.

## Source of Truth

- Read `../../commands/harness-clone.md` before acting.
- Follow that command contract, plus `AGENTS.md` and active task docs when present.
- Prefer the shared CLI instead of reimplementing behavior:
  - In this plugin source repo, run: `node bin/harness-team.mjs clone ...`
  - In a consumer project with `harness-team` on PATH, run: `harness-team clone ...`
- Translate Claude-only references for Codex:
  - `${CLAUDE_PLUGIN_ROOT}` means this installed plugin root or this repository root.
  - `AskUserQuestion` means ask a concise user question only when required; otherwise proceed with safe defaults.
- Do not create commits unless the user explicitly asks.

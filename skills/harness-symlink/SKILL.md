---
name: harness-symlink
description: Codex wrapper for creating or replacing harness backup symlinks. Use when the user asks for /harness-symlink, harness symlink, backup symlink setup, or relink harness backup files.
---

# Harness Symlink

Use this skill as the Codex equivalent of Claude Code `/harness-symlink`.

## Source of Truth

- Read `../../commands/harness-symlink.md` before acting.
- Follow that command contract, plus `AGENTS.md` and active task docs when present.
- Prefer the shared CLI instead of reimplementing behavior:
  - In this plugin source repo, run: `node bin/harness-team.mjs symlink ...`
  - In a consumer project with `harness-team` on PATH, run: `harness-team symlink ...`
- Translate Claude-only references for Codex:
  - `${CLAUDE_PLUGIN_ROOT}` means this installed plugin root or this repository root.
  - `AskUserQuestion` means ask a concise user question only when required; otherwise proceed with safe defaults.
- Do not create commits unless the user explicitly asks.

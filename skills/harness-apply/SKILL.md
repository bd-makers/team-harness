---
name: harness-apply
description: Codex wrapper for applying the Harness AIjient Team workflow to an existing project. Use when the user asks for /harness-apply, harness apply, non-destructive harness merge, or dry-run apply.
---

# Harness Apply

Use this skill as the Codex equivalent of Claude Code `/harness-apply`.

## Source of Truth

- Read `../../commands/harness-apply.md` before acting.
- Follow that command contract, plus `AGENTS.md` and active task docs when present.
- Prefer the shared CLI instead of reimplementing behavior:
  - In this plugin source repo, run: `node bin/harness-team.mjs apply ...`
  - In a consumer project with `harness-team` on PATH, run: `harness-team apply ...`
- Translate Claude-only references for Codex:
  - `${CLAUDE_PLUGIN_ROOT}` means this installed plugin root or this repository root.
  - `AskUserQuestion` means ask a concise user question only when required; otherwise proceed with safe defaults.
- Do not create commits unless the user explicitly asks.

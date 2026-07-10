---
name: harness-doctor
description: Codex wrapper for checking Harness AIjient Team install health. Use when the user asks for /harness-doctor, harness doctor, harness health check, symlink check, hook check, or settings validation.
---

# Harness Doctor

Use this skill as the Codex equivalent of Claude Code `/harness-doctor`.

## Source of Truth

- Read `../../commands/harness-doctor.md` before acting.
- Follow that command contract, plus `AGENTS.md` and active task docs when present.
- Prefer the shared CLI instead of reimplementing behavior:
  - In this plugin source repo, run: `node bin/harness-team.mjs doctor ...`
  - In a consumer project with `harness-team` on PATH, run: `harness-team doctor ...`
- Translate Claude-only references for Codex:
  - `${CLAUDE_PLUGIN_ROOT}` means this installed plugin root or this repository root.
  - `AskUserQuestion` means ask a concise user question only when required; otherwise proceed with safe defaults.
- Do not create commits unless the user explicitly asks.

---
name: harness-task
description: Codex wrapper for managing Harness AIjient Team task docs. Use when the user asks for /harness-task, harness task, create task, activate task, list tasks, or complete task docs.
---

# Harness Task

Use this skill as the Codex equivalent of Claude Code `/harness-task`.

## Source of Truth

- Read `../../commands/harness-task.md` before acting.
- Follow that command contract, plus `AGENTS.md` and active task docs when present.
- Prefer the shared CLI instead of reimplementing behavior:
  - In this plugin source repo, run: `node bin/harness-team.mjs task ...`
  - In a consumer project with `harness-team` on PATH, run: `harness-team task ...`
- Translate Claude-only references for Codex:
  - `${CLAUDE_PLUGIN_ROOT}` means this installed plugin root or this repository root.
  - `AskUserQuestion` means ask a concise user question only when required; otherwise proceed with safe defaults.
- Do not create commits unless the user explicitly asks.

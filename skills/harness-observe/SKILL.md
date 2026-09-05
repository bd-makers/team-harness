---
name: harness-observe
description: Codex wrapper for the harness observability scorecard and trip wires. Use when the user asks for /harness-observe, harness observe, tool failure trends, trip wire status, or observability logs.
---

# Harness Observe

Use this skill as the Codex equivalent of Claude Code `/harness-observe`.

## Source of Truth

- Read `../../commands/harness-observe.md` before acting.
- Prefer the shared CLI instead of reimplementing behavior:
  - In this plugin source repo, run: `node bin/harness-team.mjs observe ...`
  - In a consumer project with `harness-team` on PATH, run: `harness-team observe ...`
- The command is read-only and never modifies logs. Exit 1 means a trip wire fired — report it, do not "fix" the logs.
- Translate Claude-only references for Codex:
  - `${CLAUDE_PLUGIN_ROOT}` means this installed plugin root or this repository root.
- Do not create commits unless the user explicitly asks.

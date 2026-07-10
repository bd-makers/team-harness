---
name: harness-retro
description: Codex wrapper for appending learnings to the active task artifact. Use when the user asks for /harness-retro, harness retro, record a learning, task retrospective, or self-improvement note.
---

# Harness Retro

Use this skill as the Codex equivalent of Claude Code `/harness-retro`.

## Source of Truth

- Read `../../commands/harness-retro.md` before acting.
- Follow that command contract, plus `AGENTS.md` and active task docs when present.
- Prefer the shared CLI instead of reimplementing behavior:
  - In this plugin source repo, run: `node bin/harness-team.mjs retro ...`
  - In a consumer project with `harness-team` on PATH, run: `harness-team retro ...`
- Translate Claude-only references for Codex:
  - `${CLAUDE_PLUGIN_ROOT}` means this installed plugin root or this repository root.
  - `AskUserQuestion` means ask a concise user question only when required; otherwise proceed with safe defaults.
- Do not create commits unless the user explicitly asks.

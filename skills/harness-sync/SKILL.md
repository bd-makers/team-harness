---
name: harness-sync
description: Codex wrapper for regenerating the .cursor/rules mirror from .claude/rules and reinstalling the git post-commit hook. Use when the user asks for /harness-sync, harness sync, or to sync Claude and Cursor rules.
---

# Harness Sync

Use this skill as the Codex equivalent of Claude Code `/harness-sync`.

## Source of Truth

- Read `../../commands/harness-sync.md` before acting.
- Follow that command contract, plus `AGENTS.md` and active task docs when present.
- Prefer the shared CLI instead of reimplementing behavior:
  - In this plugin source repo, run: `node bin/harness-team.mjs sync ...`
  - In a consumer project with `harness-team` on PATH, run: `harness-team sync ...`
- Translate Claude-only references for Codex:
  - `${CLAUDE_PLUGIN_ROOT}` means this installed plugin root or this repository root.
  - `AskUserQuestion` means ask a concise user question only when required; otherwise proceed with safe defaults.
- Do not create commits unless the user explicitly asks.

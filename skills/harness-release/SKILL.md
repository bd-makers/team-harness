---
name: harness-release
description: Codex wrapper for releasing the Harness AIjient Team plugin. Use when the user asks for /harness-release, harness release, manifest version bump, marketplace sync, or plugin cache sync.
---

# Harness Release

Use this skill as the Codex equivalent of Claude Code `/harness-release`.

## Source of Truth

- Read `../../commands/harness-release.md` before acting.
- Follow that command contract, plus `AGENTS.md` and active task docs when present.
- Prefer the shared CLI instead of reimplementing behavior:
  - In this plugin source repo, run: `node bin/harness-team.mjs release ...`
  - In a consumer project with `harness-team` on PATH, run: `harness-team release ...`
- Translate Claude-only references for Codex:
  - `${CLAUDE_PLUGIN_ROOT}` means this installed plugin root or this repository root.
  - `AskUserQuestion` means ask a concise user question only when required; otherwise proceed with safe defaults.
- Do not create commits unless the user explicitly asks.

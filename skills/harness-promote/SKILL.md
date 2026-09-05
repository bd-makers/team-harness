---
name: harness-promote
description: Codex wrapper for promoting a task artifact Learnings entry into .claude/rules with a provenance marker. Use when the user asks for /harness-promote, harness promote, rules promote, or to turn a repeated learning into a project rule.
---

# Harness Promote

Use this skill as the Codex equivalent of Claude Code `/harness-promote`.

## Source of Truth

- Read `../../commands/harness-promote.md` before acting.
- Prefer the shared CLI instead of reimplementing behavior:
  - In this plugin source repo, run: `node bin/harness-team.mjs rules promote ...`
  - In a consumer project with `harness-team` on PATH, run: `harness-team rules promote ...`
- The user picks the entry, slug, and paths. Never choose a learning to promote on your own: list candidates first, then ask.
- The CLI refuses to overwrite an existing rule or re-promote an annotated entry. Relay the `✗ rules promote: <code>` lines verbatim.
- Translate Claude-only references for Codex:
  - `${CLAUDE_PLUGIN_ROOT}` means this installed plugin root or this repository root.
  - `AskUserQuestion` means a plain question to the user in chat.
- Do not create commits unless the user explicitly asks.

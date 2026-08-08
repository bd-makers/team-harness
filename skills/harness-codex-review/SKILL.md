---
name: harness-codex-review
description: Codex wrapper for running the read-only external Codex review of local git state and recording the result in the active task artifact. Use when the user asks for /harness-codex-review, harness codex review, external code review, or codex review of current changes.
---

# Harness Codex Review

Use this skill as the Codex equivalent of Claude Code `/harness-codex-review`.

## Source of Truth

- Read `../../commands/harness-codex-review.md` before acting.
- Follow that command contract, plus `AGENTS.md` review protocol and active task docs when present.
- The review runner is the `codex exec --sandbox read-only` CLI invocation documented there — do not depend on openai-codex plugin internals.
- Translate Claude-only references for Codex:
  - `${CLAUDE_PLUGIN_ROOT}` means this installed plugin root or this repository root.
  - Bash background execution means running the review without blocking and collecting the output afterwards.
- Record results in the active task's artifact `## Reviews` section with a date; an unrecorded review counts as not done. If this session cannot write files (read-only reviewer context), output the dated review block verbatim so the driving session can append it instead.
- Review-only: report findings and stop. Do not fix, commit, or patch unless the user explicitly asks afterwards.

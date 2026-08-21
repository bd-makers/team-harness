---
name: harness-review
description: Engine-neutral wrapper for running the read-only external review (codex, claude, gemini, or custom engine) of local git state and recording the result in the active task artifact. Use when the user asks for /harness-review, harness review, external code review, or a review of current changes with a specific engine.
---

# Harness Review

Use this skill as the Codex equivalent of Claude Code `/harness-review`.

## Source of Truth

- Read `../../commands/harness-review.md` before acting.
- Follow that command contract, plus `AGENTS.md` review protocol and active task docs when present.
- The engine runner table in that command is the single source for how each engine
  (codex, claude, gemini, custom) is invoked — do not depend on other plugin internals.
- When no engine argument is given, apply the probe fallback chain from the command
  (codex, then gemini, then claude) with `command -v`.
- Translate Claude-only references for Codex:
  - `${CLAUDE_PLUGIN_ROOT}` means this installed plugin root or this repository root.
  - Bash background execution means running the review without blocking and collecting the output afterwards.
- Record results in the active task's artifact `## Reviews` section with a date and the engine that ran; an unrecorded review counts as not done. If this session cannot write files (read-only reviewer context), output the dated review block verbatim so the driving session can append it instead.
- Review-only: report findings and stop. Do not fix, commit, or patch unless the user explicitly asks afterwards.

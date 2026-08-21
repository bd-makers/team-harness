---
name: harness-adversarial-review
description: Engine-neutral wrapper for the adversarial variant of the harness review - it challenges implementation approach and design choices of local git changes with any engine (codex, claude, gemini, custom). Use when the user asks for /harness-adversarial-review, adversarial review, or a review that tries to reject the change.
---

# Harness Adversarial Review

Use this skill as the Codex equivalent of Claude Code `/harness-adversarial-review`.

## Source of Truth

- Read `../../commands/harness-adversarial-review.md` before acting; it inherits the full procedure and engine runner table from `../../commands/harness-review.md` and swaps only the review prompt framing.
- Follow that command contract, plus `AGENTS.md` review protocol and active task docs when present.
- Translate Claude-only references for Codex:
  - `${CLAUDE_PLUGIN_ROOT}` means this installed plugin root or this repository root.
  - Bash background execution means running the review without blocking and collecting the output afterwards.
- Record results in the active task's artifact `## Reviews` section with a date, the engine that ran, and the fact that the framing was adversarial; an unrecorded review counts as not done. If this session cannot write files (read-only reviewer context), output the dated review block verbatim so the driving session can append it instead.
- Review-only: report objections and the verdict, then stop. Do not fix, commit, or patch unless the user explicitly asks afterwards.

---
name: harness-codex-adversarial-review
description: Codex wrapper for the adversarial variant of the harness Codex review - it challenges implementation approach and design choices of local git changes. Use when the user asks for /harness-codex-adversarial-review, adversarial review, or a review that tries to reject the change.
---

# Harness Codex Adversarial Review

Use this skill as the Codex equivalent of Claude Code `/harness-codex-adversarial-review`.

## Source of Truth

- Read `../../commands/harness-codex-adversarial-review.md` before acting; it inherits the full procedure from `../../commands/harness-codex-review.md` and swaps only the review prompt framing.
- Follow that command contract, plus `AGENTS.md` review protocol and active task docs when present.
- The review runner is the `codex exec --sandbox read-only` CLI invocation documented there — do not depend on openai-codex plugin internals.
- Record results in the active task's artifact `## Reviews` section with a date; an unrecorded review counts as not done. If this session cannot write files (read-only reviewer context), output the dated review block verbatim so the driving session can append it instead.
- Review-only: report objections and the verdict, then stop. Do not fix, commit, or patch unless the user explicitly asks afterwards.

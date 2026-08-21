---
name: harness-codex-review
description: Deprecated alias for the engine-neutral harness-review skill - kept one minor version for compatibility. When the user asks for /harness-codex-review or harness codex review, run the harness-review procedure with the codex engine.
---

# Harness Codex Review (deprecated)

This name was merged into the engine-neutral `harness-review` and is kept for one
minor version only. Its former contract lived at `../../commands/harness-codex-review.md`,
which now forwards the same way this skill does.

- Read `../../commands/harness-review.md` and follow that procedure with engine `codex`.
- Argument handling (`--base <ref>`, focus) is unchanged.
- When reporting, add a one-line note that this name is deprecated and `/harness-review codex`
  (or engine auto-selection via `/harness-review`) should be used next time.

---
name: harness-codex-adversarial-review
description: Deprecated alias for the engine-neutral harness-adversarial-review skill - kept one minor version for compatibility. When the user asks for /harness-codex-adversarial-review, run the harness-adversarial-review procedure with the codex engine.
---

# Harness Codex Adversarial Review (deprecated)

This name was merged into the engine-neutral `harness-adversarial-review` and is kept
for one minor version only. Its former contract lived at
`../../commands/harness-codex-adversarial-review.md`, which now forwards the same way
this skill does.

- Read `../../commands/harness-adversarial-review.md` and follow that procedure with engine `codex`.
- Argument handling (`--base <ref>`, focus) is unchanged.
- When reporting, add a one-line note that this name is deprecated and
  `/harness-adversarial-review codex` (or engine auto-selection via
  `/harness-adversarial-review`) should be used next time.

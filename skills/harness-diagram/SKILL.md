---
name: harness-diagram
description: Harness adapter for the active task's spec/plan diagram — generates or refreshes the one diagram artifact for the current harness task under the docs user task directory, enforcing the harness conventions (self-contained inline SVG, generated-not-SSOT status, probe/degrade/record, artifact record). Use when the user asks for /harness-diagram, harness diagram, or the spec/plan diagram of the active harness task. Not a general diagram tool — for a diagram unrelated to an active harness task, use the upstream diagram skill directly.
---

# Harness Diagram

Use this skill as the Codex equivalent of Claude Code `/harness-diagram`.

## Source of Truth

- Read `../../commands/harness-diagram.md` before acting. Follow that command contract.
- The opt-in contract itself (when the question is asked, why plan.md is the state, how a skipped
  step is closed) lives in `../../commands/harness-task.md` — do not restate it, follow it.
- This skill is an **adapter, not a diagram engine.** The harness neither owns nor bundles a
  diagram tool; the marketplace only lists one as a sha-pinned **companion plugin**, and installing
  it is optional. Probe for whatever diagram capability this session actually has, and if there is
  none, skip without failing and record the reason — never hand-write the SVG instead.
- Translate Claude-only references for Codex:
  - `AskUserQuestion` means asking the user once, in plain text, and waiting for the answer.
  - `/diagram-design:diagram-design` means whatever diagram skill this session exposes, if any.
- Output is one file in the active task directory, named after the task with a `-diagram.html`
  suffix. Self-contained inline SVG with no external assets is the requirement, not a default — the
  docs tree is opened in viewers that strip script, so a runtime-JS diagram does not render there.
  The command contract allows one exception, for a project whose viewer is known to run script, and
  only when the reasoning and the viewer checked are recorded in the artifact.
- Record the outcome in the active task's artifact with a date, whether the diagram was produced or
  skipped. An unrecorded run cannot be told apart from a run that never happened.

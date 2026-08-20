---
name: harness-ship
description: Codex wrapper for the pre-PR final documentation pass. Use when the user asks for /harness-ship, harness ship, prepare a PR or MR, or a final spec/plan/artifact update before opening a pull request.
---

# Harness Ship

Use this skill as the Codex equivalent of Claude Code `/harness-ship`.

## Source of Truth

- Read `../../commands/harness-ship.md` before acting.
- Follow that command contract, plus `AGENTS.md` task protocol and the active task docs.
- Ship updates documents only. Do not create a PR/MR, do not push, and do not run task completion —
  it is a separate step the user drives.
- Ship has no CLI subcommand of its own — it is an agent judgement pass over the task documents.
  Use the shared CLI only for what it already owns (for example the task context card check), and
  never invent a ship subcommand for it.
- Translate Claude-only references for Codex:
  - `${CLAUDE_PLUGIN_ROOT}` means this installed plugin root or this repository root.
  - `AskUserQuestion` means ask one concise opt-in question; if this session cannot ask, skip the
    diagram step rather than guessing, and record that it was skipped.
  - The `diagram-design` skill is a Claude Code-only plugin from a separate marketplace and is
    installed per machine. It is not available in Codex, so treat the diagram step as not run,
    record that one line in the artifact, and continue — never fail the pass over it.
- The diagram output belongs at the active task directory and defaults to a self-contained
  inline-SVG HTML file: task documents are often read in viewers that strip script tags (Obsidian,
  for one), where a mermaid JS runtime never renders.
- Finish by reporting PR/MR readiness: branch and base, changed files, verification output, which
  documents were updated, diagram status, and remaining risks. Then stop.

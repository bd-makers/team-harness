---
name: harness-loop
description: Codex wrapper for the optional default implementation loop. Use when the user asks for /harness-loop, harness loop, run the plan with an orchestrator, or a Dev → QA → commit loop over the active task plan.
---

# Harness Loop

Use this skill as the Codex equivalent of Claude Code `/harness-loop`.

## Source of Truth

- Read `../../commands/harness-loop.md` before acting.
- Follow that command contract, plus `AGENTS.md` task protocol and the active task docs.
- The loop has no CLI subcommand of its own — it only chains existing ones (`gate commit`,
  `boundary check`, `scenario check`, `review`). Never invent a loop subcommand.
- A Codex session acting as the loop's orchestrator is experimental: `docs/decisions.md` D2 keeps
  drive with Claude. In v1, Codex's place in the loop is the read-only verifier engine for the
  rubric and R3 reviews. If the user still runs the loop here, say so once and keep these rules:
  - Codex spawns subagents in parallel by default. Spawn one Dev, wait for it, then run the checks —
    sequential order comes from following the command, not from a config switch.
  - If this session cannot spawn subagents, do the Dev work in this session and record `수단 main`.
  - Never commit from the Dev role, never push, and never open a PR.
- Translate Claude-only references for Codex:
  - `${CLAUDE_PLUGIN_ROOT}` means this installed plugin root or this repository root.
  - `AskUserQuestion` means ask one concise question; if this session cannot ask, stop rather than
    guessing between orchestrator and individual mode.

---
name: harness-wiki
description: Codex wrapper for the optional wiki compile. Use when the user asks for /harness-wiki, harness wiki, compile a merged task into the wiki, or turn task decisions and learnings into feature or module wiki entries with PR provenance.
---

# Harness Wiki

Use this skill as the Codex equivalent of Claude Code `/harness-wiki`.

## Source of Truth

- Read `../../commands/harness-wiki.md` before acting.
- Follow that command contract, plus `AGENTS.md` task protocol and the project's `wiki/90_system/` rules.
- Deterministic inputs come only from `harness-team wiki sources --json` (provenance, the exact marker string,
  existing compiles, rule files). Never guess a PR number and never hand-assemble the marker.
- When no PR number is found, the marker cites the commit only (`provenance.pr` is null, no `pr=` key) — this is not a blocker;
  say "PR 없음 — 커밋 출처" in the report, and rerun with `--pr <N>` only if a human confirms the task did land through a PR.
- Stop on any `blockers`, or when `compiled` is not empty and the user did not ask to recompile.
- Never push and never open a PR — the wiki change goes into the post-merge closing commit.
- Translate Claude-only references for Codex:
  - `${CLAUDE_PLUGIN_ROOT}` means this installed plugin root or this repository root.
  - `AskUserQuestion` means ask one concise question; if this session cannot ask, stop rather than guessing.

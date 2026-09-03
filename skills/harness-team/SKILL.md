---
name: harness-team
description: Use the harness-team project workflow from Codex. Trigger when the user asks to initialize, refresh, inspect, repair, release, or operate the Team Harness; create or resume task docs under the docs user task structure; run harness doctor; or work inside a project configured by the Claude Code Team Harness plugin that should also be usable from Codex.
---

# Harness Team

## Overview

Use this skill to operate the shared Team Harness from Codex without forking the Claude Code plugin workflow. The source of truth is the project CLI, `harness-team`, plus the generated `AGENTS.md` and task docs.

## Workflow

1. Inspect the current project before changing files.
2. Read `AGENTS.md` when present.
3. If `.harness/active.json` points to an active task, read that task's `*-plan.md` and relevant `*-spec.md`.
4. If there is no active task and the user is asking for real project work, create or activate a task with `harness-team task <name>` unless the user explicitly wants taskless work.
5. Prefer existing CLI commands over reimplementing harness behavior in the answer.

## Command Use

Run `harness-team` directly when it is on `PATH`.

When working in this plugin source repository, use:

```bash
node bin/harness-team.mjs <command>
```

Common commands:

- `harness-team init --yes`: scaffold a new project, or refresh an existing install (marker-merge; idempotent, keeps user text).
- `harness-team task <name>`: create or activate a task.
- `harness-team list`: list task directories.
- `harness-team doctor --json`: diagnose install health with a structured observation.
- `harness-team done`: complete the active task after the plan and artifact are complete.
- `harness-team retro "<note>"`: append a learning to the active task artifact.
- `harness-team context init` / `context check`: create or validate the active task's Context Card. Agents own this file — update it when the plan's atomic step changes or a reproducible failure appears or clears.
- `harness-team release [patch|minor|major|x.y.z] [--dry-run] [--skip-cache]`: bump the four manifests together (plugin source repo only — run it as `node bin/harness-team.mjs release`). Run `--dry-run` first.

`session-context` and `boundary checkpoint` are invoked by hooks — do not call them directly. `harness-team boundary check` is the user-facing form (compares the JSON Schema boundaries declared in the active spec).

## Output Contract

Prefer `--json` for commands that support it when Codex will parse the result. The JSON envelope uses:

- `status`: `success`, `warning`, or `error`
- `summary`: one-line result
- `next_actions`: follow-up commands or edits
- `artifacts`: generated or modified files
- `error.root_cause`, `error.safe_retry`, `error.stop_condition` on failure

## Platform Boundaries

Do not duplicate Claude Code slash-command behavior inside this skill. Claude Code uses `.claude-plugin/` and `commands/`; Codex uses `.codex-plugin/` and this skill; both should drive the same `bin/`, `src/`, `templates/`, and `AGENTS.md` core.

If `harness-team` is unavailable in a consumer project, report that clearly and suggest installing/linking the CLI or running from this plugin source repo. Do not silently invent a replacement implementation.

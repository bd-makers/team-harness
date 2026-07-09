---
name: harness-codex-sim
description: Run Codex headless L5 harness simulations with `tests/sim/codex-agentloop.mjs`. Use when verifying the Harness AIjient Team Codex plugin, `codex exec` skill activation, JSONL evidence, installed harness task/apply flows, or Codex-specific PASS/FAIL/MANUAL/N/A reports.
---

# /harness-codex-sim — Codex headless L5 simulation

Use this skill to validate the Codex plugin surface of the Team Harness. Keep it
separate from the Claude Code L5 simulation.

## Layer Boundary

- **Claude L5**: `tests/sim/agentloop.mjs`, real `claude -p`, Claude slash
  commands, Claude transcript lookup, SessionStart hook evidence.
- **Codex L5**: `tests/sim/codex-agentloop.mjs`, real `codex exec --json`,
  Codex plugin/skill activation, JSONL event evidence, installed harness
  file/git effects.

Do not score Claude-only signals as Codex failures. SessionStart nudge is `N/A`
for Codex L5. Headless-only blind spots such as PreToolUse protect-files stay
`MANUAL`.

## Phase 0 — Preflight

1. Confirm `../harness-playground` exists. If it is missing, stop gracefully; this
   is a dev-only simulation tool.
2. Confirm `codex` is on `PATH`.
3. Confirm `harness-team` is on `PATH`.
4. Confirm `.codex-plugin/plugin.json` and `skills/harness-team/SKILL.md` are
   present.
5. Run probe before full run.

## Phase 1 — Probe

Run:

```bash
node tests/sim/codex-agentloop.mjs probe
```

Probe validates:

- `codex exec --json` starts in a throwaway sandbox.
- JSONL event stream is parseable even when Codex prints warning noise.
- `thread.started` and `turn.completed` are observable.
- Final prose is captured only as diagnostic output.

If probe fails with auth/login errors, run `codex login` locally or provide
`CODEX_API_KEY` only to the single Codex invocation in CI. Do not export API keys
job-wide around untrusted project code.

## Phase 2 — Full Run

Run:

```bash
node tests/sim/codex-agentloop.mjs run
```

The runner uses throwaway projects under:

```text
../harness-playground/.sim-tmp/<TS>/
```

It writes reports to:

```text
../harness-playground/sim-reports/codex-agentloop-<TS>.md
```

It may write golden snapshots under:

```text
../harness-playground/sim-snapshots/codex/<version>/
```

Full run scenarios use `danger-full-access` inside throwaway `.sim-tmp`
projects. This is intentional: Codex `workspace-write` protects `.git/hooks`,
while installed hook verification needs to create `.git/hooks/post-commit`.
Do not use this runner against a real project directory.

## Evidence Rules

- PASS only from file, git, JSONL event, or hook output evidence.
- Agent final messages are diagnostic only.
- Natural-language trigger reliability is a pass-rate, not a single anecdote.
- If a Codex run fails but direct `harness-team` CLI succeeds, classify it as
  Codex prompt/permission/plugin/sandbox trouble first.
- If both Codex and direct CLI fail, classify it as a real harness CLI/template
  defect candidate.

## Cleanup Checks

After a full run, verify:

- `.sim-tmp/<TS>` was removed.
- Persistent playground projects `rn-app`, `next-app`, and `bare-node` are git
  clean.
- Source repo changes are limited to intentional runner, skill, docs, or tests.

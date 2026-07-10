# codex-command-surface — Handoff

## Status
Diagnosis complete. No behavior code changed.

## Summary
- Compared Claude and Codex plugin manifests.
- Confirmed Claude uses `.claude-plugin/plugin.json` `commands[]` for 16 `/harness-*` slash commands.
- Confirmed Codex uses `.codex-plugin/plugin.json` `skills: "./skills/"`; Claude command files are not mirrored into Codex slash commands.
- Confirmed installed Codex cache for `harness-aijient-team@personal` currently contains only `harness-team` and `harness-sim`; source also has `harness-codex-sim`, so reinstall/new thread is needed to pick that up.
- Added README clarification for Codex skill invocation and the optional wrapper-skill path.

## Next
- For parity UX, design thin Codex skill wrappers for selected `harness-*` operations.
- For current source visibility, update plugin cachebuster and reinstall `harness-aijient-team@personal`, then test in a new Codex thread.

## 2026-07-09T04:25:33.386Z — 완료

태스크 종료.

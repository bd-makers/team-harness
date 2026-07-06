# plugin-hardening — Handoff

(세션 종료 시 post-commit hook이 자동 갱신합니다)

## 2026-07-06T09:38:43.134Z — 9c8ed5e ci: add node --test workflow (Node 18/20 matrix)
.github/workflows/test.yml                         |  33 ++
 docs/chad/chad-handoff.md                          |   2 +-
 docs/chad/chad-task.md                             |   4 +-
 .../chad/plugin-hardening/plugin-hardening-plan.md |  26 ++
 docs/chad/pocock-merge/pocock-merge-handoff.md     |  15 +
 docs/harness-overview.html                         | 478 ++-------------------
 docs/harness-workflow-simulation.html              | 193 ++-------
 docs/task_summary.md                               |   3 +-
 8 files changed, 156 insertions(+), 598 deletions(-)


## 2026-07-06T09:39:03.204Z — f1b1ece docs(plugin-hardening): commit task SSOT (spec/artifact/handoff)
docs/chad/chad-handoff.md                          |   8 +-
 docs/chad/chad-task.md                             |   4 +-
 .../plugin-hardening/plugin-hardening-artifact.md  |  20 +
 .../plugin-hardening/plugin-hardening-handoff.md   |  15 +
 .../chad/plugin-hardening/plugin-hardening-spec.md |  49 +++
 docs/chad/pocock-merge/pocock-merge-handoff.md     |  15 +
 docs/harness-overview.html                         | 478 ++-------------------
 docs/harness-workflow-simulation.html              | 193 ++-------
 docs/task_summary.md                               |   3 +-
 9 files changed, 184 insertions(+), 601 deletions(-)


## 2026-07-06T09:44:21.348Z — 2099f69 fix(hooks): detect package manager from lockfile in pre-commit-check
docs/chad/chad-handoff.md                          |   8 +-
 docs/chad/chad-task.md                             |   4 +-
 .../plugin-hardening/plugin-hardening-artifact.md  |  11 +
 .../plugin-hardening/plugin-hardening-handoff.md   |  13 +
 .../chad/plugin-hardening/plugin-hardening-plan.md |   2 +-
 docs/chad/pocock-merge/pocock-merge-handoff.md     |  15 +
 docs/harness-overview.html                         | 478 ++-------------------
 docs/harness-workflow-simulation.html              | 193 ++-------
 docs/task_summary.md                               |   3 +-
 src/commands/migrate.mjs                           |  39 +-
 templates/.claude/hooks/pre-commit-check.sh        |  68 ++-
 11 files changed, 217 insertions(+), 617 deletions(-)


## 2026-07-06T09:48:27.084Z — e2a5c52 test: add manifest-sync guard for the 4-file command invariant
README.md                                          |   1 +
 docs/chad/chad-handoff.md                          |   8 +-
 docs/chad/chad-task.md                             |   4 +-
 .../plugin-hardening/plugin-hardening-artifact.md  |   2 +
 .../plugin-hardening/plugin-hardening-handoff.md   |  28 ++
 .../chad/plugin-hardening/plugin-hardening-plan.md |   2 +-
 docs/chad/pocock-merge/pocock-merge-handoff.md     |  15 +
 docs/harness-overview.html                         | 478 ++-------------------
 docs/harness-workflow-simulation.html              | 193 ++-------
 docs/task_summary.md                               |   3 +-
 tests/manifest-sync.test.mjs                       |  72 ++++
 11 files changed, 204 insertions(+), 602 deletions(-)


## 2026-07-06T09:48:58.441Z — 9101ba4 docs: add MIT LICENSE file
LICENSE                                            |  21 +
 docs/chad/chad-handoff.md                          |   8 +-
 docs/chad/chad-task.md                             |   4 +-
 .../plugin-hardening/plugin-hardening-handoff.md   |  43 ++
 .../chad/plugin-hardening/plugin-hardening-plan.md |   2 +-
 docs/chad/pocock-merge/pocock-merge-handoff.md     |  15 +
 docs/harness-overview.html                         | 478 ++-------------------
 docs/harness-workflow-simulation.html              | 193 ++-------
 docs/task_summary.md                               |   3 +-
 9 files changed, 165 insertions(+), 602 deletions(-)


## 2026-07-06T10:00:24.816Z — eedbee8 feat(doctor): plugin-dev mode + broken-symlink/backup-dir/cloud-path checks
docs/chad/chad-handoff.md                          |   8 +-
 docs/chad/chad-task.md                             |   4 +-
 .../plugin-hardening/plugin-hardening-artifact.md  |  12 +
 .../plugin-hardening/plugin-hardening-handoff.md   |  56 +++
 .../chad/plugin-hardening/plugin-hardening-plan.md |   4 +-
 docs/chad/pocock-merge/pocock-merge-handoff.md     |  15 +
 docs/harness-overview.html                         | 478 ++-------------------
 docs/harness-workflow-simulation.html              | 193 ++-------
 docs/task_summary.md                               |   3 +-
 src/commands/doctor.mjs                            |  96 ++++-
 src/commands/init.mjs                              |   3 +
 src/harness.mjs                                    |  16 +
 tests/doctor.test.mjs                              |  38 +-
 13 files changed, 302 insertions(+), 624 deletions(-)


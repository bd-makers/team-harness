# global-cli-drift — Handoff

(세션 종료 시 post-commit hook이 자동 갱신합니다)

## 2026-08-13T09:24:31.927Z — e5b832e fix(doctor,release): surface a global CLI that drifted from the install
CHANGELOG.md                                       |   3 +
 MAINTAINING.md                                     |  28 +++
 docs/chad/chad-task.md                             |   1 +
 .../global-cli-drift/global-cli-drift-artifact.md  |  13 ++
 .../global-cli-drift/global-cli-drift-context.md   |  27 +++
 .../global-cli-drift/global-cli-drift-handoff.md   |   3 +
 .../chad/global-cli-drift/global-cli-drift-plan.md |  19 ++
 .../chad/global-cli-drift/global-cli-drift-spec.md |  71 +++++++
 docs/task_summary.md                               |   1 +
 src/commands/doctor.mjs                            |  87 +++++++++
 src/commands/release.mjs                           |  36 +++-
 tests/cli-drift.test.mjs                           | 214 +++++++++++++++++++++
 12 files changed, 502 insertions(+), 1 deletion(-)


## 2026-08-13T09:38:53.147Z — 35a1c9c fix(doctor): correct the drift check per Codex review
CHANGELOG.md                                       |   1 +
 docs/chad/chad-handoff.md                          |   8 +-
 .../global-cli-drift/global-cli-drift-artifact.md  |  58 ++++++++++-
 .../global-cli-drift/global-cli-drift-handoff.md   |  16 +++
 docs/harness-overview.html                         |   5 +
 src/commands/doctor.mjs                            |  69 ++++++++++---
 tests/cli-drift.test.mjs                           | 110 ++++++++++++++++++++-
 7 files changed, 245 insertions(+), 22 deletions(-)


## 2026-08-13T09:42:20.196Z — 1eb9aef test(cli-drift): stop reading the developer's real ~/.claude
docs/chad/chad-handoff.md                          |  2 +-
 .../global-cli-drift/global-cli-drift-handoff.md   | 11 ++++++++++
 tests/cli-drift.test.mjs                           | 24 +++++++++++++++++++++-
 3 files changed, 35 insertions(+), 2 deletions(-)


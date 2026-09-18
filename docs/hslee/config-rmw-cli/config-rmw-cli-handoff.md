# config-rmw-cli — Handoff

(세션 종료 시 post-commit hook이 자동 갱신합니다)

## 2026-09-18T14:18:50.863Z — 7365800 feat(config-rmw-cli): .harness/config.json read-modify-write 를 harness-team config 로 이관
CHANGELOG.md                                       |   9 +
 bin/harness-team.mjs                               |   6 +-
 commands/harness-spec.md                           |  21 +-
 docs/harness-overview.html                         |  10 +
 .../config-rmw-cli/config-rmw-cli-artifact.md      | 120 ++++++++++
 .../hslee/config-rmw-cli/config-rmw-cli-context.md |  27 +++
 .../hslee/config-rmw-cli/config-rmw-cli-handoff.md |   3 +
 docs/hslee/config-rmw-cli/config-rmw-cli-meta.json |  48 ++++
 docs/hslee/config-rmw-cli/config-rmw-cli-plan.md   |  27 +++
 docs/hslee/config-rmw-cli/config-rmw-cli-spec.md   |  86 +++++++
 skills/harness-team/SKILL.md                       |   1 +
 src/cli-args.mjs                                   |   5 +-
 src/commands/config.mjs                            | 160 +++++++++++++
 src/user-config.mjs                                |  85 ++++++-
 tests/cli-args.test.mjs                            |   2 +-
 tests/config-command.test.mjs                      | 251 +++++++++++++++++++++
 16 files changed, 844 insertions(+), 17 deletions(-)

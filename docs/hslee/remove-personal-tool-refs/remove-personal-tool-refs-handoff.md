# remove-personal-tool-refs — Handoff

(세션 종료 시 post-commit hook이 자동 갱신합니다)

## 2026-10-05T07:14:35.759Z — 785aa3f chore: 개인 도구 흔적을 팀 하네스에서 제거한다
CHANGELOG.md                                       |  16 +-
 MAINTAINING.md                                     |   9 -
 README.md                                          |  10 -
 commands/harness-clone.md                          |   6 -
 commands/harness-comptest.md                       |   6 -
 commands/harness-contrarian.md                     |   6 -
 commands/harness-delete.md                         |   6 -
 commands/harness-doctor.md                         |   6 -
 commands/harness-interview.md                      |   6 -
 commands/harness-inttest.md                        |   6 -
 commands/harness-migrate.md                        |   6 -
 commands/harness-release.md                        |   6 -
 commands/harness-retro.md                          |   6 -
 commands/harness-ship.md                           |   1 -
 commands/harness-sim.md                            |   6 -
 commands/harness-simplifier.md                     |   6 -
 commands/harness-spec.md                           |   6 -
 commands/harness-symlink.md                        |   6 -
 commands/harness-sync.md                           |   6 -
 commands/harness-task.md                           |   6 -
 commands/harness-unittest.md                       |   6 -
 commands/harness-upgrade.md                        |   6 -
 docs/ao-worker-rules.md                            |  99 ---
 docs/followups.md                                  |   3 -
 docs/harness-fleet-guide.html                      | 693 ---------------------
 docs/harness-task-guide.html                       |   2 +-
 .../remove-personal-tool-refs-artifact.md          |  19 +
 .../remove-personal-tool-refs-context.md           |  23 +
 .../remove-personal-tool-refs-handoff.md           |   3 +
 .../remove-personal-tool-refs-meta.json            |  11 +
 .../remove-personal-tool-refs-plan.md              |  22 +
 .../remove-personal-tool-refs-spec.md              |  63 ++
 docs/index.html                                    |  14 -
 docs/prerequisites.md                              |  12 +-
 .../plans/2026-04-23-backup-scripts-as-commands.md |   9 -
 .../plans/2026-04-27-symlink-migration-support.md  |   9 -
 .../2026-05-28-charness-benchmark-improvements.md  |   9 -
 .../plans/2026-05-28-consolidated-0.7.0.md         |   9 -
 .../2026-05-28-ouroboros-inspired-spec-first.md    |   9 -
 .../plans/2026-05-28-release-sync-automation.md    |   9 -
 .../plans/2026-05-29-0.8.0-improvements.md         |   9 -
 ...2026-04-23-backup-scripts-as-commands-design.md |   9 -
 .../2026-06-02-stack-declaration-gate-design.md    |   9 -
 src/harness.mjs                                    |   2 -
 templates/docs/README.md                           |   9 -
 45 files changed, 150 insertions(+), 1050 deletions(-)

## 2026-10-05T07:15:01.150Z — 44586c4 chore(task): remove-personal-tool-refs plan·handoff 갱신 (PR #120)
.../remove-personal-tool-refs-handoff.md           | 48 ++++++++++++++++++++++
 .../remove-personal-tool-refs-plan.md              |  2 +-
 2 files changed, 49 insertions(+), 1 deletion(-)

## 2026-10-05T08:24:05.752Z — 3aa41f4 chore: harness-init 명령의 Obsidian frontmatter도 제거한다
CHANGELOG.md                                                        | 2 +-
 commands/harness-init.md                                            | 6 ------
 .../remove-personal-tool-refs/remove-personal-tool-refs-artifact.md | 2 ++
 .../remove-personal-tool-refs/remove-personal-tool-refs-handoff.md  | 5 +++++
 .../remove-personal-tool-refs/remove-personal-tool-refs-plan.md     | 2 +-
 .../remove-personal-tool-refs/remove-personal-tool-refs-spec.md     | 2 +-
 6 files changed, 10 insertions(+), 9 deletions(-)

## 2026-10-05T11:02:10.528Z — 완료

태스크 종료.

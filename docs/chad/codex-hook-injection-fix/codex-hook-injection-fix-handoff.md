# codex-hook-injection-fix — Handoff

(세션 종료 시 post-commit hook이 자동 갱신합니다)

## 2026-09-11T16:58:02.562Z — 814ea37 fix(codex): 설치된 훅이 아무것도 주입하지 않던 것을 고친다 — 0.38.3
.claude-plugin/marketplace.json                    |   2 +-
 .claude-plugin/plugin.json                         |   2 +-
 .codex-plugin/plugin.json                          |   2 +-
 .codex/hooks.json                                  |   2 +-
 CHANGELOG.md                                       |  18 ++
 README.md                                          |  13 +-
 .../codex-hook-injection-fix-artifact.md           | 185 +++++++++++
 .../codex-hook-injection-fix-context.md            |  27 ++
 .../codex-hook-injection-fix-handoff.md            |   3 +
 .../codex-hook-injection-fix-meta.json             |  39 +++
 .../codex-hook-injection-fix-plan.md               |  23 ++
 .../codex-hook-injection-fix-spec.md               |  51 +++
 docs/followups.md                                  |  34 +-
 docs/harness-overview.html                         |  13 +-
 docs/harness-overview.template.html                |   8 +-
 docs/index.html                                    |   1 +
 docs/what-changes-0.38.3.html                      | 341 +++++++++++++++++++++
 docs/what-changes-latest-version.html              | 107 +++----
 package.json                                       |   2 +-
 src/cli-args.mjs                                   |   5 +-
 src/commands/doctor.mjs                            |  99 +++++-
 src/commands/migrate.mjs                           |  56 +++-
 src/commands/session-context.mjs                   |  26 +-
 src/harness.mjs                                    |  43 ++-
 templates/.codex/hooks.json                        |   2 +-
 tests/codex-hook-injection.test.mjs                | 233 ++++++++++++++
 tests/codex-hooks.test.mjs                         |   4 +-
 tests/e2e/sandbox.mjs                              |   4 +
 28 files changed, 1254 insertions(+), 91 deletions(-)

## 2026-09-11T17:03:37.072Z — 72409e3 chore(task): codex-hook-injection-fix plan 종결
docs/chad/codex-hook-injection-fix/codex-hook-injection-fix-plan.md | 4 ++--
 1 file changed, 2 insertions(+), 2 deletions(-)

## 2026-09-11T17:03:37.276Z — 완료

태스크 종료.

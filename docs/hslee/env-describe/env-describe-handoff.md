# env-describe — Handoff

(세션 종료 시 post-commit hook이 자동 갱신합니다)

## 2026-11-02T16:16:20.310Z — 09a2d4f feat(stack): lockfile을 지키는 bootstrap 명령과 Python pm 감지
AGENTS.md                                        |   1 +
 CHANGELOG.md                                     |   4 +
 docs/hslee/env-describe/env-describe-artifact.md |  44 ++++++++
 docs/hslee/env-describe/env-describe-context.md  |  24 ++++
 docs/hslee/env-describe/env-describe-handoff.md  |   3 +
 docs/hslee/env-describe/env-describe-meta.json   |  23 ++++
 docs/hslee/env-describe/env-describe-plan.md     |  27 +++++
 docs/hslee/env-describe/env-describe-spec.md     | 137 +++++++++++++++++++++++
 src/commands/stack.mjs                           |   1 +
 src/detect-stack.mjs                             |  39 +++++--
 src/presets.mjs                                  |   7 ++
 templates/AGENTS.md.hbs                          |   1 +
 templates/presets/node.json                      |  11 ++
 templates/presets/python.json                    |  10 ++
 tests/detect-stack.test.mjs                      |  40 ++++++-
 tests/detect-testing.test.mjs                    |   9 ++
 16 files changed, 372 insertions(+), 9 deletions(-)

## 2026-11-02T16:25:00.956Z — 완료

태스크 종료.

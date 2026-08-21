# hook-jq-failclosed — Handoff

(세션 종료 시 post-commit hook이 자동 갱신합니다)

## 2026-08-21T06:18:45.531Z — 5dd7d37 fix(hooks): jq 부재 시 훅 4개가 조용히 무력화되던 fail-open 수정
CHANGELOG.md                                       |  18 ++
 .../hook-jq-failclosed-artifact.md                 | 112 +++++++
 .../hook-jq-failclosed-context.md                  |  31 ++
 .../hook-jq-failclosed-handoff.md                  |   3 +
 .../hook-jq-failclosed-meta.json                   |   7 +
 .../hook-jq-failclosed/hook-jq-failclosed-plan.md  |  27 ++
 .../hook-jq-failclosed/hook-jq-failclosed-spec.md  | 121 ++++++++
 src/commands/doctor.mjs                            |  19 +-
 templates/.claude/hooks/auto-format.sh             |  27 +-
 templates/.claude/hooks/block-dangerous-git.sh     |  40 ++-
 templates/.claude/hooks/pre-commit-check.sh        |  57 +++-
 templates/.claude/hooks/protect-files.sh           |  27 +-
 tests/doctor.test.mjs                              |  22 +-
 tests/hooks-jq-fallback.test.mjs                   | 331 +++++++++++++++++++++
 14 files changed, 822 insertions(+), 20 deletions(-)


## 2026-08-21T06:18:49.021Z — 8db2c8e fix(hooks): jq 부재 시 훅 4개가 조용히 무력화되던 fail-open 수정
CHANGELOG.md                                       |  18 ++
 docs/chad/chad-handoff.md                          |   8 +-
 .../hook-jq-failclosed-artifact.md                 | 112 +++++++
 .../hook-jq-failclosed-context.md                  |  31 ++
 .../hook-jq-failclosed-handoff.md                  |  21 ++
 .../hook-jq-failclosed-meta.json                   |   7 +
 .../hook-jq-failclosed/hook-jq-failclosed-plan.md  |  27 ++
 .../hook-jq-failclosed/hook-jq-failclosed-spec.md  | 121 ++++++++
 src/commands/doctor.mjs                            |  19 +-
 templates/.claude/hooks/auto-format.sh             |  27 +-
 templates/.claude/hooks/block-dangerous-git.sh     |  40 ++-
 templates/.claude/hooks/pre-commit-check.sh        |  57 +++-
 templates/.claude/hooks/protect-files.sh           |  27 +-
 tests/doctor.test.mjs                              |  22 +-
 tests/hooks-jq-fallback.test.mjs                   | 331 +++++++++++++++++++++
 15 files changed, 844 insertions(+), 24 deletions(-)


## 2026-08-21T06:24:36.639Z — 8db2c8e fix(hooks): jq 부재 시 훅 4개가 조용히 무력화되던 fail-open 수정
CHANGELOG.md                                       |  18 ++
 docs/chad/chad-handoff.md                          |   8 +-
 .../hook-jq-failclosed-artifact.md                 | 118 +++++++
 .../hook-jq-failclosed-context.md                  |  31 ++
 .../hook-jq-failclosed-handoff.md                  |  40 +++
 .../hook-jq-failclosed-meta.json                   |   7 +
 .../hook-jq-failclosed/hook-jq-failclosed-plan.md  |  27 ++
 .../hook-jq-failclosed/hook-jq-failclosed-spec.md  | 121 +++++++
 docs/harness-overview.html                         |   5 +
 src/commands/doctor.mjs                            |  19 +-
 templates/.claude/hooks/auto-format.sh             |  27 +-
 templates/.claude/hooks/block-dangerous-git.sh     |  40 ++-
 templates/.claude/hooks/pre-commit-check.sh        |  57 +++-
 templates/.claude/hooks/protect-files.sh           |  27 +-
 tests/doctor.test.mjs                              |  22 +-
 tests/hooks-jq-fallback.test.mjs                   | 356 +++++++++++++++++++++
 16 files changed, 899 insertions(+), 24 deletions(-)


## 2026-08-21T06:24:37.376Z — 78b8c7f fix(hooks): jq 부재 시 훅 4개가 조용히 무력화되던 fail-open 수정
CHANGELOG.md                                       |  18 ++
 docs/chad/chad-handoff.md                          |   8 +-
 .../hook-jq-failclosed-artifact.md                 | 118 +++++++
 .../hook-jq-failclosed-context.md                  |  31 ++
 .../hook-jq-failclosed-handoff.md                  |  60 ++++
 .../hook-jq-failclosed-meta.json                   |   7 +
 .../hook-jq-failclosed/hook-jq-failclosed-plan.md  |  27 ++
 .../hook-jq-failclosed/hook-jq-failclosed-spec.md  | 121 +++++++
 docs/harness-overview.html                         |   5 +
 src/commands/doctor.mjs                            |  19 +-
 templates/.claude/hooks/auto-format.sh             |  27 +-
 templates/.claude/hooks/block-dangerous-git.sh     |  40 ++-
 templates/.claude/hooks/pre-commit-check.sh        |  57 +++-
 templates/.claude/hooks/protect-files.sh           |  27 +-
 tests/doctor.test.mjs                              |  22 +-
 tests/hooks-jq-fallback.test.mjs                   | 356 +++++++++++++++++++++
 16 files changed, 919 insertions(+), 24 deletions(-)


## 2026-08-21T06:24:46.033Z — 8f4565f fix(hooks): jq 부재 시 훅 4개가 조용히 무력화되던 fail-open 수정
CHANGELOG.md                                       |  18 ++
 docs/chad/chad-handoff.md                          |   8 +-
 .../hook-jq-failclosed-artifact.md                 | 118 +++++++
 .../hook-jq-failclosed-context.md                  |  31 ++
 .../hook-jq-failclosed-handoff.md                  |  80 +++++
 .../hook-jq-failclosed-meta.json                   |   7 +
 .../hook-jq-failclosed/hook-jq-failclosed-plan.md  |  27 ++
 .../hook-jq-failclosed/hook-jq-failclosed-spec.md  | 121 +++++++
 docs/harness-overview.html                         |   5 +
 src/commands/doctor.mjs                            |  19 +-
 templates/.claude/hooks/auto-format.sh             |  27 +-
 templates/.claude/hooks/block-dangerous-git.sh     |  40 ++-
 templates/.claude/hooks/pre-commit-check.sh        |  57 +++-
 templates/.claude/hooks/protect-files.sh           |  27 +-
 tests/doctor.test.mjs                              |  22 +-
 tests/hooks-jq-fallback.test.mjs                   | 356 +++++++++++++++++++++
 16 files changed, 939 insertions(+), 24 deletions(-)


## 2026-08-21T06:26:49.489Z — 954c9f6 docs(task): CI 결과 반영 — GNU grep 이식성 확인, PR #29 기록
docs/chad/chad-handoff.md                            |  2 +-
 .../hook-jq-failclosed-artifact.md                   | 10 +++++++---
 .../hook-jq-failclosed/hook-jq-failclosed-handoff.md | 20 ++++++++++++++++++++
 3 files changed, 28 insertions(+), 4 deletions(-)


## 2026-08-21T06:27:15.538Z — 774af5d chore(handoff): post-commit 자동 갱신 반영
docs/chad/chad-handoff.md                                  | 2 +-
 docs/chad/hook-jq-failclosed/hook-jq-failclosed-handoff.md | 7 +++++++
 2 files changed, 8 insertions(+), 1 deletion(-)


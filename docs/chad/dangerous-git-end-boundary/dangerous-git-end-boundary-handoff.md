# dangerous-git-end-boundary — Handoff

(세션 종료 시 post-commit hook이 자동 갱신합니다)

## 2026-09-13T04:19:36.551Z — a4e45a3 fix(hooks): block-dangerous-git 토큰 경계를 "비단어 문자 전부"로 — `push --force;echo` 우회 차단
.../dangerous-git-end-boundary-artifact.md         |  14 +++
 .../dangerous-git-end-boundary-context.md          |  27 +++++
 .../dangerous-git-end-boundary-handoff.md          |   3 +
 .../dangerous-git-end-boundary-meta.json           |  11 ++
 .../dangerous-git-end-boundary-plan.md             |  18 ++++
 .../dangerous-git-end-boundary-spec.md             |  45 ++++++++
 src/commands/migrate.mjs                           |   1 +
 templates/.claude/hooks/block-dangerous-git.sh     |   8 +-
 tests/fixtures/stock-hooks/README.md               |   3 +
 .../pre-end-boundary/block-dangerous-git.sh        | 120 +++++++++++++++++++++
 tests/hooks-jq-fallback.test.mjs                   |   6 ++
 tests/migrate-hooks.test.mjs                       |   2 +-
 12 files changed, 254 insertions(+), 4 deletions(-)

## 2026-09-13T04:24:57.231Z — 3f287c5 fix(hooks): codex 리뷰 P1 — restore 허용 판정은 공백·끝만 경계로 (SAFE_END)
.../dangerous-git-end-boundary-artifact.md           | 20 ++++++++++++++++++++
 .../dangerous-git-end-boundary-meta.json             | 12 +++++++++++-
 docs/harness-overview.html                           |  5 +++++
 templates/.claude/hooks/block-dangerous-git.sh       |  6 +++++-
 tests/hooks-jq-fallback.test.mjs                     |  5 +++++
 5 files changed, 46 insertions(+), 2 deletions(-)

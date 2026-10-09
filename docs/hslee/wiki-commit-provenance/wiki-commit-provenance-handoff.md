# wiki-commit-provenance — Handoff

(세션 종료 시 post-commit hook이 자동 갱신합니다)

## 2026-10-09T13:03:28.146Z — 40f056a feat(wiki): PR 없는 저장소는 커밋 출처로 위키 마커를 만든다
CHANGELOG.md                                       |   7 +
 README.md                                          |   2 +-
 commands/harness-wiki.md                           |   4 +-
 docs/harness-cycle.md                              |   2 +-
 .../wiki-commit-provenance-artifact.md             |  20 +++
 .../wiki-commit-provenance-context.md              |  22 +++
 .../wiki-commit-provenance-handoff.md              |   3 +
 .../wiki-commit-provenance-meta.json               |  11 ++
 .../wiki-commit-provenance-plan.md                 |  25 +++
 .../wiki-commit-provenance-spec.md                 | 189 +++++++++++++++++++++
 skills/harness-wiki/SKILL.md                       |   2 +
 src/commands/wiki.mjs                              |  15 +-
 tests/wiki-command.test.mjs                        |   4 +-
 tests/wiki.test.mjs                                |  54 ++++--
 14 files changed, 338 insertions(+), 22 deletions(-)

## 2026-10-09T13:05:43.133Z — d6da220 docs(task): wiki-commit-provenance R2 1차 기록·증거 보강
.../wiki-commit-provenance-artifact.md             | 31 ++++++++++++++++++++++
 .../wiki-commit-provenance-handoff.md              | 17 ++++++++++++
 .../wiki-commit-provenance-meta.json               | 12 ++++++++-
 3 files changed, 59 insertions(+), 1 deletion(-)

## 2026-10-09T13:07:18.078Z — 25357cc docs(task): wiki-commit-provenance R2 기록
.../wiki-commit-provenance-artifact.md              | 21 +++++++++++++++++++++
 .../wiki-commit-provenance-meta.json                |  9 +++++++++
 2 files changed, 30 insertions(+)

## 2026-10-09T13:08:39.324Z — e7df93d docs(task): wiki-commit-provenance R3 기록·학습
.../wiki-commit-provenance-artifact.md             | 23 ++++++++++++++++++++++
 .../wiki-commit-provenance-meta.json               |  9 +++++++++
 .../wiki-commit-provenance-plan.md                 |  2 +-
 3 files changed, 33 insertions(+), 1 deletion(-)

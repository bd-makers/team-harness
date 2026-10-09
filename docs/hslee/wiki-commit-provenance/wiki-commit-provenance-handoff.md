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

## 2026-10-09T13:10:17.151Z — 1db2e05 docs(task): wiki-commit-provenance ship 준비
docs/hslee/wiki-commit-provenance/wiki-commit-provenance-plan.md | 2 +-
 docs/hslee/wiki-commit-provenance/wiki-commit-provenance-spec.md | 2 ++
 2 files changed, 3 insertions(+), 1 deletion(-)

## 2026-10-09T13:19:12.477Z — 6432e44 fix(wiki): 커밋 출처는 task 폴더를 마지막으로 건드린 종결 커밋을 가리킨다
CHANGELOG.md                                       |  3 ++-
 docs/chad/wiki-compile/wiki-compile-spec.md        |  5 ++--
 .../wiki-commit-provenance-artifact.md             |  9 +++++++
 .../wiki-commit-provenance-plan.md                 |  5 +++-
 .../wiki-commit-provenance-spec.md                 | 28 +++++++++++++---------
 src/commands/wiki.mjs                              | 19 +++++++++++++--
 tests/wiki.test.mjs                                | 27 ++++++++++++++++++---
 7 files changed, 76 insertions(+), 20 deletions(-)

## 2026-10-09T13:21:25.728Z — 18c414f fix(test): 정정한 wiki-compile S3 증거가 두 실행을 모두 단언한다
docs/chad/wiki-compile/wiki-compile-spec.md         |  4 ++--
 .../wiki-commit-provenance-artifact.md              | 21 +++++++++++++++++++++
 .../wiki-commit-provenance-meta.json                |  9 +++++++++
 .../wiki-commit-provenance-spec.md                  |  2 +-
 tests/wiki.test.mjs                                 |  8 +++++++-
 5 files changed, 40 insertions(+), 4 deletions(-)

## 2026-10-09T13:23:17.825Z — 00a87c4 docs(task): wiki-commit-provenance R3 재리뷰 기록
.../wiki-commit-provenance-artifact.md               | 20 ++++++++++++++++++++
 .../wiki-commit-provenance-meta.json                 |  9 +++++++++
 .../wiki-commit-provenance-plan.md                   |  2 +-
 .../wiki-commit-provenance-spec.md                   |  4 ++--
 4 files changed, 32 insertions(+), 3 deletions(-)

## 2026-10-09T14:11:03.394Z — 821b5b9 docs(task): PR #138 기록 — 리뷰 덱 미실행(스킬 없음)
docs/hslee/wiki-commit-provenance/wiki-commit-provenance-plan.md | 2 +-
 1 file changed, 1 insertion(+), 1 deletion(-)

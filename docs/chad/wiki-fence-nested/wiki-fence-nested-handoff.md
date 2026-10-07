# wiki-fence-nested — Handoff

(세션 종료 시 post-commit hook이 자동 갱신합니다)

## 2026-10-07T07:16:34.006Z — 6f9498e fix(wiki): 인용문·목록 안 펜스의 예시 마커를 compiled로 세지 않는다
.../wiki-fence-nested-artifact.md                  | 48 +++++++++++++
 .../wiki-fence-nested/wiki-fence-nested-context.md | 24 +++++++
 .../wiki-fence-nested/wiki-fence-nested-handoff.md |  3 +
 .../wiki-fence-nested/wiki-fence-nested-meta.json  | 11 +++
 .../wiki-fence-nested/wiki-fence-nested-plan.md    | 19 +++++
 .../wiki-fence-nested/wiki-fence-nested-spec.md    | 80 ++++++++++++++++++++++
 src/commands/wiki.mjs                              | 51 ++++++++++----
 tests/wiki.test.mjs                                | 35 ++++++++++
 8 files changed, 258 insertions(+), 13 deletions(-)

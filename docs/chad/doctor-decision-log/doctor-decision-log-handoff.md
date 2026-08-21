# doctor-decision-log — Handoff

(세션 종료 시 post-commit hook이 자동 갱신합니다)

## 2026-08-21T06:54:13.437Z — f137448 feat(doctor): docs/decisions.md D2/D4/D5 존재 검사 추가 (skipExisting 전파 갭 경고)
docs/harness-overview.html  |  5 ++++
 src/commands/doctor.mjs     | 39 +++++++++++++++++++++++++-
 templates/docs/decisions.md | 33 ++++++++++++++++++++++
 tests/doctor.test.mjs       | 67 ++++++++++++++++++++++++++++++++++++++++++++-
 4 files changed, 142 insertions(+), 2 deletions(-)


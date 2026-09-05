# doctor-decision-headings — Handoff

(세션 종료 시 post-commit hook이 자동 갱신합니다)

## 2026-09-05T04:56:14.304Z — dc48bf3 fix(doctor): 결정 로그 검사에 D6·D7 추가 — 절 ID는 상수에서 파생, 드리프트 가드 테스트
CHANGELOG.md                |  6 ++++++
 docs/decisions.md           |  2 +-
 src/commands/doctor.mjs     | 13 ++++++++-----
 templates/docs/decisions.md |  2 +-
 tests/doctor.test.mjs       | 29 +++++++++++++++++++++++++++--
 5 files changed, 43 insertions(+), 9 deletions(-)

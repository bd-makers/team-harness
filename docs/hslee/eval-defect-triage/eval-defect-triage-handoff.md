# eval-defect-triage — Handoff

(세션 종료 시 post-commit hook이 자동 갱신합니다)

## 2026-11-01T05:11:14.828Z — 0e7644d fix(commands): plugin eval 결함 후보 4건 수정 (simplifier·inttest·contrarian·interview)
commands/harness-contrarian.md                     |  4 +-
 commands/harness-interview.md                      |  4 +-
 commands/harness-inttest.md                        |  4 +-
 commands/harness-simplifier.md                     |  6 ++-
 .../eval-defect-triage-artifact.md                 | 29 ++++++++++
 .../eval-defect-triage-context.md                  | 23 ++++++++
 .../eval-defect-triage-handoff.md                  |  3 ++
 .../eval-defect-triage-meta.json                   | 11 ++++
 .../eval-defect-triage/eval-defect-triage-plan.md  | 21 ++++++++
 .../eval-defect-triage/eval-defect-triage-spec.md  | 62 ++++++++++++++++++++++
 tests/agent-files.test.mjs                         | 33 ++++++++++++
 11 files changed, 195 insertions(+), 5 deletions(-)

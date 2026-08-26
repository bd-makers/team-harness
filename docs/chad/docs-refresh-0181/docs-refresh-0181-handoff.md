# docs-refresh-0181 — Handoff

(세션 종료 시 post-commit hook이 자동 갱신합니다)

## 2026-08-26T02:55:45.217Z — 5e1d861 docs: 첨부 문서 3종을 0.18.1 기준으로 갱신
.../docs-refresh-0181-artifact.md                  |   70 +
 .../docs-refresh-0181/docs-refresh-0181-context.md |   27 +
 .../docs-refresh-0181/docs-refresh-0181-handoff.md |    3 +
 .../docs-refresh-0181/docs-refresh-0181-meta.json  |    7 +
 .../docs-refresh-0181/docs-refresh-0181-plan.md    |   24 +
 .../docs-refresh-0181/docs-refresh-0181-spec.md    |   96 +
 docs/harness-fleet-guide.html                      |   75 +-
 docs/harness-overview-0.18.1.html                  | 2306 ++++++++++++++++++++
 docs/harness-overview.html                         |   27 +-
 docs/harness-overview.template.html                |   27 +-
 docs/harness-workflow-simulation-0.18.1.html       |  926 ++++++++
 docs/harness-workflow-simulation.html              |  208 +-
 12 files changed, 3728 insertions(+), 68 deletions(-)

## 2026-08-26T02:55:58.852Z — e4bc852 chore(handoff): post-commit hook 출력 반영
docs/chad/chad-handoff.md                                |  6 +++---
 docs/chad/docs-refresh-0181/docs-refresh-0181-handoff.md | 15 +++++++++++++++
 2 files changed, 18 insertions(+), 3 deletions(-)

## 2026-08-26T03:07:37.655Z — 013fb3d docs(review): codex 리뷰 P2 2건·P3 2건 조치
docs/chad/chad-handoff.md                          |  2 +-
 .../docs-refresh-0181-artifact.md                  | 19 +++++++++++++++++-
 .../docs-refresh-0181/docs-refresh-0181-handoff.md |  5 +++++
 .../docs-refresh-0181/docs-refresh-0181-plan.md    |  4 ++--
 docs/diagrams/harness-overview/task-files.mmd      | 10 ++++++++--
 docs/diagrams/harness-overview/task-lifecycle.mmd  | 13 +++++++-----
 docs/harness-fleet-guide.html                      |  8 +++++---
 docs/harness-overview-0.18.1.html                  | 23 +++++++++++++++-------
 docs/harness-overview.html                         | 23 +++++++++++++++-------
 docs/harness-workflow-simulation-0.18.1.html       |  2 +-
 docs/harness-workflow-simulation.html              |  2 +-
 11 files changed, 81 insertions(+), 30 deletions(-)

## 2026-08-26T03:07:52.135Z — 8df10c6 chore(handoff): post-commit hook 출력 반영
docs/chad/chad-handoff.md                                |  2 +-
 docs/chad/docs-refresh-0181/docs-refresh-0181-handoff.md | 14 ++++++++++++++
 2 files changed, 15 insertions(+), 1 deletion(-)

## 2026-08-26T03:13:33.068Z — 30535d5 docs(review): 사전 렌더 SVG 캡션 정합 + mermaid 전례 없는 구문 제거
docs/chad/chad-handoff.md                          |  2 +-
 .../docs-refresh-0181-artifact.md                  | 40 ++++++++++++++++++++++
 .../docs-refresh-0181/docs-refresh-0181-handoff.md |  5 +++
 docs/diagrams/harness-overview/task-files.mmd      |  2 +-
 docs/harness-overview-0.18.1.html                  |  2 +-
 docs/harness-overview.html                         |  2 +-
 docs/harness-workflow-simulation-0.18.1.html       |  2 +-
 docs/harness-workflow-simulation.html              |  2 +-
 8 files changed, 51 insertions(+), 6 deletions(-)

## 2026-08-26T03:13:36.755Z — 1290dc0 chore(handoff): post-commit hook 출력 반영
docs/chad/chad-handoff.md                                |  2 +-
 docs/chad/docs-refresh-0181/docs-refresh-0181-handoff.md | 11 +++++++++++
 2 files changed, 12 insertions(+), 1 deletion(-)

## 2026-08-26T04:14:32.521Z — 7d1e566 docs: harness-task-guide를 0.18.1 기준으로 갱신
docs/chad/chad-handoff.md                          |   2 +-
 .../docs-refresh-0181-artifact.md                  |  34 +++++-
 .../docs-refresh-0181/docs-refresh-0181-handoff.md |   5 +
 .../docs-refresh-0181/docs-refresh-0181-plan.md    |   2 +
 .../docs-refresh-0181/docs-refresh-0181-spec.md    |  13 +-
 docs/harness-fleet-guide.html                      |   2 +-
 docs/harness-task-guide.html                       | 133 ++++++++++++++++-----
 7 files changed, 154 insertions(+), 37 deletions(-)

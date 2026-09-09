# observe-surfacing — Artifact

*최종 결과물과 학습 내용을 기록한다.*

## 결과


- 2026-09-09 plan 5 실측(scratch 소비자 디렉터리에 실제 훅 `observeToolEvent`로 같은 도구 3회 실패를 심음):
  `observe --target` → `✗ repeat-failure-3x: fired` + `next:` nudge · `doctor --target` → `⚠️ observe 트립와이어 발화:
  repeat-failure-3x(session … shell ×3 …) — harness-team observe로 상세 확인; <nudge>` 1줄(warn) ·
  `session-context`(cwd=scratch) → 무활성 nudge 뒤 `[harness] ⚠ observe 트립와이어 발화: repeat-failure-3x (창
  2026-09-03→2026-09-09) — …` 정확히 1줄. 이 저장소 자체(`.harness/observability` 없음, D7)에서는 doctor·session-context
  모두 표면화 줄 0 — 처음 grep이 1을 센 것은 활성 task TCC 본문의 "observe 트립와이어" 문구였다(오탐, 접두 정확 매치로 재확인).

## Reviews
*Codex 등 리뷰 실행 시 결과(요약·발견·조치)를 날짜와 함께 남긴다. 남기지 않은 리뷰는 "안 한 것"으로 간주.*
*기계 판독용 마커를 함께 남긴다: `<!-- harness:review kind=codex scope=worktree tip=<sha|none> at=<ISO8601> -->`*


## Learnings


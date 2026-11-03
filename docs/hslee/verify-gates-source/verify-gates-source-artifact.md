# verify-gates-source — Artifact

*최종 결과물과 학습 내용을 기록한다.*

## 결과
2026-11-04 — `/verify`(소비자 템플릿 스킬)가 `.harness/gates.json` `commit`을 정본으로 읽어 전부 실행·각각 보고한다. 깨진 gates.json은 설정 오류, 없을 때만 `## 명령`.
직전 판(sha `65a3f469…`)을 stock으로 등록해 `migrate` 템플릿 refresh가 손대지 않은 설치본을 갱신한다. AGENTS.md 무변경. 출처: task `subsystem-audit` 후보 A.

## Reviews
*Codex 등 리뷰 실행 시 결과(요약·발견·조치)를 날짜와 함께 남긴다. 남기지 않은 리뷰는 "안 한 것"으로 간주.*
*기계 판독용 마커를 함께 남긴다: `<!-- harness:review kind=codex scope=worktree tip=<sha|none> at=<ISO8601> -->`*

- 아직 없음 — R3 리뷰는 PR 전에.

## Learnings
- **"정본 하나"는 명령 목록만이 아니라 실행 의미까지 같아야 한다고 봤지만, 게이트의 실행 의미(바뀐 workspace만·첫 실패에서 멈춤)는 전체 검증과 목적이 다르다** — 목록은 공유하고 실행은 스킬이 한다.
- stock 완전성 가드는 HEAD 기준이라 템플릿을 고친 커밋 **전**에는 실패한다 — 커밋 뒤에 돌린다.

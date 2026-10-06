# default-loop-skill — Artifact

*최종 결과물과 학습 내용을 기록한다.*

## 결과

- 다이어그램: docs/chad/default-loop-skill/default-loop-skill-diagram.html 생성 — inline SVG swimlane — 브라우저 pane 렌더 확인, 텍스트 경계 JS 검증 (2026-10-06)
- 루프 dogfood 진입(2026-10-06): plan 3단계부터 `/harness-loop` 절차로 실행. 진입 질문의 답은 사용자가 승인한 plan("3. `/harness-loop`로 실행")으로 갈음. 게이트 미설정(`.harness/gates.json` 없음) — 기계 검사는 시나리오 선언에 기댄다.
- loop: 2026-10-06 · 수단 subagent · 단계 3 README 설계 스코프 정정 + 사이클 문서 갱신 · QA pass · commit 789dcf8
  - 무엇·왜: README의 "런타임 오케스트레이션 비채택" 문구가 선택형 루프까지 금지한 것처럼 읽혀 "서비스형은 비채택, 선택형 루프는 제공"으로 구분했다(R-11). Dev가 지시 밖으로 §6 B의 "(§4-3 미검증)"을 "(§4-3)"으로 고쳤다 — 미검증 줄을 바꾼 결과와 맞추는 변경이라 수용.
  - QA: gate not-configured(exit 0) · boundary not-configured · scenario S1–S5 pass, S6는 이 단계 전 증거 없음(기록 줄 자체가 증거)이라 진전 판정 제외.
  - `✔ loop: README distinguishes a service orchestrator from the optional loop command`

## Reviews
*Codex 등 리뷰 실행 시 결과(요약·발견·조치)를 날짜와 함께 남긴다. 남기지 않은 리뷰는 "안 한 것"으로 간주.*
*기계 판독용 마커를 함께 남긴다: `<!-- harness:review kind=codex scope=worktree tip=<sha|none> at=<ISO8601> -->`*


## Learnings

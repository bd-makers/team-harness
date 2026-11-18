# team-harness-improvements — Artifact

*최종 결과물과 학습 내용을 기록한다.*

## 결과
- 2026-11-18: 브리프(A1–A6) 사실을 main `a39859a`(0.56.0)와 대조. 차이는 버전·행 번호 2곳·형제 경로(`clean.mjs:113`)·기존 `reviewers.json` 스키마이며 spec R1 `### 발견`에 남겼다.
  실측: codex-cli 0.169.0 `exec -m/--model`, Claude Code 2.1.327 `--model` 존재.
- 2026-11-18: 브리프와 저장소 계약이 부딪히는 8건을 결정으로 닫았다. A5 기본 게이트와 A5-2(loop 적용)는 사용자가 정했고, 나머지는 권장안대로 승인했다. 코드 변경은 없다.
- 다이어그램 옵트인: 생성 시 질문에서 건너뜀.
- 미검증: GitLab self-managed·Obsidian의 단독 SVG 렌더, Obsidian의 CSS scroll-snap 슬라이드 — 각 구현 task 첫 단계에서 실측한다.


## Reviews
*Codex 등 리뷰 실행 시 결과(요약·발견·조치)를 날짜와 함께 남긴다. 남기지 않은 리뷰는 "안 한 것"으로 간주.*
*기계 판독용 마커를 함께 남긴다: `<!-- harness:review kind=codex scope=worktree tip=<sha|none> at=<ISO8601> -->`*


## Learnings
- 교정(2026-11-18): A5를 브리프의 기제(plan 체크박스·nudge 강도)부터 해석해 "모순"으로 보고했는데, 사용자의 취지는 "구현 전에 사용자가 spec을 한 번 검토"였다.
  취지가 정해지자 모순 대부분(검토자 출처·done 차단)이 사라졌다. 규칙: 브리프의 기제가 계약과 부딪히면 결함으로 보고하기 전에 그 기제가 겨냥한 취지를 먼저 한 줄로 확인한다.

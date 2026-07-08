# harness-sim-guide — Artifact

*최종 결과물과 학습 내용을 기록한다.*

## 결과
`docs/chad/harness-sim-guide.html` — harness-sim(L5 agent-in-the-loop) 독립 실행형 가이드.
단일 HTML · 인라인 CSS(외부 의존 0) · 한국어 · 다크 테마(harness-overview.html 매칭).
7섹션 + 상단 nav 앵커 + 인라인 SVG 채점 파이프라인 다이어그램 + 표 7개 + PASS/FAIL/MANUAL pill.

렌더 검증: node 정적 서버 + preview screenshot 2컷. `navOk=true`(nav 7/7 → section id),
sections=7, tables=7, pills=11, svg 존재. 태그 균형(section/svg/table) 정상.

사실 대조(ground truth = agentloop.mjs): SC1=8신호(SKILL의 "7신호"는 stale, 코드/리포트가 8),
SC2=6, SC3=5, SC4=post-commit→SessionStart 순서 + PreToolUse=MANUAL, SC5 pass-rate(N=2).
allowlist `Bash(node:*),Bash(git:*),Bash(harness-team:*),Read,Write,Edit,Glob,Grep`,
EXPECTED_LABEL(node→Node.js / next→Next.js / react-native→React Native (Expo)),
transcript needle "활성 task가 없습니다", NS=`/harness-aijient-team`, 무오염(.sim-tmp 삭제).

## Reviews
*Codex/Gemini 등 리뷰 실행 시 결과(요약·발견·조치)를 날짜와 함께 남긴다. 남기지 않은 리뷰는 "안 한 것"으로 간주.*


## Learnings


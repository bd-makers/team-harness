# default-loop-skill — Artifact

*최종 결과물과 학습 내용을 기록한다.*

## 결과

- 다이어그램: docs/chad/default-loop-skill/default-loop-skill-diagram.html 생성 — inline SVG swimlane — 브라우저 pane 렌더 확인, 텍스트 경계 JS 검증 (2026-10-06)
- 루프 dogfood 진입(2026-10-06): plan 3단계부터 `/harness-loop` 절차로 실행. 진입 질문의 답은 사용자가 승인한 plan("3. `/harness-loop`로 실행")으로 갈음. 게이트 미설정(`.harness/gates.json` 없음) — 기계 검사는 시나리오 선언에 기댄다.
- loop: 2026-10-06 · 수단 subagent · 단계 3 README 설계 스코프 정정 + 사이클 문서 갱신 · QA pass · commit 789dcf8
  - 무엇·왜: README의 "런타임 오케스트레이션 비채택" 문구가 선택형 루프까지 금지한 것처럼 읽혀 "서비스형은 비채택, 선택형 루프는 제공"으로 구분했다(R-11). Dev가 지시 밖으로 §6 B의 "(§4-3 미검증)"을 "(§4-3)"으로 고쳤다 — 미검증 줄을 바꾼 결과와 맞추는 변경이라 수용.
  - QA: gate not-configured(exit 0) · boundary not-configured · scenario S1–S5 pass, S6는 이 단계 전 증거 없음(기록 줄 자체가 증거)이라 진전 판정 제외.
  - `✔ loop: README distinguishes a service orchestrator from the optional loop command`
- loop: 2026-10-06 · 수단 subagent · 단계 4 CHANGELOG + overview·docs:check · QA pass · commit 498badd
  - 무엇·왜: 소비자에게 새 슬래시 명령이 하나 생기므로 `[Unreleased] > Added`에 기록. overview는 2단계 커밋 때 pre-commit 훅(docs:check)이 먼저 요구해 이미 재생성돼 있었다.
  - QA: gate not-configured · boundary not-configured · scenario S1–S6 pass · docs:check pass.
- 5단계(검증만, Dev 턴 없음): `npm run test` → tests 1188 · pass 1187 · fail 0 · skip 1(전 1183 + 신규 5). `node bin/harness-team.mjs scenario check` → `scenario: pass (6 checked)`.
  dogfood 발견: plan에 구현 없는 검증 단계가 있으면 루프 문서에 처리 규칙이 없었다 → `commands/harness-loop.md` 진입 절에 "Dev 턴 없이 QA 1–4로 닫는다" 한 줄 추가.
  시나리오별 이름 찍힌 실행 출력(R2 E1 근거):
  - S1 `✔ manifest-sync: Claude harness commands have Codex command-equivalent skills` · `✔ manifest-sync: commands/*.md ⟺ plugin.json commands`
  - S2 `✔ loop: the four stop conditions are pinned and no-progress has no numeric cap`
  - S3 `✔ loop: QA runs machine checks before the read-only rubric and records named test output`
  - S4 `✔ loop: entry asks orchestrator-or-individual and the loop never pushes or opens a PR`
  - S5 `✔ loop: README distinguishes a service orchestrator from the optional loop command`
  - S6 grep exit 0 — 위 `- loop:` 기록 줄 2개가 증거(테스트 러너 아님)

## Reviews
*Codex 등 리뷰 실행 시 결과(요약·발견·조치)를 날짜와 함께 남긴다. 남기지 않은 리뷰는 "안 한 것"으로 간주.*
*기계 판독용 마커를 함께 남긴다: `<!-- harness:review kind=codex scope=worktree tip=<sha|none> at=<ISO8601> -->`*


## Learnings

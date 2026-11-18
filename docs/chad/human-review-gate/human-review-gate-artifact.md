# human-review-gate — Artifact

*최종 결과물과 학습 내용을 기록한다.*

## 결과

- 신규 task plan `## 단계` 맨 위에 `- [ ] [사람] spec 검토 승인 — <user>`(정본 `reviewGateStep`)를 기본으로 넣는다. `--no-review-gate`면 넣지 않고,
  기존 task에 주면 거부한다(exit 1, 아무것도 쓰지 않음). 생성 출력에 `review gate:` 줄. `taskPlanTemplate(name)`(옵션 없음)은 종전과 바이트 단위로 같다.
- `pr-check`는 plan의 게이트 줄(미완·완료)을 뺀 뒤 템플릿 그대로를 판정한다 — 손대지 않은 게이트 plan·게이트만 켠 plan을 잡는다.
- 문서: `commands/harness-task.md` 검토 게이트 절(승인 규칙·`- 검토 승인: <날짜> · 슬라이드 <경로|없음>`·승인 전 task 문서 밖 수정 금지·빼기)과
  생성 시 통합 질문(multiSelect 넷: 레거시·sequence·module·게이트 빼기), `commands/harness-loop.md` 진입 1번·시작 지점·Dev 지시·멈춤 "승인 필요",
  `docs/harness-cycle.md` §2 S2·§4-3 멈춤 요약, `CHANGELOG.md` `[Unreleased]`.
- 테스트: `tests/task-templates.test.mjs`(게이트 5건), `tests/pr-check.test.mjs`(변형 4건), `tests/cli-args.test.mjs`(boolean·task 전용·help),
  `tests/loop-command.test.mjs`(진입·시작 지점·Dev·승인 필요 재고정), `tests/agent-files.test.mjs`(게이트 절·통합 질문·cycle S2),
  `tests/e2e/task-paths-golden.test.mjs`(plan 편집을 게이트+단계로, golden 재생성 — diff는 `review gate:` 줄과 plan 게이트 줄 둘뿐).
- 변이 확인: `pr-check.mjs`에서 완료 게이트 줄 제거 조건(`&& line !== GATE_DONE(user)`)을 지우면 `tests/pr-check.test.mjs` 1건 실패(pass 26 · fail 1).
- 검증(2026-11-18): `npm test` 1차 — tests 1373 · pass 1371 · fail 1(golden, 의도된 출력 변화) → golden 갱신 후 그 파일 pass 1 · fail 0.
  `npm run docs:check` exit 0("harness overview 생성 상태가 최신입니다."). `node bin/harness-team.mjs doctor` — 경고 1건(기존 `.codex/hooks.json` 훅 신뢰, 이 변경과 무관).


## Reviews
*Codex 등 리뷰 실행 시 결과(요약·발견·조치)를 날짜와 함께 남긴다. 남기지 않은 리뷰는 "안 한 것"으로 간주.*
*기계 판독용 마커를 함께 남긴다: `<!-- harness:review kind=codex scope=worktree tip=<sha|none> at=<ISO8601> -->`*


## Learnings

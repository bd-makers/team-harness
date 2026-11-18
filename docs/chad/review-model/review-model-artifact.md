# review-model — Artifact

*최종 결과물과 학습 내용을 기록한다.*

## 결과

- 2026-11-18 구현(설계 A6·결정 A6-1):
  - `src/reviewers-config.mjs`(신규) — `ENGINES`·`modelIssue`·`reviewersConfigIssue`·`loadReviewersConfig`. review·task 가 같이 쓴다
    (review.mjs 에 두면 task↔review import 순환).
  - `src/commands/review.mjs` — `engineArgv`(argv 빌더 분리, 모델 없으면 종전 argv), `resolveReviewer`(① 위치 인자 > ② task 프로필 >
    ③ default > ④ probe, ②·③ 은 엔진 없으면 error), `--model` 검증·거부, meta `model`, artifact `· model: <id|default>`.
    `resolveEngine` 반환 모양은 그대로.
  - `src/commands/task.mjs` — Done evidence `reviewer`(비어 있지 않은 문자열), `taskSpecTemplate(name, { reviewer })`,
    `task --reviewer`(기존 task 는 쓰기 전 거부, 새 task 는 mkdir 전 프로필 확인).
  - `src/cli-args.mjs` — `--model`(review)·`--reviewer`(task) 값 플래그, help args.
  - 문서: `commands/harness-review.md`(인수·1단계 우선순위·5단계 `model`·runner 표 모델 행·프로필 절·예시),
    `harness-loop.md`(엔진 생략 = 프로필 → 폴백 체인), `harness-task.md`(`--reviewer` 절), README, `skills/harness-review/SKILL.md`,
    현행 HTML 가이드 3곳(rubric-guide·onboarding-checklist·operations-playground)의 "엔진 미지정 → probe 체인" 문장, CHANGELOG `[Unreleased]`,
    `docs/harness-overview.html`(재생성 — 인벤토리 2행).
  - 테스트: `tests/review-model.test.mjs`(신규 20건 — argv·runner 표 pin·검증·스키마·우선순위·거부·기록·Done evidence·`task --reviewer`),
    `tests/cli-args.test.mjs`(플래그 등록 1건).
- 확인: `--reviewer` 없는 spec 템플릿이 HEAD 판과 바이트 동일(`git archive HEAD src` 사본과 비교, true).
- 검증(2026-11-18): `npm test` exit 0 — 1334 tests, 1333 pass, 0 fail, 1 skip(`CI에서는 jq-present 매트릭스가 반드시 실행된다`, CI 전용) + perf 1 pass.
  `npm run docs:check` → "생성 상태가 최신입니다"(`docs:generate` 후). `node bin/harness-team.mjs doctor` → 경고 1(`.codex/hooks.json` 훅 신뢰 없음 — 이 머신의 Codex 승인 상태, 이 변경과 무관).
- 검증하지 못한 것: 실제 `codex exec -m <id>`·`claude --model <id>` 실행(엔진 호출은 테스트에서 stub — argv 모양만 대조). 리뷰 엔진 실행(R3)은 이 task에서 돌리지 않았다.

## Reviews
*Codex 등 리뷰 실행 시 결과(요약·발견·조치)를 날짜와 함께 남긴다. 남기지 않은 리뷰는 "안 한 것"으로 간주.*
*기계 판독용 마커를 함께 남긴다: `<!-- harness:review kind=codex scope=worktree tip=<sha|none> at=<ISO8601> -->`*


## Learnings

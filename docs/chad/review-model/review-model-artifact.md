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

### 2026-11-18T09:19:12.771Z — codex (harness-team review)

- engine: codex · model: default · scope: diff · base: refs/remotes/origin/main · mergeBase: 5993b270c4b51ce1daaca1ece4e73c2522108b04 · tip: 75aca6bbe5837022d69fb08121a8b9e88f99d3ec · exit 0 · 2086 B

```text
- **P1 blocking** — [src/commands/review.mjs:261](</Users/chadonpro/Library/Mobile Documents/iCloud~md~obsidian/Documents/para_vault/10_Projects/Harness/harness-aijient-team-plugin/.claude/worktrees/adoring-mclean-ac9da1/src/commands/review.mjs:261>) — A branch under review can select a `custom` profile through its spec or `reviewers.json` and cause an ordinary engine-omitted review to execute the branch’s `custom.command` via `sh -c` with the caller’s permissions.
- **P2 should-fix** — [src/commands/review.mjs:521](</Users/chadonpro/Library/Mobile Documents/iCloud~md~obsidian/Documents/para_vault/10_Projects/Harness/harness-aijient-team-plugin/.claude/worktrees/adoring-mclean-ac9da1/src/commands/review.mjs:521>) — The spec read treats every error as a missing spec, so a permission or I/O failure silently bypasses the task’s reviewer and selects the team default or probe fallback.
- **P2 should-fix** — [commands/harness-review.md:81](</Users/chadonpro/Library/Mobile Documents/iCloud~md~obsidian/Documents/para_vault/10_Projects/Harness/harness-aijient-team-plugin/.claude/worktrees/adoring-mclean-ac9da1/commands/harness-review.md:81>) — The slash command’s execution step omits `--model` from both the invocation and the forwarded arguments, so following it can silently run the engine’s default model.
- **P3 nit** — [src/reviewers-config.mjs:21](</Users/chadonpro/Library/Mobile Documents/iCloud~md~obsidian/Documents/para_vault/10_Projects/Harness/harness-aijient-team-plugin/.claude/worktrees/adoring-mclean-ac9da1/src/reviewers-config.mjs:21>) — Model validation accepts C1 control characters even though the documented contract rejects control characters.

Reviewed `git status` and `git diff` against `refs/remotes/origin/main`. All 30 selected read-only tests, the docs check, and `git diff --check` passed. No files were modified. The full suite and live reviewer engines were outside this verification.

**Verdict: Block merge.** Engine-omitted review needs to preserve the trust boundary before it can launch a custom shell command.
```

<!-- harness:review kind=codex scope=diff tip=75aca6bbe5837022d69fb08121a8b9e88f99d3ec at=2026-11-18T09:19:12.771Z -->

판별·조치(2026-11-18, 작성 세션이 코드로 재현·대조):
- **P1 (custom 프로필이 엔진 생략 review에서 `custom.command` 실행)** — **진짜 지적, 설계 수준.** 재현: `default`가 `{ "engine": "custom" }`이면
  엔진 없는 `review`가 `sh -c`로 그 명령을 돈다(테스트 `custom 프로필은 custom.command 로 돈다`가 바로 이 경로). 다만 설계 A6가 `engine`을 `ENGINES`
  전체(custom 포함)로 승인했고, 같은 브랜치의 `.harness/gates.json`·npm scripts·scenario `cmd`도 같은 신뢰 수준이다. **조치**: 설계를 바꾸지 않고
  `commands/harness-review.md` 프로필 절에 신뢰 수준과 "검토하지 않은 브랜치에서는 엔진을 위치 인자로 명시" 규칙을 적었다(scenario `cmd` 선례).
  프로필에서 custom을 금지할지는 **메인테이너 결정으로 남긴다** (open → 사용자).
- **P2 (spec 읽기 오류를 "없음"으로 삼킴)** — **진짜 결함.** EISDIR·EACCES면 task 프로필을 건너뛰고 default로 돌았다. **조치**: ENOENT만 "없음",
  나머지는 error 패킷(위치 인자 엔진 탈출구 안내). 테스트 `spec 을 읽지 못하면(ENOENT 아님) default 로 내려가지 않고 error`.
- **P2 (harness-review.md 3단계 실행 문장에 `--model` 누락)** — **진짜 결함(문서).** **조치**: 3단계 호출 형태와 "그대로 넘긴다" 목록에 `--model`을 넣었다.
- **P3 (C1 제어문자 허용)** — **진짜(경미).** **조치**: `modelIssue`가 `\x80-\x9f`도 거부, 테스트 케이스 추가.

## Learnings

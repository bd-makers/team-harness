# scope-error-hints — Artifact

*최종 결과물과 학습 내용을 기록한다.*

## 결과

- 다이어그램: 미실행 — 경미한 문구 수정 (2026-10-11)

### 변경 (2026-10-11)
- `scope`(`SCOPE_ERROR_ALTERNATIVES`, scope.mjs)가 `errorKind` 로 `alternatives` 를 고른다 — `default-base` 만 종전 원격 설정 확인 줄, 나머지 셋은 `[]`
  (text 는 `alternatives:` 줄이 사라지고 JSON 은 `alternatives: []`). 모르는 종류는 `default-base` 로 떨어진다.
- `pr-check`(`BASE_ERROR_RETRY`·`PRE_PUSH_BASE_ERROR_RETRY`, pr-check.mjs)가 `errorKind` 로 retry 를 고른다. `emitBaseError` 는 종류를 인수로 받기만 한다 —
  `resolveScope({ scope: 'diff' })` 가 이미 모든 error 에 종류를 싣고 있었다(판정 지점 변경 없음). 문구 정본은 spec `## 설계 / 접근` 의 두 표.
  `default-base` 는 두 모드 모두 종전 문장 그대로다. cause·exit·`stop`·`safeDefault`·pre-push `alternatives`(`--no-verify`)·`originIsEmpty` 분기는 그대로다.
- pre-push 갈래 판단: followups 21 의 "사실상 `default-base` 만" 은 실측으로 틀렸다 — orphan 브랜치·unborn HEAD 를 체크아웃한 채 push 하면 `diff-failed`
  (spec `### 발견`). 그래서 pre-push 도 `default-base`·`diff-failed` 를 종류별로 덮고, 훅이 닿지 않는 `base-missing`·`not-git` 은 수동 실행 문구를 쓴다.
- 기존 테스트 `pr-check: base 를 판정하지 못하면 차단(exit 1) — pre-push 는 set-head 와 --no-verify 를 알린다` 의 픽스처를 `--base nosuch`(`base-missing`,
  훅이 닿지 않는 종류)에서 `default-base`(origin 은 있고 `origin/HEAD`·`main`·`master` 없음)로 옮겼다. 단언은 바이트 그대로다.
- 문서 미러: 바뀌는 문구를 싣는 현행 문서 없음(`commands/harness-review.md` 2단계의 set-head 는 `default-base` 설명이라 그대로 맞다) → 동기화 없음.
- `docs/followups.md` 20·21번 삭제 + 괄호 기록, "남은 것: 22번" · CHANGELOG `[Unreleased]` Fixed 1줄.

### 회귀 테스트 — 구현 전 ✖ / 구현 후 ✔
`node --test --test-name-pattern="CLI scope error|pr-check base error retry|base 를 판정하지 못하면 차단" tests/scope-command.test.mjs tests/pr-check.test.mjs`

| 테스트 | 구현 전 | 구현 후 |
|---|---|---|
| CLI scope error alternatives: a missing --base gets no remote-config check | ✖ (actual: 원격 확인 줄) | ✔ |
| CLI scope error alternatives: a failed default-base inference keeps the remote-config check | ✔ (불변 고정) | ✔ |
| CLI scope error alternatives: outside a git repo there is no alternatives line | ✖ (actual: 원격 확인 줄) | ✔ |
| CLI scope error alternatives: a diff failure gets no remote-config check | ✖ (actual: 원격 확인 줄) | ✔ |
| pr-check base error retry: a missing --base asks for an existing ref, not set-head | ✖ (actual: 종전 set-head 문장) | ✔ |
| pr-check base error retry: a failed default-base inference keeps the set-head hint | ✔ (불변 고정) | ✔ |
| pr-check base error retry: outside a git repo it points at a repository | ✖ (actual: 종전 set-head 문장) | ✔ |
| pr-check base error retry: a diff failure asks for a base that shares history with HEAD — pre-push asks to check out such a branch | ✖ (actual: 종전 set-head 문장) | ✔ |
| pr-check: base 를 판정하지 못하면 차단(exit 1) — pre-push 는 set-head 와 --no-verify 를 알린다 (픽스처 이동) | ✔ | ✔ |

- 전체: `npm test` exit 0 (tests 1237 · pass 1236 · fail 0 · skipped 1, perf 1/1) · `npm run docs:check` "harness overview 생성 상태가 최신입니다."
- 구현 전 ✖ 6건은 모두 안내 단언에서 실패했다(픽스처 오류 아님 — actual 값이 종전 문구). #143 의 `CLI scope error retry:` 4건은 구현 후에도 ✔(retry 불변).

### 의도적으로 하지 않은 것
- cause 문자열(followups 22) — 22번 범위.
- origin 이 없는 `default-base`(`base ref "main" 를 찾을 수 없음`)도 원격 확인 줄·set-head 문장을 받는다 — 브리프가 `errorKind` 4값 재사용을 정했다.
- **범위 밖 결함(후속 후보)**: pre-push 가 HEAD 는 기본 브랜치와 관련 있는 채 무관한 히스토리 브랜치(gh-pages 등)를 push 하면 `resolveScope` 는 통과하지만
  `collectPrCheck` 의 `git diff --name-only <base>...<sha>` 가 처리 없이 throw 한다 — 오류 패킷 없이 git 스택 트레이스와 exit 1(2026-10-11 실측). followups 에는 올리지 않았다.

## Reviews
*Codex 등 리뷰 실행 시 결과(요약·발견·조치)를 날짜와 함께 남긴다. 남기지 않은 리뷰는 "안 한 것"으로 간주.*
*기계 판독용 마커를 함께 남긴다: `<!-- harness:review kind=codex scope=worktree tip=<sha|none> at=<ISO8601> -->`*


## Learnings

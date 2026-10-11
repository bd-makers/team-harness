# review-retry-hint — Artifact

*최종 결과물과 학습 내용을 기록한다.*

## 결과

- 다이어그램: 미실행 — 경미한 문구 수정 (2026-10-11)

### 변경 (2026-10-11)
- `resolveBase`·`resolveScope`(`src/commands/review.mjs`)가 `{ error }` 에 `errorKind`(`base-missing`·`default-base`·`not-git`·`diff-failed`)를 싣는다.
  원인 문자열은 바이트 그대로다.
- `review`(`SCOPE_ERROR_RETRY`, review.mjs)·`scope`(같은 이름, scope.mjs)가 `errorKind` 로 retry 를 고른다. 문구 정본은 spec `## 설계 / 접근` 표.
  `default-base` 는 두 명령 모두 종전 문장 그대로, 모르는 종류도 그 문장으로 떨어진다.
- scope.mjs 판정: 같은 어긋남 실재(`scope --scope worktree --base nope` → `--scope worktree` 재권유) → 함께 고침.
- 문서 미러: retry 문구를 싣는 문서 없음(grep 0건) → 동기화 없음, `docs:check` 통과.
- `docs/followups.md` 19번 삭제 + 괄호 기록, "남은 것: 없음." · CHANGELOG `[Unreleased]` Fixed 1줄.

### 회귀 테스트 — 구현 전 ✖ / 구현 후 ✔
`node --test --test-name-pattern="scope error retry" tests/review-command.test.mjs tests/scope-command.test.mjs`

| 테스트 | 구현 전 | 구현 후 |
|---|---|---|
| scope error retry: a missing --base is not told to add --scope worktree | ✖ (actual: 종전 문장) | ✔ |
| scope error retry: a failed default-base inference keeps the --scope worktree hint | ✔ (불변 고정) | ✔ |
| scope error retry: outside a git repo only --scope worktree is suggested | ✖ (actual: 종전 문장) | ✔ |
| scope error retry: a diff failure asks for a base that shares history with HEAD | ✖ ("존재하는" 포함) | ✔ |
| CLI scope error retry: a missing --base is not told to add --scope worktree | ✖ (actual: 종전 문장) | ✔ |
| CLI scope error retry: a failed default-base inference keeps the --scope worktree hint | ✔ (불변 고정) | ✔ |
| CLI scope error retry: outside a git repo only --scope worktree is suggested | ✖ (actual: 종전 문장) | ✔ |
| CLI scope error retry: a diff failure asks for a base that shares history with HEAD | ✖ (merge-base 안내 없음) | ✔ |

- 전체: `npm test` exit 0 (tests 1229 · pass 1228 · fail 0 · skipped 1, perf 1/1) · `npm run docs:check` "harness overview 생성 상태가 최신입니다."
- 구현 전 ✖ 6건은 모두 retry 단언에서 실패했다(픽스처 오류 아님 — actual 값이 종전 문장).

### 의도적으로 하지 않은 것
- `scope` 오류의 `alternatives`(`git remote -v`·`symbolic-ref` 확인)는 `default-base` 에만 맞지만 브리프가 retry 외 필드를 고정해 두었다.
- `pr-check` 의 base 오류 문구(`emitBaseError`)는 diff scope 만 쓰고 자기 문구라 범위 밖 — 확인하지 않았다.

## Reviews
*Codex 등 리뷰 실행 시 결과(요약·발견·조치)를 날짜와 함께 남긴다. 남기지 않은 리뷰는 "안 한 것"으로 간주.*
*기계 판독용 마커를 함께 남긴다: `<!-- harness:review kind=codex scope=worktree tip=<sha|none> at=<ISO8601> -->`*


## Learnings

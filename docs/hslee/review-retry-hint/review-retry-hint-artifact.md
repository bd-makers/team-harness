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

### 2026-10-11T05:26:03.915Z — codex-adversarial (harness-team review)

- engine: codex · scope: diff · base: refs/remotes/origin/main · mergeBase: 5428c466c324eb903f1b71e52ce80a784807ee64 · tip: 0927c69017712fce82684c16a7beb5ae675d346e · exit 0 · 1302 B

```text
전하, **P1/P2 거절 사유는 발견하지 못했습니다.** 판정 지점에서 `errorKind`를 붙이고 호출부가 retry를 선택하는 접근은 반박 검토를 통과했습니다.

- **P3 nit — [src/commands/scope.mjs:29](src/commands/scope.mjs:29)**: 관계없는 히스토리의 base 때문에 diff가 실패한 뒤, 같은 base로 `--scope worktree`를 재시도하면 merge-base가 없어 **커밋된 변경을 제외하고 미커밋만** 봅니다. 그런데 새 안내는 “워킹트리 전체”라고 설명합니다. `review`처럼 범위 축소를 문구에 명시하는 편이 정확합니다. 재시도 결과에 별도 경고가 나오므로 blocking으로 보지는 않습니다.

추가 방어 검토 사항: `diff-failed`는 모든 `git diff` 예외를 받으므로 공통 조상 부재만을 뜻하지 않습니다. 예를 들어 8 MiB 출력 한도 초과도 해당합니다. 이 경로는 이번 검토에서 재현하지 않았으며, 거절 근거로 삼지 않았습니다.

`git status`, 전체 diff, 관련 호출부를 확인했고 변경된 JS 네 파일의 구문 검사와 `git diff --check`가 통과했습니다. 테스트·빌드는 실행하지 않았으며 파일도 수정하지 않았습니다. 기존 handoff 미커밋 변경은 그대로입니다.
```

<!-- harness:review kind=codex-adversarial scope=diff tip=0927c69017712fce82684c16a7beb5ae675d346e at=2026-10-11T05:26:03.915Z -->

판별·조치(2026-10-11):
- **P3 scope.mjs `diff-failed` 문구 — 진짜 결함, 반영.** merge-base 가 없으면 같은 base 의 worktree 는 degrade 해 미커밋만 보는데
  "워킹트리 전체를 대상으로" 라고 안내했다. review 와 같은 꼬리("worktree 는 merge-base 를 못 잡으면 미커밋만 본다")로 바꿨다(spec 표 동기화).
  `scope` 의 `not-git`·`default-base` 문장은 "워킹트리 전체" 를 유지한다 — `default-base` 는 종전 문장 불변 결정, `not-git` 은 비교할 커밋이 없다.
- **관찰: `diff-failed` 는 merge-base 부재만이 아니다 — 맞음, 코멘트·spec 만 보정.** 출력 버퍼 초과 같은 다른 `git diff` 예외도 같은 종류로 온다.
  드물고 cause 가 git 메시지를 그대로 실으므로 문구는 흔한 경우에 맞추고, review.mjs 코멘트의 단정("실패는 … 때다")을 "흔한 실패는" 으로 고쳤다.
- 반영 후 `scope error retry` 8건 ✔.

### 2026-10-11 — AO native review (head 78e6ec8)
- 결과: 승인, 필수 수정 없음(정적 검토 + CI success 확인, 로컬 실행 없음).
- 선택 제안: diff-failed 테스트 2건이 worktree 범위 축소 꼬리 문구도 단언할 것 → **반영**(사용자 지시). codex P3 보정 문구의 회귀를 고정한다.
  `scope error retry` 8건 ✔.

### 2026-10-11 — AO native review (head 662d573)
- 결과: changes_requested 1건 — `scope.mjs` `EMPTY_SUMMARY` 의 `=` 뒤 공백이 빠져 무관한 줄이 diff 에 들어갔다. **진짜 결함(내 편집 실수), 반영**(b621789).
  스레드에 답글을 달고 resolve 했다. scope-command 21건 ✔, CI(662d573) success.

## Learnings

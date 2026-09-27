# summary-detached-head — Artifact

*최종 결과물과 학습 내용을 기록한다.*

## 결과
`branchState`에 `detached`를 분리하고 `summary --write` 가드가 이를 비-기본 브랜치처럼 `isSyncedWithDefault`로 판정하게 했다. 재현 테스트 3건(synced 허용·다른 커밋 거부·origin/HEAD 없음 거부). `done` 가드는 브랜치 조회가 없어 수정 불필요.


## Reviews
*Codex 등 리뷰 실행 시 결과(요약·발견·조치)를 날짜와 함께 남긴다. 남기지 않은 리뷰는 "안 한 것"으로 간주.*
*기계 판독용 마커를 함께 남긴다: `<!-- harness:review kind=codex scope=worktree tip=<sha|none> at=<ISO8601> -->`*

### 2026-09-27T16:00:33.227Z — codex (harness-team review)

- engine: codex · scope: worktree · tip: a91b804fcd5f6a05981ffe0db708de66cf702579 · exit 0 · 596 B

```text
전하, **작업 트리 변경분에서 P1·P2·P3 지적 사항은 없습니다.** 변경된 파일은 [summary-detached-head-handoff.md](/Users/hsonpro/.ao/data/worktrees/harness-aijient-team-plugin/harness-aijient-team-plugin-11/docs/hslee/summary-detached-head/summary-detached-head-handoff.md:5) 하나이며, 추가된 커밋 기록과 변경 통계는 `HEAD`와 일치합니다. `git diff --check`도 통과했습니다.

**최종 판정:** 현재 작업 트리 변경분은 승인 가능합니다. 이미 커밋된 코드 변경은 이번 리뷰 범위에 포함하지 않았습니다.
```

<!-- harness:review kind=codex scope=worktree tip=a91b804fcd5f6a05981ffe0db708de66cf702579 at=2026-09-27T16:00:33.227Z -->

**판별: 무효(범위 오류).** post-commit 훅이 재생성한 handoff 때문에 작업 트리가 더러워 `--base`보다
worktree 범위가 우선됐고, 코드 변경은 보지 않았다. 훅 재생성분을 되돌린 깨끗한 트리에서 base 범위로 재실행한다.

### 2026-09-27T16:02:09.846Z — codex (harness-team review)

- engine: codex · scope: diff · tip: da927a6f1ab738ae15b42d01d07bffff10b53d1d · exit 0 · 927 B

```text
전하, **P1·P2 지적 사항은 없습니다.** `summary --write`는 detached HEAD에서 `origin/HEAD`가 가리키는 원격 기본 브랜치와 HEAD 커밋이 정확히 같을 때만 통과합니다. Git 조회 실패, 다른 커밋, `origin/HEAD` 부재는 계속 거부됩니다.

- **P3** [src/commands/summary.mjs:227](/Users/hsonpro/.ao/data/worktrees/harness-aijient-team-plugin/harness-aijient-team-plugin-11/src/commands/summary.mjs:227) — 주석의 “Three outcomes”는 `detached` 추가 후 실제 네 상태와 맞지 않습니다.

**최종 판정: 승인 가능.** 새 테스트는 동기화된 detached HEAD의 허용과 다른 커밋·`origin/HEAD` 부재 시 거부를 확인하도록 작성되어 있습니다. `git diff --check`와 두 변경 파일의 `node --check`는 통과했습니다. 읽기 전용 범위 때문에 파일을 생성하는 테스트 스위트는 실행하지 않았습니다.
```

<!-- harness:review kind=codex scope=diff tip=da927a6f1ab738ae15b42d01d07bffff10b53d1d at=2026-09-27T16:02:09.846Z -->

**판별.** P1·P2 없음. P3(`summary.mjs:227` 주석 "Three outcomes")는 진짜 — `detached` 추가로 네 상태가 됐다. 주석을 "Four outcomes"로 고쳤다.

## Learnings

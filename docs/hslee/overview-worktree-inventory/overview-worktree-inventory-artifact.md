# overview-worktree-inventory — Artifact

*최종 결과물과 학습 내용을 기록한다.*

## 결과
2026-11-04 — overview 파일 인벤토리의 기준을 `git add -A`가 스테이징할 트리로 바꿨다(`--cached --others --exclude-standard` 결과에서 `lstat`으로 없는 경로와 디렉터리를 거른다).
"`docs:generate` 전에 `git add`" 학습(9회)이 더는 필요 없다. 계약 테스트는 저장소 루트를 더럽히지 않게 임시 git 저장소로 옮겼고, 네 경우를 본다
(ignored 제외, untracked 포함, 지웠지만 index에 남은 파일 제외, 디렉터리로 바뀐 파일은 안의 파일만). `git add -A` 뒤 재비교도 한다. `MAINTAINING.md`의 생성 순서 안내와 eager 실측 수치를 정리했다. 출처: task `subsystem-audit` 후보 D.
- 실증: 옛 구현에서 새 테스트를 돌리면 `src/gone.mjs`가 남고 `src/new.mjs`가 빠진다(두 실패 방향 모두 재현). 실제 저장소에서 untracked 탐침
  `scripts/zz-probe.mjs`를 두고 `git add` 없이 `docs:generate`를 돌리면 탐침이 들어갔고, 지우고 재생성하면 빠졌다. `git add -A` 뒤 `docs:check`도 PASS.

## Reviews
*Codex 등 리뷰 실행 시 결과(요약·발견·조치)를 날짜와 함께 남긴다. 남기지 않은 리뷰는 "안 한 것"으로 간주.*
*기계 판독용 마커를 함께 남긴다: `<!-- harness:review kind=codex scope=worktree tip=<sha|none> at=<ISO8601> -->`*


### 2026-11-04T13:00:38.446Z — codex (harness-team review)

- engine: codex · scope: diff · base: refs/remotes/origin/main · mergeBase: 8f9be5a6830864d4a7426eaad017d2cbe0a70ffd · tip: 15e660cea315f8e0deafaf61ff942baa2da32201 · exit 0 · 2232 B

```text
전하, **P1은 없으며 P2 세 건을 발견했습니다.**

- **P2 — `scripts/generate-harness-overview.mjs:107`**: tracked 파일 `src/foo`를 디렉터리 `src/foo/bar.mjs`로 바꾸면 `--deleted`는 기존 경로를 제거하지 않아, `git add -A` 전후 인벤토리가 달라집니다.
- **P2 — `scripts/generate-harness-overview.mjs:106`**: sparse-checkout 범위 밖의 untracked 파일도 포함하지만 기본 `git add -A`는 이를 staging하지 않으므로, “스테이징할 트리” 계약과 어긋납니다.
- **P2 — `scripts/generate-harness-overview.mjs:110`**: 신규 embedded repository는 `--others`에서 `src/vendor/`로 나오지만 staging 후 gitlink는 `src/vendor`가 되어, trailing slash 때문에 생성 결과가 달라집니다.

위 판단은 Git 2.54의 [`ls-files`](https://github.com/git/git/blob/v2.54.0/builtin/ls-files.c#L424), [삭제 판정](https://github.com/git/git/blob/v2.54.0/diff-lib.c#L54), [sparse 처리](https://github.com/git/git/blob/v2.54.0/builtin/add.c#L330), [nested repository 처리](https://github.com/git/git/blob/v2.54.0/dir.c#L1873)를 대조한 정적 분석입니다. fixture 재현은 수행하지 않았습니다.

새 테스트(`tests/harness-overview-generation.test.mjs:58`)는 일반 추가·삭제·ignore 세 경우를 검증하지만 **staging 후 비교가 없어 순서 독립성은 검증하지 않습니다.** 충돌 stage 중복 제거와 일반 rename에서는 별도 결함을 찾지 못했습니다. `MAINTAINING.md:52`의 eager 설명은 코드와 일치하며, `:39`의 순서 독립성 문구는 위 예외 때문에 과도합니다.

검증은 `git status`, 기준 ref 대비 diff, `git diff --check`, `npm run docs:check`, 생성 일치 테스트 1개 모두 통과했습니다. 파일 변경은 없으며, 읽기 전용 범위를 지키기 위해 fixture 생성 테스트와 전체 `npm test`는 실행하지 않았습니다. Git 조회는 성공했으나 부수적인 xcrun 캐시 쓰기는 권한으로 차단됐습니다.

**최종 판정: 수정 후 재검토 권고 — 위 경계 조건을 처리하거나 지원 범위를 명시하고, staging 전후 인벤토리를 비교하는 회귀 테스트가 필요합니다.**
```

<!-- harness:review kind=codex scope=diff tip=15e660cea315f8e0deafaf61ff942baa2da32201 at=2026-11-04T13:00:38.446Z -->

판별(2026-11-04, 임시 git 저장소에서 `git add -A` 전후 인벤토리를 비교해 재현):
- **P2-1 file→dir — 진짜 결함.** 전 `src/foo src/foo/bar.mjs`, 후 `src/foo/bar.mjs`. 드문 경우지만 계약 위반이다.
- **P2-3 embedded repo — 진짜 결함이나 이 저장소에는 현재 해당 없음.** 전 `src/vendor/`, 후 `src/vendor`. 저장소의 gitlink는 0개다.
- **P2-2 sparse — 이 저장소에는 해당 없음.** `core.sparseCheckout` 미설정이다. 재현에서 `git add -A` 자체가 실패해 스테이징 상태가 정의되지 않는다.
- **테스트 빈틈 — 진짜.** 새 테스트는 스테이징 뒤 재비교가 없어 순서 독립성을 직접 검증하지 않는다.
- 조치: 메인테이너 지시("반영")로 `--deleted`를 `lstat` 필터로 바꾸고, 테스트에 디렉터리 교체와 스테이징 뒤 재비교를 넣었다. 대가: sparse 체크아웃의 cone 밖 tracked 파일이 표에서 빠진다.

## Learnings
- **반복 학습의 원인이 리뷰가 고정한 계약일 수 있다.** tracked-only는 PR #10 리뷰가 `.DS_Store` 같은 잡파일을 막으려고 정한 것이었다. 실제로 막아야 했던 것은
  ignored 파일뿐이었다. 계약을 쪼개 보니 절반(ignored)만 옳았다. 뒤집기 전에 그 테스트의 출처 커밋부터 찾는다.
- 저장소 안에 fixture를 만드는 테스트는 기준을 작업 트리로 바꾸는 순간 같은 프로세스의 다른 검사를 오염시킨다. 임시 `git init` 저장소로 옮긴다.

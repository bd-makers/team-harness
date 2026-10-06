# post-commit-prepend — Artifact

*최종 결과물과 학습 내용을 기록한다.*

## 결과

- `src/git-hooks.mjs`: post-commit도 맨 위(shebang 다음) 삽입 + 비-셸 skip. `installGitHook({ name, block, marker, call })`로 바꾸고 append 분기를 지웠다.
  새 훅 파일은 바이트 동일(`POST_COMMIT_HOOK = '#!/bin/sh\n' + POST_COMMIT_BLOCK`). skip 안내는 훅별 `call`을 쓴다(post-commit은 `harness-team handoff`).
- 같은 함수의 결함 수정: 개행 없는 shebang 한 줄짜리 훅에 넣으면 `#!/bin/sh# harness: …`가 됐다. macOS는 그래도 실행했다(실측). Linux는 미실측이다.
- 테스트 4건 추가(`tests/git-hooks.test.mjs`): `exit 0` 뒤 실행(shim, CLI 없음 + `sh -e` 포함), 비-셸 skip 처방, shebang 변형, 개행 없는 shebang(두 훅).
  `npm run test` 1166 pass / 0 fail / 1 skip(기존).
- CHANGELOG `[Unreleased]` `### Fixed` 2항목, `docs/followups.md` 13번 제거(남은 것 14–16).
- 문서 표면 점검: `git grep -i post-commit` 대상은 README·commands·skills·templates·docs다. post-commit 설치 위치(끝에 append)를 서술한 문장은 없어 고칠 문서가 없다. README 503행의 맨 위 삽입 설명은 pre-push만 다룬다.
- 미해결: 이미 append된 설치본은 재작성하지 않는다. spec 범위 밖에 근거를 두고, CHANGELOG에 수동 조치를 안내했다.

## Reviews
*Codex 등 리뷰 실행 시 결과(요약·발견·조치)를 날짜와 함께 남긴다. 남기지 않은 리뷰는 "안 한 것"으로 간주.*
*기계 판독용 마커를 함께 남긴다: `<!-- harness:review kind=codex scope=worktree tip=<sha|none> at=<ISO8601> -->`*

### 2026-10-06T02:12:36.072Z — codex (harness-team review)

- engine: codex · scope: worktree · tip: aaca78c66e37d53d49f0f99f0d90baecd3cb9f63 · exit 0 · 638 B

```text
유의미한 P1/P2/P3 발견 사항은 없습니다.

- prepend 순서, 비셸 훅 skip 안내, shebang 개행 경계, 재설치 멱등성을 확인했습니다.
- 새 훅 본문은 HEAD와 바이트 단위로 동일합니다.
- 기존 append 설치본이 유지되는 제한은 spec·CHANGELOG에 명시되어 있습니다.
- 메모리 기반 설치 검증 20개와 `sh -e` 실행 검증이 통과했습니다. 전체 테스트는 파일 생성이 필요한 관계로 읽기 전용 환경에서 실행하지 않았습니다.

**최종 판정: 승인 가능 — 검토 범위에서 수정이 필요한 결함을 찾지 못했습니다.**
```

<!-- harness:review kind=codex scope=worktree tip=aaca78c66e37d53d49f0f99f0d90baecd3cb9f63 at=2026-10-06T02:12:36.072Z -->

판별: 발견 없음. 반영할 것도 없다. 리뷰어는 읽기 전용이라 전체 테스트를 돌리지 않았다. 작성 세션의 `npm run test` green(1166 pass)이 그 공백을 메운다.
리뷰가 보장하지 않는 것: Linux 커널에서 개행 없는 shebang이 실제로 실패하는지는 양쪽 다 실측하지 않았다(수정은 출력 정합성 근거로 유지).

## Learnings

- "같은 함수의 덤 결함"은 고치기 전에 실제 영향을 실측한다. 개행 없는 shebang은 출력이 틀렸지만 macOS execve·`git push`는 통과했다.
  처음 쓴 "모든 push가 막힌다"는 과장이었다. 영향 주장은 실측한 플랫폼으로 한정해 쓴다.

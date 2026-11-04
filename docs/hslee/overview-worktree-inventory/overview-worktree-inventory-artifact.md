# overview-worktree-inventory — Artifact

*최종 결과물과 학습 내용을 기록한다.*

## 결과
2026-11-04 — overview 파일 인벤토리의 기준을 `git add -A`가 스테이징할 트리로 바꿨다(`--cached --others --exclude-standard`에서 `--deleted`를 뺀다).
"`docs:generate` 전에 `git add`" 학습(9회)이 더는 필요 없다. 계약 테스트는 저장소 루트를 더럽히지 않게 임시 git 저장소로 옮겼고, 세 경우를 본다
(ignored 제외, untracked 포함, 지웠지만 index에 남은 파일 제외). `MAINTAINING.md`의 생성 순서 안내와 eager 실측 수치를 정리했다. 출처: task `subsystem-audit` 후보 D.
- 실증: 옛 구현에서 새 테스트를 돌리면 `src/gone.mjs`가 남고 `src/new.mjs`가 빠진다(두 실패 방향 모두 재현). 실제 저장소에서 untracked 탐침
  `scripts/zz-probe.mjs`를 두고 `git add` 없이 `docs:generate`를 돌리면 탐침이 들어갔고, 지우고 재생성하면 빠졌다. `git add -A` 뒤 `docs:check`도 PASS.

## Reviews
*Codex 등 리뷰 실행 시 결과(요약·발견·조치)를 날짜와 함께 남긴다. 남기지 않은 리뷰는 "안 한 것"으로 간주.*
*기계 판독용 마커를 함께 남긴다: `<!-- harness:review kind=codex scope=worktree tip=<sha|none> at=<ISO8601> -->`*

- 아직 없음 — R3 리뷰는 PR 전에.

## Learnings
- **반복 학습의 원인이 리뷰가 고정한 계약일 수 있다.** tracked-only는 PR #10 리뷰가 `.DS_Store` 같은 잡파일을 막으려고 정한 것이었다. 실제로 막아야 했던 것은
  ignored 파일뿐이었다. 계약을 쪼개 보니 절반(ignored)만 옳았다. 뒤집기 전에 그 테스트의 출처 커밋부터 찾는다.
- 저장소 안에 fixture를 만드는 테스트는 기준을 작업 트리로 바꾸는 순간 같은 프로세스의 다른 검사를 오염시킨다. 임시 `git init` 저장소로 옮긴다.

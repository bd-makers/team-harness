# followups-22-23 — Artifact

*최종 결과물과 학습 내용을 기록한다.*

## 결과

- 다이어그램: 미실행 — 경미한 오류 경로 수정 (2026-10-11)
- 재현(구현 전, 임시 저장소 `main`·`feature`·`--orphan gh-pages`, HEAD=feature, `origin/main`=main):
  - 23: `printf 'refs/heads/gh-pages <sha> refs/heads/gh-pages <0×40>\n' | harness-team pr-check --pre-push` →
    `Error: Command failed: git -C <절대경로> … diff --name-only --relative refs/remotes/origin/main...<sha>` / `fatal: …: no merge base` + 스택, exit 1.
  - 22: `pr-check --base gh-pages --json` → `root_cause: "diff 계산 실패: Command failed: git -C <절대경로> diff --stat gh-pages...HEAD"`.
- 회귀 테스트 구현 전 ✖ (2026-10-11, `node --test --test-name-pattern=…`):
  - ✖ `scope error cause: a diff failure carries git's reason, not the command line or the absolute path` — `diff 계산 실패: Command failed: git -C /var/folders/…/harness-review-… diff --stat unrelated...HEAD`
  - ✖ `pr-check --pre-push: 기본 브랜치와 무관한 히스토리의 브랜치는 건너뛰고, 관련 브랜치는 그대로 검사한다` — `Error: Command failed: git -C … diff --name-only --relative refs/remotes/origin/main...<sha>` (throw)
- 구현 후 ✔ 두 테스트 모두. 재현도 바뀜:
  - 23: 텍스트 무출력·exit 0, `--json` 은 `status: success`·`checks: []`(기본 브랜치 push 만 했을 때와 같은 형태).
  - 22: `root_cause: "diff 계산 실패: fatal: gh-pages...HEAD: no merge base"`.
  - 수동 `pr-check`(push 없이)는 종전대로 HEAD 를 검사(task 문서 없음 ✗, exit 1) — 무변경.
  - 그 밖의 실패는 삼키지 않음: 로컬에 없는 sha 를 stdin 으로 주면 `merge-base` exit 128 → 종전처럼 스택 트레이스 exit 1(git 은 pre-push 에 로컬 sha 만 주므로 실사용에서는 닿지 않는다 — 고치지 않음).
- 편차(advisor 지적 후 실측): 커밋 없는 HEAD(`checkout --orphan nocommit`)에서 "마지막 비어 있지 않은 줄"은
  `diff 계산 실패: 'git <command> [<revision>...] -- [<file>...]'` 였다(사용법 안내 줄). 마지막 `fatal:`·`error:` 줄을 우선하도록 다듬고
  같은 테스트에 unborn HEAD 단언을 더했다 — 다듬기 전 ✖, 후 ✔. 결과: `diff 계산 실패: fatal: ambiguous argument 'main...HEAD': unknown revision or path not in the working tree.`
- 검증: `npm test` — tests 1239 · pass 1238 · fail 0 (+ perf 1 pass), `npm run docs:check` — 최신.

## Reviews
*Codex 등 리뷰 실행 시 결과(요약·발견·조치)를 날짜와 함께 남긴다. 남기지 않은 리뷰는 "안 한 것"으로 간주.*
*기계 판독용 마커를 함께 남긴다: `<!-- harness:review kind=codex scope=worktree tip=<sha|none> at=<ISO8601> -->`*


## Learnings

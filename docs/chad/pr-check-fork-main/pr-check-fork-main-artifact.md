# pr-check-fork-main — Artifact

*최종 결과물과 학습 내용을 기록한다.*

## 결과

- **판정** (`src/commands/pr-check.mjs` `pushGoesElsewhere`): 기본 브랜치 이름으로의 push는 push 원격이 base 원격(`refs/remotes/<r>/` 의 `<r>`, 보통 origin)이
  아닌 **설정된 원격**으로 풀릴 때만 검사한다. 원격 정보는 `HARNESS_PUSH_REMOTE`(훅이 git `$1`을 넘김) — 이름이면 그대로, URL이면 fetch·push URL 완전 일치.
  정보 없음·base 로컬·안 풀리는 URL은 종전대로 건너뛴다. 로컬 `git remote`·`get-url`만 쓴다.
- **훅** (`src/git-hooks.mjs`): `PRE_PUSH_BLOCK`이 `HARNESS_PUSH_REMOTE="$1" harness-team pr-check --pre-push`로 부른다. 옛 블록은 `PRE_PUSH_BLOCK_V1`(원문 1종 —
  2026-10-06 이후 바뀐 적 없음)이고 init·sync가 정확 일치일 때만 바꾼다(U1). doctor `checkPrePushHook`은 marker는 있지만 환경변수가 없으면 `옛 형식` 경고.
- **문서**: README pr-check 절(건너뛰는 경우·새 블록 사본), `commands/harness-ship.md`, `commands/harness-task.md` pre-push 가드, `docs/decisions.md` D11 2026-11-20 정정, CHANGELOG Fixed.
- **테스트**: `tests/pr-check.test.mjs` 실측 push(fork 이름·URL → 차단, origin 이름·URL → 통과)와 단위(`pushRemote` 주입 — fork·fork URL 검사 / 없음·빈값·origin·origin URL·
  안 풀리는 URL·base 로컬 건너뜀). `tests/git-hooks.test.mjs` 옛 블록 정확 일치 교체·손댄 블록 보존·doctor 경고.
  변이 확인: `skipDefault = true`로 되돌리면 새 테스트 2건이 실패한다.
- **알려진 한계(범위 밖)**: origin이 fork이고 upstream이 정본인 레이아웃은 base 사다리부터 origin 기준이라 고치지 못한다 — 별도 결정 후보.
  `insteadOf` 재작성·같은 저장소의 다른 URL 표기로 push하면 판정 불가로 건너뛴다.


## Reviews
*Codex 등 리뷰 실행 시 결과(요약·발견·조치)를 날짜와 함께 남긴다. 남기지 않은 리뷰는 "안 한 것"으로 간주.*
*기계 판독용 마커를 함께 남긴다: `<!-- harness:review kind=codex scope=worktree tip=<sha|none> at=<ISO8601> -->`*


## Learnings

- 훅 계약을 바꿀 때 CLI 인자 대신 환경변수를 쓰면 "새 훅 + 구버전 CLI" 조합에서 push를 막지 않는다 — `unknownFlags`가 모르는 플래그를 exit 1로 거부한다.
- `installGitHook`은 live marker가 있으면 손대지 않으므로 블록 원문을 바꾸면 기존 설치에 닿는 경로(정확 일치 교체)와 doctor 감지를 같이 둬야 한다.
- 실측 push 테스트에서 이름 push는 `refs/remotes/<r>/*`를 옮기고 URL push는 원격 ref만 옮긴다 — 순서가 바뀌면 diff가 비어 검사가 no-op이 된다.

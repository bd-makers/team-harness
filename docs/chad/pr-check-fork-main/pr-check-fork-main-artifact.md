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
  그 레이아웃에서 `git push upstream main`(직접 push)은 이제 검사된다(종전 건너뜀) — 사용자 선택으로 한계로 문서화, 우회는 `--no-verify`.


## Reviews
*Codex 등 리뷰 실행 시 결과(요약·발견·조치)를 날짜와 함께 남긴다. 남기지 않은 리뷰는 "안 한 것"으로 간주.*
*기계 판독용 마커를 함께 남긴다: `<!-- harness:review kind=codex scope=worktree tip=<sha|none> at=<ISO8601> -->`*

### 2026-11-20T02:50:58.637Z — claude (harness-team review)

- engine: claude · model: default · scope: diff · base: refs/remotes/origin/main · mergeBase: d282f76131db3eab7e2d6a42885a8ab00884ba05 · tip: de2a10c17ea3cc2a1451c3747d3ffbd0861b2c09 · exit 0 · 3129 B

```text
전하, **차단할 결함은 없습니다(P1·P2 없음).** fork 기본 브랜치 push 판정, 옛 블록을 정확히 일치할 때만 교체하는 처리, doctor 경고 모두 의도대로 동작하고 테스트로 확인됩니다. 아래는 앞으로 깨질 수 있는 지점(P3) 세 개입니다.

**검증한 것**
- `npm test`: 1442 pass, 0 fail, 1 skip. perf suite도 pass입니다.
- 옛 블록 `PRE_PUSH_BLOCK_V1`은 v0.46.0부터 v0.57.0까지 릴리스된 블록 원문과 바이트 단위로 같습니다. 이 기간 블록 해시는 하나뿐이라, 기존 설치는 전부 자동 교체 대상입니다.
- `init`과 `sync`가 둘 다 `installPrePushHook`을 부르므로, CHANGELOG의 "init·sync가 교체" 서술은 사실입니다.

**지적 사항 (전부 P3)**

1. **`src/git-hooks.mjs:72`**: `PRE_PUSH_BLOCK_V1`은 고정된 원문이 아니라 현재 블록에서 `.replace`로 만들어집니다.
   - 다음에 `PRE_PUSH_BLOCK`의 다른 줄을 고치면 V1도 같이 바뀝니다. 그러면 이미 설치된 0.57 블록과 맞지 않아 자동 교체가 조용히 멈춥니다.
   - 치환할 문자열이 바뀌면 `.replace`가 아무것도 하지 않는데, 테스트의 `!includes('HARNESS_PUSH_REMOTE')`는 이 경우만 잡습니다.
   - 권장: V1을 리터럴로 얼려 두거나, 테스트에서 v0.57 원문 fixture와 비교합니다.

2. **`src/git-hooks.mjs:120`**: `existing.replace(legacy, block)`은 문자열 치환이라 `block` 안의 `$$`, `$&`, `` $` ``, `$'`를 특수 패턴으로 해석합니다.
   - 지금 블록에는 해당 패턴이 없어 안전하고, 테스트가 출력이 정확히 같은지 확인합니다.
   - 셸에서 흔한 `$$`(PID)가 블록에 들어오는 순간 훅이 깨집니다.
   - 권장: `existing.replace(legacy, () => block)`.

3. **`src/commands/pr-check.mjs:275`**: base 원격 이름을 `/^refs\/remotes\/([^/]+)\//`로 뽑아 첫 경로 조각만 씁니다.
   - git은 원격 이름에 `/`를 허용합니다. 예를 들어 base 원격이 `team/origin`이면 baseRemote가 `team`이 됩니다.
   - 그러면 그 원격의 정본 main으로 직접 push할 때도 "다른 원격"으로 판정돼 검사가 돕니다.
   - 드문 경우라 P3입니다. `git remote` 목록 중 가장 긴 접두로 맞추면 해결됩니다.

**참고 (결함 아님)**
- `pushGoesElsewhere`의 catch는 전체를 감쌉니다. URL로 push할 때 URL이 없는 원격이 하나만 있어도 판정 전체가 false가 되어 검사를 건너뜁니다. 근거가 없으면 건너뛴다는 설계와 같은 방향이라 수용 가능합니다.
- origin이 fork인 레이아웃(`gh repo fork` 기본)에서는 `git push upstream main`(정본으로 직접 push)도 이제 검사됩니다. CHANGELOG와 decisions D11에 알려진 한계로 적혀 있어 의도된 범위입니다.
- plan의 `- [ ] ship 완료`가 아직 미체크이고, 이번 리뷰 결과도 artifact `## Reviews`에 아직 없습니다. ship 전에 둘 다 반영해야 합니다.

**결론: 승인합니다.** 머지 전에 1번과 2번을 함께 손보길 권하지만 필수는 아닙니다.
```

<!-- harness:review kind=claude scope=diff tip=de2a10c17ea3cc2a1451c3747d3ffbd0861b2c09 at=2026-11-20T02:50:58.637Z -->

**판별·조치 (2026-11-20, 작성 세션)** — P1·P2 없음. P3 3건 모두 진짜로 판별해 고쳤다.
- P3-1 진짜: `PRE_PUSH_BLOCK_V1`을 현재 블록에서 파생하지 않고 리터럴로 얼렸다. `d282f761`의 `PRE_PUSH_BLOCK`과 바이트 일치를 import 비교로 확인.
- P3-2 진짜(잠재): 교체를 `existing.replace(legacy, () => block)`로 — 블록에 `$$` 등이 들어와도 치환 패턴으로 해석되지 않는다.
- P3-3 진짜: 재현 테스트(원격 `team/origin`)를 먼저 썼더니 판정 함수 말고 **기존 `branchName`**도 첫 조각에서 잘라 기본 브랜치를 `origin/main`으로 보고 있었다.
  `baseRemoteBranch`가 가장 긴 원격 이름 접두로 base 원격·브랜치를 한 번 풀고 판정·`defaultRef`가 같이 쓴다. 테스트 추가.
- 참고 항목(catch 전체 감쌈 → 건너뜀, upstream 레이아웃)은 설계 방향과 같아 조치 없음. ship·Reviews 미반영 지적은 이 기록과 이후 ship 단계로 해소.

## Learnings

- 훅 계약을 바꿀 때 CLI 인자 대신 환경변수를 쓰면 "새 훅 + 구버전 CLI" 조합에서 push를 막지 않는다 — `unknownFlags`가 모르는 플래그를 exit 1로 거부한다.
- `installGitHook`은 live marker가 있으면 손대지 않으므로 블록 원문을 바꾸면 기존 설치에 닿는 경로(정확 일치 교체)와 doctor 감지를 같이 둬야 한다.
- 실측 push 테스트에서 이름 push는 `refs/remotes/<r>/*`를 옮기고 URL push는 원격 ref만 옮긴다 — 순서가 바뀌면 diff가 비어 검사가 no-op이 된다.

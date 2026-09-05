# summary-branch-guard — Artifact

*최종 결과물과 학습 내용을 기록한다.*

## 결과

`summary --write` 가드의 판정 기준을 브랜치 **이름**에서 **HEAD 커밋 동일성**으로 바꿨다.
`src/commands/summary.mjs`에 `isSyncedWithDefault(targetDir, bases)`를 신설하고, 가드 조건을
`offDefault && !(await isSyncedWithDefault(...))`로 바꿨다. 커밋 `e59be1d`.

동작:
- 이름이 기본 브랜치가 아니어도 HEAD가 `refs/remotes/origin/<후보>` 중 하나와 **정확히 같으면** 허용
- ahead·behind는 계속 거부 (ancestor 관계 불인정)
- `rev-parse` 실패는 전부 `false` → 기존 거부 (fail-closed)
- origin 없는 로컬 전용 저장소·detached HEAD·거부 메시지·`defaultBranchCandidates`는 불변

**검증 (전부 실행 결과)**

`npm test` — 603 tests / 602 pass / 0 fail / 1 skip, 그리고 perf 1/1.
(직전 기준선 599/598/0/1 + perf 1 → 새 테스트 4개만큼 늘었다.)

`npm run docs:check` → `harness overview 생성 상태가 최신입니다.` exit 0
`node bin/harness-team.mjs doctor` → `All checks passed (plugin-dev mode).` exit 0

**end-to-end 실증** — 이 저장소를 scratchpad에 clone 해서 유래 사례를 그대로 재현했다.
(이 브랜치에서 직접 시연하지 않은 이유: cherry-pick 때문에 ahead라 어차피 거부되고,
`--force`로 밀면 D5가 기본 브랜치에 유보한 원장 파일을 실제로 쓰게 된다.)

BEFORE — 0.29.0 코드, `origin/main`에서 딴 커밋 0개 브랜치:
```
✗ summary: 기본 브랜치가 아니라 원장을 쓰지 않음 (현재: claude/ledger-update)
```
AFTER — 같은 상태에서 수정 코드:
```
$ node bin/harness-team.mjs summary --write
updated: docs/task_summary.md
CLI exit=0
```
ahead(로컬 커밋 1개 얹음) / behind(`reset --hard origin/main~1`) 둘 다 거부했고,
일부러 stale로 만들어 둔 `docs/task_summary.md`가 그대로 남았다.

## Reviews
*Codex 등 리뷰 실행 시 결과(요약·발견·조치)를 날짜와 함께 남긴다. 남기지 않은 리뷰는 "안 한 것"으로 간주.*
*기계 판독용 마커를 함께 남긴다: `<!-- harness:review kind=codex scope=worktree tip=<sha|none> at=<ISO8601> -->`*


## Learnings

**통과하는 테스트는 커버리지의 증거가 아니다 — mutation으로 확인해야 안다.**
추가한 ahead·behind 테스트는 구현 전부터 통과했다(이름 판정이 이미 거부하므로). "그러면 이건
회귀 방지용이고 잘 고정하고 있다"고 **추론**한 뒤 넘어갈 뻔했다. 실제로 세 가지 mutation을
넣어 돌려 보니 판정이 갈렸다:

| mutation | 결과 | 뜻 |
|---|---|---|
| B: 정확 동일성 → origin ref 존재만으로 허용 | ahead·behind 테스트 RED | 두 테스트가 진짜로 정확 동일성을 고정한다 |
| C: origin ref 없을 때 fail-open | 기존 로컬 전용 저장소 테스트 2개 RED | plan ④가 요구한 커버리지를 **기존 테스트가 이미** 갖고 있다 |
| A: `rev-parse HEAD` 실패 시 fail-open | **전부 통과** | 미커버 경로 |

A가 뚫린 이유는 도달 경로를 잘못 짚었기 때문이다. `rev-parse HEAD`는 origin이 없어도 성공한다 —
실패하는 건 **커밋이 하나도 없는(unborn HEAD)** 저장소이고, `branchState`는 거기서도 브랜치
이름을 낸다(그 함수 주석이 이미 그렇게 말하고 있었다). 그 상태 테스트를 새로 넣고 mutation A를
다시 얹어 RED을 확인한 뒤에야 fail-closed가 고정됐다고 말할 수 있게 됐다.

**Why:** "이 테스트는 X를 잡는다"는 코드를 읽고 세운 가설이지 관측이 아니다. 가설과 관측을
구분하지 않으면 커버리지 구멍이 초록불 뒤에 숨는다.
**How to apply:** 구현 후에도 통과 상태로 남는 테스트를 plan에 세울 때는, 그 테스트가 지키는
불변식을 깨는 mutation을 한 번 넣고 RED을 본다. 통과만 보고 체크박스를 닫지 않는다.

**plan의 단계를 실행하지 않고 닫을 때는 사유를 붙여 닫는다.**
④는 기존 테스트가 이미 커버해 중복 테스트를 만들지 않았다. 체크박스를 그냥 `- [x]`로 켜면
"했다"가 되고 지우면 옵트인 사실이 사라진다 — AGENTS.md의 다이어그램 옵트인 처리와 같은 형태로
`- [x] … — 중복 테스트 미추가: <근거>`로 닫았다.


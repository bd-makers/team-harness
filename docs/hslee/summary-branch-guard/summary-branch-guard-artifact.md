# summary-branch-guard — Artifact

*최종 결과물과 학습 내용을 기록한다.*

## 결과

`summary --write` 가드의 판정 기준을 브랜치 **이름**에서 **HEAD 커밋 동일성**으로 바꿨다.
`src/commands/summary.mjs`에 `isSyncedWithDefault(targetDir)`를 신설하고, 가드 조건을
`offDefault && !(await isSyncedWithDefault(ctx.targetDir))`로 바꿨다.
커밋 `e59be1d`(초안) → `139bd3f`(리뷰 BRG-01 반영, 최종 계약).

동작:
- 이름이 기본 브랜치가 아니어도 HEAD가 **`origin/HEAD`가 가리키는 브랜치**와 **정확히 같으면** 허용
- ahead·behind는 계속 거부 (ancestor 관계 불인정)
- `origin/HEAD`가 없으면 새 경로를 열지 않는다 — 기본 브랜치를 특정할 수 없기 때문
- `rev-parse` 실패는 전부 `false` → 기존 거부 (fail-closed)
- origin 없는 로컬 전용 저장소·detached HEAD·거부 메시지·`defaultBranchCandidates`는 불변
  (helper가 `defaultBranchCandidates`를 아예 호출하지 않으므로 "소비만 한다"보다 결합이 더 얕다)

**검증** — 아래는 전부 명령과 그 출력 그대로다. 산문 요약이 아니다
(shipcheck S5가 이전 판을 BLOCKER로 지적해 교체했다).

```
$ npm test
ℹ tests 604
ℹ suites 0
ℹ pass 603
ℹ fail 0
ℹ cancelled 0
ℹ skipped 1
ℹ todo 0
ℹ tests 1
ℹ suites 0
ℹ pass 1
ℹ fail 0
ℹ cancelled 0
ℹ skipped 0
ℹ todo 0
```
`tests 604 / pass 603 / fail 0 / skipped 1` 뒤의 두 번째 블록은 별도 실행되는 perf 테스트다.
직전 기준선은 599/598/0/1 + perf 1이었고, 이 task가 테스트 5개를 더했다.

```
$ npm run docs:check
harness overview 생성 상태가 최신입니다.
exit=0
```

```
$ node bin/harness-team.mjs doctor

All checks passed (plugin-dev mode).
```

**end-to-end 실증** — 이 저장소를 scratchpad에 clone 해서 유래 사례를 그대로 재현했다.
(이 브랜치에서 직접 시연하지 않은 이유: cherry-pick 때문에 ahead라 어차피 거부되고,
`--force`로 밀면 D5가 기본 브랜치에 유보한 원장 파일을 실제로 쓰게 된다.)

```
# BEFORE (0.29.0) — synced 브랜치
$ node bin/harness-team.mjs summary --write
✗ summary: 기본 브랜치가 아니라 원장을 쓰지 않음 (현재: claude/ledger-update)
cause: 공유 원장을 feature 브랜치에서 갱신하면 병렬 브랜치끼리 다시 충돌함 (기본 브랜치: main)
exitCode=1  ·  docs/task_summary.md 3행: stale

# AFTER — ① synced 브랜치
$ node bin/harness-team.mjs summary --write
updated: docs/task_summary.md
exitCode=0  ·  docs/task_summary.md 3행: | User | Task | Status | Created |

# AFTER — ② ahead (로컬 커밋 1개)
$ node bin/harness-team.mjs summary --write
✗ summary: 기본 브랜치가 아니라 원장을 쓰지 않음 (현재: claude/ledger-update)
exitCode=1  ·  docs/task_summary.md 3행: stale

# AFTER — ③ behind (origin/main~1)
$ node bin/harness-team.mjs summary --write
✗ summary: 기본 브랜치가 아니라 원장을 쓰지 않음 (현재: claude/ledger-update)
exitCode=1  ·  docs/task_summary.md 3행: stale

# AFTER — ④ origin/HEAD 제거 후 같은 synced 브랜치
$ node bin/harness-team.mjs summary --write
✗ summary: 기본 브랜치가 아니라 원장을 쓰지 않음 (현재: claude/ledger-update)
exitCode=1  ·  docs/task_summary.md 3행: stale

# --check 회귀 — synced 브랜치 + stale 원장, BEFORE/AFTER 대조
$ node bin/harness-team.mjs summary --check   # before
✗ summary: 원장이 task 디렉터리와 어긋남 (1개)
  exitCode=1  ·  docs/task_summary.md 3행: stale
$ node bin/harness-team.mjs summary --check   # after
✗ summary: 원장이 task 디렉터리와 어긋남 (1개)
  exitCode=1  ·  docs/task_summary.md 3행: stale
```

`--check`는 BEFORE·AFTER가 같은 메시지·같은 exit·원장 불변으로 일치한다 — 회귀 없음.
구조적으로도 `--check` 블록은 `return`으로 끝나고 가드는 그 아래에 있어 도달하지 않지만,
코드 읽기는 관측이 아니므로 실행으로 대조했다.

**ship (2026-09-06)**
- 다이어그램: 건너뜀 (사용자 선택) — 변경이 함수 하나·가드 조건 한 줄이라 그림이 산문보다
  나은 지점이 없다. plan에 다이어그램 단계가 없으므로(생성 시 미옵트인) 닫을 체크박스도 없다.
- 정합 검증(shipcheck): 실행함. 아래 Reviews 참고 — REJECT 2건을 반영한 뒤 준비 완료.

## Reviews
*Codex 등 리뷰 실행 시 결과(요약·발견·조치)를 날짜와 함께 남긴다. 남기지 않은 리뷰는 "안 한 것"으로 간주.*
*기계 판독용 마커를 함께 남긴다: `<!-- harness:review kind=codex scope=worktree tip=<sha|none> at=<ISO8601> -->`*

### 2026-09-05 — Codex 적대적 read-only 리뷰

- Scope: `origin/main..e59be1d` (리뷰 시점 tip; 아래 조치 커밋에서 발견을 반영했다)
- Engine/framing: Codex (`gpt-5.6-sol`) · adversarial · `--sandbox read-only`
- 리뷰어 판정: P0/P1 없음, **P2 1건**. 핵심 exact-commit 판정은 적합하나 default-branch 조회
  실패까지 포함한 전역 fail-closed는 성립하지 않는다.
- **BRG-01 (P2 · 정확성/엣지/회귀) — 수용, 수정함.**
  주장: `defaultBranchCandidates`가 `origin/HEAD` 조회 실패를 `main`/`master` 폴백으로 바꾸고,
  새 equality 경로가 그중 존재하는 remote ref와 HEAD가 같으면 비-default 브랜치를 허용한다.
  실제 기본이 `main`이고 `origin/HEAD`는 없으며 `origin/master`만 남은 저장소에서, `origin/master`
  tip에 서 있는 브랜치가 변경 전과 달리 통과한다.

  **재현(실행 결과).** bare 원격에 갈라진 `main`·`master`를 두고 clone 한 뒤
  `git symbolic-ref -d refs/remotes/origin/HEAD`, 브랜치를 `origin/master`에 세웠다.
  `bases`는 `["main","master"]`.
  - BEFORE(0.29.0): `✗ 기본 브랜치가 아니라 원장을 쓰지 않음` · exit 1 · 원장 파일 없음
  - AFTER(`e59be1d`): `updated: docs/task_summary.md` · exit 0 · **원장이 실제로 써짐**

  **판정.** 진짜 결함이다. 그 브랜치의 원장 커밋은 실제 기본(`main`)으로 fast-forward 되지
  않으므로, spec이 behind를 거부한 근거("push가 non-FF로 실패해 더 헷갈린다")와 정면으로
  모순된다.

  **함께 실측한 반대 근거와 그 처리.** 이름 판정도 이미 느슨하다 — `bases`가 두 개일 때
  `master` 브랜치가 `origin/master`보다 ahead여도 0.29.0이 통과시킨다(실측: `updated:
  docs/task_summary.md`). 그러나 이 사실은 BRG-01을 정당화하지 않는다. 기존 느슨함은 spec이
  범위 밖으로 둔 `defaultBranchCandidates`의 계약이고, 새 경로가 그 위에 **쓰기 표면을 더한**
  부분은 이 task의 책임이다. 느슨한 폴백은 이름 판정에서는 아무것도 열지 않지만(feature
  브랜치는 어차피 거부된다) 커밋 판정에서는 쓰기를 연다.

  **조치.** `isSyncedWithDefault`가 `defaultBranchCandidates`를 소비하지 않고 `origin/HEAD`만
  본다. 없으면 새 경로를 열지 않는다(fail-closed). 인자 `bases`를 제거했고, spec Ontology·설계
  절·CHANGELOG를 같은 계약으로 맞췄다. 회귀 테스트를 추가했고 mutation E(후보 전체 대조로
  되돌림)로 그 테스트만 RED이 되는 것을 확인했다.
- 리뷰어의 나머지 판정(재확인함): `rev-parse` 실패·unborn·detached·ahead·behind는 fail-closed.
  origin 없는 로컬 저장소·`--force`·`--check`·JSON 엔벨로프에 회귀 없음. 완전한 `refs/remotes/...`
  사용으로 동명 로컬 브랜치·태그가 판정을 속이지 못함. `execFile` argv 사용으로 `targetDir`
  shell injection 없음. 무의미한 테스트 없음.
- 리뷰어 한계: read-only 샌드박스라 전체 `npm test`를 재실행하지 못했고 `node --check`만 돌렸다
  (알려진 제약 — 제품 결함이 아니다). 재실행은 이 세션이 했다.

<!-- harness:review kind=codex-adversarial scope=diff tip=139bd3f08aff57bdd9b257960a295614d2a0eea7 at=2026-09-05T14:49:37Z -->



### 2026-09-06 — Codex shipcheck (문서↔diff 정합, D6)

- Scope: `origin/main..081b204` · rubric S1–S5 · Engine: Codex (`gpt-5.6-sol`) · `--sandbox read-only`
- 리뷰어 판정: **REJECT** — S1·S5 BLOCKER, S2·S3·S4 PASS
- **S1 (BLOCKER) — 수용, 수정함.** spec 설계 절과 Ontology의 갈라진 브랜치 정의에 옛
  `origin/<candidate|후보>` 계약이 남아 `origin/HEAD` 단일 기준과 충돌한다는 지적.
  사실이다 — BRG-01 반영 때 Ontology의 동기화된 브랜치 항목과 CHANGELOG는 고쳤지만 설계
  절·갈라진 브랜치 정의·Goal 자가진단·plan 목표·TCC Goal은 옛 표현이 남았다.
  spec 4곳·plan 1곳·TCC 1곳을 `origin/HEAD` 기준으로 맞췄다. 정정 노트 안의 인용
  (spec Ontology · plan Ontology 변경 로그)은 이력이라 그대로 둔다.
- **S5 (BLOCKER) — 수용, 수정함.** `검증 (전부 실행 결과)`라고 선언해 놓고 `npm test`·
  `docs:check`·`doctor`·거부 경로를 산문으로 요약했다는 지적. 사실이다.
  네 블록을 실제 명령·출력 transcript로 교체했다(BEFORE/AFTER, ahead·behind,
  `origin/HEAD` 제거, `--check` 대조 포함).
- S2·S3·S4는 PASS. 마커 `tip`이 실제 조치 커밋 `139bd3f`를 가리키는 것도 확인받았다.
- 리뷰어 한계: read-only 샌드박스라 전체 `npm test`를 재실행하지 못했다(알려진 제약).
  S5는 "인용의 형태와 수치 정합"으로 판정했고, 수치 간 모순은 없다고 확인했다.

<!-- harness:review kind=codex-shipcheck scope=diff tip=SHIPCHECK_TIP at=2026-09-06T00:03:04Z -->

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

**주석으로 문서화한 느슨함은 고친 것이 아니다.**
구현 중에 "후보가 여러 개일 때 실제 기본이 아닌 것과 매칭될 수 있다"는 점을 알고 있었고,
"이름 판정이 이미 갖던 성질"이라는 근거로 **주석 한 문단을 달아 두는 것으로 처리**했다.
codex는 그 지점을 정확히 P2로 짚었고(BRG-01), 재현해 보니 실제로 0.29.0이 거부하던 상태를
새 코드가 통과시켜 원장을 썼다.

판정을 가른 것은 "기존에도 느슨했다"가 아니라 **느슨함이 무엇을 여는가**였다. 같은 폴백이라도
이름 판정에서는 아무것도 열지 않는다(feature 브랜치는 어차피 거부된다). 커밋 판정에서는 쓰기를
연다. 그리고 그렇게 열린 상태는 spec이 behind를 거부한 근거(push가 non-FF로 실패한다)와 정확히
같은 상황이라, **spec 자체와 모순**됐다.

**Why:** "알고 있다"를 주석으로 적으면 인지 부채가 문서 부채로 바뀔 뿐 동작은 그대로다.
리뷰어는 주석을 읽고 넘어가지 않는다 — 동작을 본다.
**How to apply:** 구현 중 "이건 좀 느슨하지만 기존도 그렇다"는 생각이 들면, 기존 느슨함이
무엇을 열었고 새 코드가 무엇을 더 여는지 한 줄로 비교한다. 답이 "쓰기"면 주석이 아니라 코드를
고친다. 비교가 안 되면 그때 주석을 단다.

**리뷰 발견은 재현한 뒤에 판정한다 — 양쪽 근거를 다 실측하고.**
BRG-01은 "기존 계약과 일치하니 기각"으로 닫을 뻔했다. 실제로 두 가지를 다 돌려봤다:
발견 시나리오(BEFORE 거부 / AFTER 원장 써짐)와 내 반론(이름 판정도 ahead인 master를 통과시킨다).
반론은 사실이었지만 발견을 무효화하지 않았다 — 범위가 다른 문제였기 때문이다. 실측하지 않았다면
"둘 다 느슨하니 같은 급"이라는 잘못된 등치로 기각했을 것이다.

**plan의 단계를 실행하지 않고 닫을 때는 사유를 붙여 닫는다.**
④는 기존 테스트가 이미 커버해 중복 테스트를 만들지 않았다. 체크박스를 그냥 `- [x]`로 켜면
"했다"가 되고 지우면 옵트인 사실이 사라진다 — AGENTS.md의 다이어그램 옵트인 처리와 같은 형태로
`- [x] … — 중복 테스트 미추가: <근거>`로 닫았다.

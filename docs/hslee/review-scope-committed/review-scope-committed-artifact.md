# review-scope-committed — Artifact

*최종 결과물과 학습 내용을 기록한다.*

## 결과

worktree scope 가 base 와의 merge-base 이후 커밋 + 미커밋 + untracked 를 리뷰한다(구현 `f62f833`). 기록은 git scope 일 때 `base`·`mergeBase`.

### 검증 (2026-10-11, 로컬)

**변이 근거 — 구현 전 실패(red).** 테스트를 먼저 쓰고 구현 없이 실행했다. 네 시나리오 테스트가 모두 실패했다 — Then 이 깨진 코드(종전 worktree)에서 실패함을 보인다:

```text
$ node --test --test-name-pattern="merge base|cannot be inferred|reports its base" tests/review-command.test.mjs tests/scope-command.test.mjs
✖ resolveScope: worktree scope carries the merge base so committed branch changes are reviewed
✖ resolveScope: worktree degrades to uncommitted-only when the base cannot be inferred
✖ resolveScope: worktree on the base branch has its merge base at HEAD
✖ CLI scope: dirty worktree reports its base and merge base
```

**구현 후(green) — `harness-team scenario check`:**

```text
✔ resolveScope: worktree scope carries the merge base so committed branch changes are reviewed (215.275583ms)
S1 pass — … [resolveScope: worktree scope carries the merge base so committed branch changes are reviewed]
✔ resolveScope: worktree degrades to uncommitted-only when the base cannot be inferred (161.745916ms)
S2 pass — … [resolveScope: worktree degrades to uncommitted-only when the base cannot be inferred]
✔ resolveScope: worktree on the base branch has its merge base at HEAD (119.1155ms)
S3 pass — … [resolveScope: worktree on the base branch has its merge base at HEAD]
✔ CLI scope: dirty worktree reports its base and merge base (142.696916ms)
S4 pass — … [CLI scope: dirty worktree reports its base and merge base]
scenario: pass (4 checked)
```

**전체:** `npm test` exit 0 — unit+e2e `tests 1221 · pass 1220 · fail 0 · skipped 1`(기존 CI 전용 jq 매트릭스 skip), perf `pass 1 · fail 0`.
`npm run docs:check` → `harness overview 생성 상태가 최신입니다.`

**정적 검사 (shipcheck S5 후속, 작성 세션이 직접 실행):**

```text
$ git diff --check refs/remotes/origin/main...HEAD
git diff --check exit 0
$ node --check src/commands/review.mjs   → exit 0
$ node --check src/commands/scope.mjs    → exit 0
$ node --check src/commands/summary.mjs  → exit 0
```

**의도된 계약 변경:** `tests/scope-command.test.mjs`의 "dirty 워킹트리는 worktree 로 보고하고 base 는 비운다"를 S4 테스트로 바꿨다(spec 영향 표).

**미검증:** 실제 codex·claude 리뷰어가 넓어진 fill 문구를 받아 `git diff <mergeBase>`를 실제로 실행하는지는 엔진 행동이라 테스트하지 않았다(프롬프트 문자열까지만 assert).

### 남은 리스크 · 후속

- **리뷰 대상이 넓어진다.** dirty 트리에서 `--scope` 없이 돌린 리뷰가 이제 브랜치 전체를 본다 — 오래 산 브랜치는 리뷰어 토큰·시간이 diff scope 만큼 든다.
  미커밋만 보려면 `--base HEAD`. 상한은 두지 않았다(spec 설계 7).
- **과거 worktree 기록은 그대로 증거다.** 두 키가 없는 기록은 미커밋만 본 리뷰였을 수 있지만 소급하지 않는다(spec 설계 3) — 감사가 필요하면 키 유무로 가려낸다.
- **소비자 영향:** `templates/` 불변 — 플러그인 갱신만으로 받는다. `scope --json` 의 worktree `base` 가 null 이 아니게 된 것은 출력 계약 변경이다(ship 문서는 동기화함).
- 후속 없음 — followups 17 은 이 task 로 닫는다.

## Reviews
*Codex 등 리뷰 실행 시 결과(요약·발견·조치)를 날짜와 함께 남긴다. 남기지 않은 리뷰는 "안 한 것"으로 간주.*
*기계 판독용 마커를 함께 남긴다: `<!-- harness:review kind=codex scope=worktree tip=<sha|none> at=<ISO8601> -->`*

### 2026-10-10T16:16:13.950Z — codex-scenario (harness-team review)

- engine: codex · scope: diff · base: refs/remotes/origin/main · mergeBase: a8e230bfbc509df3f7750740d36992472c45c3c9 · tip: f62f8336af8483ddd255e9d4fa2f3e5ae2aec588 · exit 0 · 1717 B

```text
전하, `git status`와 `git diff refs/remotes/origin/main`을 직접 확인했습니다. 파일은 수정하지 않았습니다.

| id | 항목 | 심각도 | 판정 | 근거 |
|---|---|---|---|---|
| E1 | 각 시나리오의 증거가 Then을 실제로 검증 | BLOCKER | **na** | **S1**: `tests/review-command.test.mjs:452–461`이 scope·base·분기점 SHA·엔진 프롬프트·저장 기록을 assert합니다. **S2**: 같은 파일 `475–486`이 degrade·기존 프롬프트·null 필드·경고·잘못된 base의 exit 1·리뷰 기록 수 불변을 assert합니다. **S3**: `496`의 `assert.deepEqual`이 mergeBase=HEAD를 검증합니다. **S4**: `tests/scope-command.test.mjs:250–256`이 실제 CLI 출력의 scope·base·mergeBase·안내를 검증합니다. 해당 결과값을 깨뜨리면 assertion이 실패하는 구조지만, **S1–S4의 테스트 이름이 나온 실행 출력이 없습니다**. artifact의 결과·Reviews는 비어 있어 실제 실행과 변이 실패까지 입증할 수 없습니다. |
| E2 | spec 밖 동작 변경 없음 | MAJOR | **pass** | diff의 base 판정·worktree 확장·degrade 경고는 spec 설계 §1–2, 기록 필드는 §3, scope 출력은 §4, ship 문서는 §5에 대응합니다. `summary.mjs`는 스키마 주석만 변경됐고, changelog·followups 정리도 영향 표에 명시되어 있습니다. 대응하지 않는 동작 변경은 발견하지 못했습니다. |

테스트는 임시 저장소와 파일을 생성하므로 현재 읽기 전용 환경에서 실행하지 않았습니다. machine rows는 재판정하지 않았습니다.

**Verdict: fail 없음. E1은 na이므로 R2 검증 완료를 인정할 근거는 부족합니다.**
```

<!-- harness:review kind=codex-scenario scope=diff tip=f62f8336af8483ddd255e9d4fa2f3e5ae2aec588 at=2026-10-10T16:16:13.950Z -->

**판별 (작성 세션):** E2 pass — 동의. E1 na — **진짜 결함(기록 누락)**: 테스트 코드는 Then 을 assert 하지만 artifact 에 시나리오 테스트 이름이 찍힌 실행 출력과
변이(구현 전 실패) 근거가 없었다. 조치: `## 결과`에 red/green 실행 출력과 `npm test`·`docs:check` 결과를 기록하고 R2 를 다시 돌린다. 코드 변경 없음.

### 2026-10-10T16:17:43.252Z — codex-scenario (harness-team review)

- engine: codex · scope: diff · base: refs/remotes/origin/main · mergeBase: a8e230bfbc509df3f7750740d36992472c45c3c9 · tip: d406f0fce08f69cddcac567335765bc797d0e79e · exit 0 · 2218 B

```text
전하, `git status`와 `git diff refs/remotes/origin/main`을 직접 확인했습니다. 판정은 **E1 pass, E2 pass**입니다.

| id | 항목 | 심각도 | 판정 | 근거 |
|---|---|---|---|---|
| E1 | 각 시나리오의 증거가 Then을 실제로 검증한다 | BLOCKER | **pass** | **S1:** `tests/review-command.test.mjs:446–461`은 feature 커밋과 미커밋 편집을 만들고 scope·base·분기점 SHA, 엔진에 전달된 `'committed and uncommitted'` 프롬프트, 저장된 리뷰 필드를 assert합니다. **S2:** 같은 파일 `472–486`은 추론 불가 origin에서 기존 프롬프트·null 필드·경고를 검증하고, 잘못된 명시 base의 exit 1과 기록 수 불변을 assert합니다. **S3:** `496`의 `assert.deepEqual`은 `mergeBase=HEAD`를 검증합니다. **S4:** `tests/scope-command.test.mjs:250–256`은 실제 CLI를 실행하여 scope·base·mergeBase와 `"--scope worktree --base 'main'"` 안내를 assert합니다. spec의 이름 필터는 이 테스트 이름들과 일치합니다. artifact `14–18`에는 네 테스트 이름이 찍힌 구현 전 실패(`✖`), `24–31`에는 동일한 이름의 구현 후 성공(`✔`)이 기록되어 있습니다. 종전 구현으로 Then을 깨뜨렸을 때 실패했다는 근거와 실제 선택·실행 근거가 모두 있습니다. |
| E2 | spec 밖 동작 변경이 없다 | MAJOR | **pass** | diff의 공용 base 판정·merge-base 계산·degrade/error 분기는 spec 설계 §1, 프롬프트 변경은 §2, 기록 필드·블록 변경은 §3, scope 출력·경고는 §4, ship 절차 변경은 §5에 대응합니다. `summary.mjs`는 주석만 변경됐으며 changelog·followups 정리도 spec 영향 표에 명시되어 있습니다. 어떤 요구사항에도 대응하지 않는 동작 변경은 발견하지 못했습니다. |

파일은 수정하지 않았고 테스트·빌드는 로컬에서 실행하지 않았습니다. 실행·변이 근거는 artifact에 기록된 출력을 사용했습니다. 실제 리뷰 엔진이 프롬프트를 따라 git 명령을 실행하는지는 이 검증 범위 밖입니다. machine rows는 재판정하지 않았습니다.

**Verdict: pass — fail 목록: 없음.**
```

<!-- harness:review kind=codex-scenario scope=diff tip=d406f0fce08f69cddcac567335765bc797d0e79e at=2026-10-10T16:17:43.252Z -->

**판별 (작성 세션):** E1·E2 pass — 1차의 E1 na 사유(실행 출력·변이 근거 부재)가 `## 결과` 기록으로 해소됐다. 리뷰어가 짚은 범위 밖 항목(실제 엔진이 넓어진 fill 대로 `git diff <mergeBase>`를 실행하는가)은 `## 결과` 미검증에 이미 적었다. 조치 없음.

### 2026-10-10T16:18:52.745Z — codex (harness-team review)

- engine: codex · scope: diff · base: refs/remotes/origin/main · mergeBase: a8e230bfbc509df3f7750740d36992472c45c3c9 · tip: d406f0fce08f69cddcac567335765bc797d0e79e · exit 0 · 557 B

```text
전하, `git status`와 `git diff refs/remotes/origin/main`을 직접 확인했습니다. **유의미한 P1/P2/P3 결함은 발견하지 못했습니다.**

merge-base 계산, 프롬프트 전달, 기록 필드와 ship 문서가 일관됩니다. `git diff --check`와 변경 모듈의 구문 검사는 통과했습니다.

파일은 수정하지 않았습니다. 테스트·빌드는 실행하지 않았으며, artifact의 실행 기록을 독립 검증으로 간주하지 않았습니다.

**최종 판정: PASS — 정적 리뷰 기준 승인 가능.**
```

<!-- harness:review kind=codex scope=diff tip=d406f0fce08f69cddcac567335765bc797d0e79e at=2026-10-10T16:18:52.745Z -->

**판별 (작성 세션):** 발견 0건 — 판별할 지적 없음. 엔진은 codex(probe 체인 첫 엔진, 명시 호출). 셋 모두 `scope: diff`·`mergeBase` 기록이 이 변경의 새 블록 형식으로 남았다(dogfood). 조치 없음.

### 2026-10-10T16:28:19.962Z — codex-shipcheck (harness-team review)

- engine: codex · scope: diff · base: refs/remotes/origin/main · mergeBase: a8e230bfbc509df3f7750740d36992472c45c3c9 · tip: 62ce12be987a9b49f296cf04b0f3f8bb551ddc9d · exit 0 · 2674 B

```text
전하, 지정 문서와 `git status`, `git diff refs/remotes/origin/main`, 커밋 이력을 직접 대조했습니다. **S5가 fail입니다.**

아래 spec·plan·artifact는 `docs/hslee/review-scope-committed/`의 해당 파일입니다.

| id | 항목 | 심각도 | 판정 | 근거 |
|---|---|---|---|---|
| S1 | spec 요구사항에 대응 구현 또는 의도적 미구현 기록 | BLOCKER | pass | spec의 “merge-base 대비 작업 트리 전체”, degrade, 기록 호환 요구에 각각 diff의 `return { scope: 'worktree', base: resolved.base, mergeBase, tip }`, `degrade(...)`, `{ base: base ?? null, mergeBase: mergeBase ?? null }`이 대응합니다. 프롬프트·scope 출력·ship 문서도 설계 §2–5에 대응합니다. 실제 엔진 행동은 artifact:40에 “프롬프트 문자열까지만 assert”로 미검증을 명시했습니다. |
| S2 | plan의 완료 항목에 대응 변경·커밋 실재 | MAJOR | pass | plan:7–14의 승인·테스트·구현·문서·검증·리뷰에 대응하는 변경이 존재합니다. `550743e`는 spec·plan, `f62f833`은 구현·테스트·문서, `d406f0f`는 검증 출력, `bdb69b2`는 리뷰·판별 기록을 담습니다. artifact:14–32에는 red/green 출력이 있습니다. 머지는 plan:15에서 미완료로 유지했습니다. |
| S3 | 설명 없는 스코프 밖 변경 부재 | MAJOR | pass | spec 영향 표에 review·scope·summary·테스트·명령 문서·CHANGELOG·followups가 명시되어 있고 실제 diff와 대응합니다. 추가 task 문서는 작업 기록입니다. 미커밋 변경도 handoff의 `62ce12b` 커밋 기록 추가뿐입니다. |
| S4 | 실행된 리뷰가 Reviews에 마커와 함께 기록 | MAJOR | pass | meta의 리뷰 3건이 artifact:54·76·97의 블록 및 :71·93·111의 `harness:review` 마커와 kind·scope·tip·at 모두 일치합니다. 각 리뷰의 판별·조치도 :73–74·95·113에 있습니다. |
| S5 | 검증 결과가 실제 명령·출력 인용 | BLOCKER | **fail** | artifact:14–32에는 실제 테스트 출력 인용이 있지만, :104의 **“`git diff --check`와 변경 모듈의 구문 검사는 통과했습니다.”**에는 실행 명령 전체·출력·exit code가 없습니다. 해당 부분은 산문 선언이므로 요청한 증거 기준을 충족하지 못합니다. |

파일은 수정하지 않았으며 테스트·빌드는 실행하지 않았습니다. 기존 실행 기록을 독립 실행 검증으로 간주하지 않았습니다.

**Verdict: FAIL — fail 목록: S5(BLOCKER).** 작성 세션에서 해당 검사들의 실제 명령과 출력·종료 코드를 artifact에 기록해야 합니다.
```

<!-- harness:review kind=codex-shipcheck scope=diff tip=62ce12be987a9b49f296cf04b0f3f8bb551ddc9d at=2026-10-10T16:28:19.962Z -->

**판별 (작성 세션):** S1–S4 pass 동의. S5 fail — 지적된 "`git diff --check`와 구문 검사는 통과" 문장은 기본 `codex` 리뷰 **엔진 출력 블록 안**의 리뷰어 주장이고
작성 세션의 검증 선언이 아니다(작성 세션의 검증은 `## 결과`의 출력 인용). 다만 출력 없는 주장이 artifact 에 남아 있는 것은 사실이라, 같은 검사를 직접 실행해
`## 결과` "정적 검사"에 명령·exit 를 기록했다(전부 exit 0). 코드 변경 없음. shipcheck 를 다시 돌린다.

### 2026-10-10T16:29:39.446Z — codex-shipcheck (harness-team review)

- engine: codex · scope: diff · base: refs/remotes/origin/main · mergeBase: a8e230bfbc509df3f7750740d36992472c45c3c9 · tip: c1945def9ff54aa7361a03df4c385df11dc4b59d · exit 0 · 2253 B

```text
전하, 지정 문서와 `git status`, `git diff refs/remotes/origin/main`, 커밋 이력을 직접 대조했습니다.

아래 문서 위치는 `docs/hslee/review-scope-committed/` 기준입니다.

| id | 항목 | 심각도 | 판정 | 근거 |
|---|---|---|---|---|
| S1 | spec 요구사항별 구현 또는 의도적 미구현 기록 | BLOCKER | pass | spec의 “merge-base 이후 커밋 + 미커밋 + untracked”에 diff의 `return { scope: 'worktree', base: resolved.base, mergeBase, tip }`과 프롬프트의 `committed and uncommitted, including untracked files`가 대응합니다. degrade/error 분기, 기록 필드, scope 출력, ship 문서도 설계 §1–5와 일치합니다. |
| S2 | plan 완료 항목에 대응 변경·커밋 실재 | MAJOR | pass | plan:7–14에 대응하여 `550743e`에 spec·승인 결정, `f62f833`에 구현·테스트·문서, `d406f0f`에 검증 출력, `bdb69b2`에 리뷰 판별 기록이 있습니다. artifact:14–32의 `✖`·`✔` 출력이 red/green 기록을 뒷받침합니다. 머지는 `- [ ]`로 남아 있습니다. |
| S3 | 사유 없는 스코프 밖 변경 부재 | MAJOR | pass | spec 영향 표의 review·scope·summary·테스트·명령 문서·CHANGELOG·followups가 실제 diff와 대응합니다. 추가 파일은 task 기록이며, 미커밋 diff도 handoff의 `c1945de` 커밋 기록 추가뿐입니다. |
| S4 | 실행된 리뷰 전부 Reviews에 마커로 기록 | MAJOR | pass | meta의 리뷰 4건이 artifact의 네 블록과 일치합니다. :81·103·121·147의 `harness:review` 마커에 각각 kind·scope·tip·at이 기록되어 있고 판별·조치도 있습니다. |
| S5 | 검증 결과가 실제 명령·출력 인용 | BLOCKER | pass | artifact:14–32에 테스트 명령과 실패·성공 출력, :35–36에 `npm test` 집계와 docs:check 출력이 있습니다. 이전 지적 대상도 :41–45의 `git diff --check refs/remotes/origin/main...HEAD` 및 모듈별 `node --check … → exit 0` 기록으로 보강됐습니다. |

파일은 수정하지 않았으며 테스트·빌드는 실행하지 않았습니다. 실행 근거는 artifact에 기록된 출력이며, 독립 재실행 검증은 아닙니다.

**Verdict: PASS — fail 목록: 없음.**
```

<!-- harness:review kind=codex-shipcheck scope=diff tip=c1945def9ff54aa7361a03df4c385df11dc4b59d at=2026-10-10T16:29:39.446Z -->

**판별 (작성 세션):** S1–S5 전부 pass — 1차 S5 fail 이 정적 검사 출력 기록으로 해소됐다. BLOCKER 없음, 조치 없음.

## Learnings

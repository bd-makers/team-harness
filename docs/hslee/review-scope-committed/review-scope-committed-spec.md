# review-scope-committed — Spec

## 목적 / 요구사항
*문제(오늘 무엇이 안 되는가) → 영향받는 사용자·시스템 → 기대 결과 → 제약 순으로 쓴다.
답 없는 질문은 요구가 아니다 — `## 참고` 절에 `- (open) …`으로 남긴다.*

**문제.** `--scope` 없는 `harness-team review`는 하네스 기록 파일 밖의 미커밋 편집이 하나라도 있으면 `resolveScope`
(`src/commands/review.mjs:234`)가 `{ scope: 'worktree', tip }`을 돌려준다 — base 를 계산하지 않는다. 그러면 `buildPrompt`가
scope 자리를 `working tree changes`로 채우고 리뷰어는 `git status`·`git diff`(= HEAD 대비)만 본다. **base 대비 이미 커밋한 브랜치
구현은 리뷰에서 빠진다.** 그런데도 그 실행은 `meta.reviews[]`에 기록돼 `review: required`·`verify: required`·R2 증거로 세진다
(`verifyEvidencePredicate`는 kind 만 본다 — `src/commands/task.mjs:815`). 전형적 경로: 구현을 커밋한 뒤 spec·plan 을 손보다가
(커밋 전) R2·adversarial 을 돌린다 → 리뷰어는 문서 편집만 보고 통과를 낸다.

**영향.** `scope=worktree`로 끝나는 모든 git-target 리뷰 — 공용 프롬프트와 `target: 'git'` 프레이밍 6종(adversarial·testcritic 3루브릭·
shipcheck·scenario), 명시 `--scope worktree` 포함. `harness-team scope`(`src/commands/scope.mjs`)가 worktree 에 `base: null`을 보고하고,
`commands/harness-ship.md`가 그 값을 받아 "worktree 면 `git diff --stat HEAD`"로 읽게 해 **ship 의 변경 읽기와 shipcheck 검증도 같은
결함**을 갖는다.

**기대 결과.** worktree scope 의 의미를 **"base 와의 merge-base 대비 작업 트리 전체 = base 이후 커밋 + 미커밋 + untracked"**로 넓힌다.
`resolveScope`는 worktree 에도 base 를 판정하고 merge-base sha 를 함께 돌려주며, 프롬프트는 그 sha 를 명시해 리뷰어가 `git diff <sha>`로
커밋·미커밋을 한 번에 보게 한다. 기록(`meta.reviews[]`)에 `base`·`mergeBase` 키를 더해 넓어진 의미의 기록과 과거 기록을 구분하고, `tip`과 짝지어 리뷰 범위를 사후 증명할 수 있게 한다. base 를 판정하지
못하면 실패시키지 않고 **종전 의미(미커밋만)로 degrade** 하되 그 사실을 출력에 알린다.

**제약.** 런타임 의존성 0 · 가드(`verifyEvidencePredicate`·done 가드) 불변 — scope 검사 추가안은 기각됨(아래 원천) · `diff`·`task-docs`
scope 의 판정·프롬프트 불변 · scope 자동 판정 규칙(dirty 판정·하네스 기록 파일 제외) 불변 · 프레이밍 템플릿·문서 미러의 placeholder
리터럴 불변 · 과거 기록 소급 무효화 없음 · 버전 범프·매니페스트 수정 없음(§5).

## 원천 검토 (R1)
*원천 문서(PRD·Figma·API 문서·기획서·정책서) 사이의 충돌·누락·모순을 Plan 전에 검토한다(`/harness-interview`).
충돌·모순은 `(unresolved)`, 누락은 `(open)`으로 적고, `→ 결정: …`으로 해결한 뒤 재대조해 `- 검토 완료: <날짜>`로 닫는다.
원천이 없으면 `- 없음 — <사유>` 한 줄. 원천 위치는 프로젝트가 정한다.*

### 원천
- 사람 지시(2026-10-11, 오케스트레이터 경유 brief) — followups 17 해결, 방향 "worktree = 미커밋 + base 대비 커밋", 가드 scope 검사안 기각 유지,
  spec 완성 후 needs-input 보고·대기.
- `docs/followups.md` 17번 — 결함 서술·계약 변경 범위(프롬프트 문구·harness-review.md 2단계·기록 scope 의미).
- task `review-scope-handoff` spec 설계 절 "B 판단"(가드 강화 기각 근거)·"관련 잠재 문제"(이 task 의 기원).
- `commands/harness-review.md` 2단계(scope 정본)·3단계(공용 프롬프트 정본)·5단계(`meta.reviews[]` 스키마·마커).
- `commands/harness-ship.md` 2·7·8단계·예시 — `scope --json`의 worktree `base: null`에 기대는 소비자.

### 발견
- 프롬프트는 diff 를 싣지 않는다 — 리뷰어가 git 으로 직접 본다. 그래서 "프롬프트 diff 크기"는 프롬프트 길이 문제가 아니라 **리뷰어가 볼 변경량**
  문제이고, 넓어진 worktree 의 변경량은 같은 브랜치의 diff scope + 미커밋분과 같다(새로운 상한 문제가 아니다) → 설계 절 "변경량".
- 비교점은 base ref 가 아니라 **merge-base** 여야 한다 — `git diff <base>`는 작업 트리를 base tip 과 비교해 분기 이후 base 쪽 변경까지 끌고 온다.
  diff scope 가 이미 `<base>...HEAD`(merge-base 의미)를 쓰므로 같은 기준으로 맞춘다.
- ship 은 worktree 를 "base 없음"으로 가정한다(2단계 문장·7단계 명령 주석·8단계 pr-check 주석·예시 블록) → 이 task 범위에 포함(소비자 동기화).
- 기록 스키마에 base 가 없다(`{ kind, engine, scope, tip, at, exitCode, outputBytes }`) — 넓어진 worktree 와 과거 worktree 를 기록만으로 구분할
  수 없다 → 설계 절 "기록 호환".
- 검토 완료: 2026-10-11

## 설계 / 접근

**1. 판정 — `resolveScope`.** base 사다리(명시 `--base` → origin 기본 브랜치 후보 → origin 없을 때만 로컬 `main`)를 함수 하나로 뽑아
diff·worktree 가 같이 쓴다(사다리를 둘로 복제하지 않는다). worktree 가 결정되면(자동 판정이든 명시 `--scope worktree`든):
1. base 를 사다리로 판정한다.
2. `git merge-base <base> HEAD`로 merge-base sha 를 구한다.
3. 둘 다 되면 `{ scope: 'worktree', base, mergeBase, tip }`. 빈 판정은 하지 않는다 — worktree 는 종전대로 empty 를 내지 않는다.

**degrade 와 error 의 비대칭(회귀가 나기 쉬운 곳).**

| 상황 | diff (불변) | worktree (새 동작) |
|---|---|---|
| 명시 `--base <ref>`가 없는 ref | error | **error** — 사람이 준 값이 틀렸다. 조용히 넘기면 엉뚱한 기준을 기록한다 |
| 추론 실패(origin 있는데 기본 브랜치 없음 · origin 없고 `main` 없음) | error | **degrade**: `{ scope: 'worktree', base: null, tip, degraded: '<사유>' }` |
| merge-base 없음(unborn HEAD · 관계없는 히스토리) | (diff 계산 실패 error) | **degrade** |
| git 저장소 아님 | error(명시 diff) / worktree | **degrade**(종전과 같음) |

degrade 는 종전 의미(미커밋만)다. 오늘 worktree 는 어떤 저장소에서도 실패하지 않으므로, 추론 실패를 error 로 바꾸면 base 설정이 없는 저장소의
리뷰가 새로 막힌다. 대신 **조용히 좁히지 않는다**: `review`는 사람용 출력·JSON envelope 에 "base 를 판정하지 못해 커밋된 변경은 리뷰 대상에서
빠졌다 — `--base <ref>`로 다시 실행" 경고를 싣고, `scope --json`도 같은 경고를 `nextActions`에 싣는다.

**2. 프롬프트 — fill 만 바꾼다.** placeholder 리터럴 `<working tree changes | diff against <base>>`는 그대로 둔다 — 7개 템플릿·6개 문서
미러·pin 테스트를 건드리지 않는다. 넓어진 fill 이 `working tree changes`로 **시작**하므로 placeholder 의 선택지 이름은 여전히 참이다.

| scope | fill (`buildPrompt`) |
|---|---|
| diff | `diff against <base>` (불변) |
| worktree + mergeBase | `working tree changes since <mergeBase>, the merge base with <base> — committed and uncommitted, including untracked files (git diff <mergeBase>; git status)` |
| worktree degrade | `working tree changes` (불변 — 미커밋만) |

merge-base 는 CLI 가 계산해 **sha 로** 넣는다 — 리뷰어에게 ref 만 주고 계산을 맡기면 `git diff <base>`(tip 비교)로 틀리기 쉽다. 템플릿 뒤 문장
"Inspect the changes yourself with git (git status, git diff)."는 그대로다. `--prompt-file` 경로는 scope 를 채우지 않으므로 불변.

**3. 기록 호환 — `base`·`mergeBase` 키 (Q1 결정 2026-10-11: 둘 다 기록).** `runReview`의 entry 에 git-target scope(worktree·diff)일 때
`base`(판정한 ref)와 `mergeBase`(`git merge-base <base> HEAD` sha)를 **항상 둘 다** 넣는다. worktree degrade 면 **두 키 모두 `null`**(키 생략이
아니다 — 생략은 "과거 기록"의 표지라 겹치면 안 된다). task-docs 에는 둘 다 넣지 않는다. 이유: base ref 는 나중에 움직이고 머지 뒤에는 merge-base 를
다시 계산할 수 없다 — `mergeBase`..`tip` + 미커밋이 리뷰 범위의 사후 증명이다. 해석 규칙(정본은 harness-review.md 5단계에 쓴다):
- `scope: worktree` + `base: <ref>`·`mergeBase: <sha>` → 넓어진 의미(`mergeBase` 이후 커밋 + 미커밋).
- `scope: worktree` + `base: null`·`mergeBase: null` → degrade, 미커밋만.
- `scope: worktree` + **두 키 없음** → 이 변경 이전 기록, 미커밋만(과거 의미).
- diff 기록은 키 유무와 무관하게 의미 불변(키는 감사 편의 — `mergeBase`..`tip`이 리뷰한 범위).

**소급하지 않는다.** 과거 worktree 기록은 그대로 `review`·`verify` 증거로 센다 — 가드는 scope 를 보지 않고(B 기각), 이미 있던 증거를 무효로 만들면
가드가 `--force` 훈련기가 된다(구 task 호환 절과 같은 원칙). 파서(`parseMetaReviews`·`parseReviewMarkers`)는 바꾸지 않는다 — 추가 키를 무시한다.
artifact 마커 형식(`<!-- harness:review kind= scope= tip= at= -->`)도 바꾸지 않는다 — 마커는 구 task 의 증거 형식이고 거기에 키를 더할 실익이 없다.
사람이 읽는 블록 첫 줄(`- engine: … · scope: …`)에만 `· base: <ref> · mergeBase: <sha>`를 붙인다(degrade 면 `· base: none`).

**4. `harness-team scope`.** 판정을 그대로 보고하므로 worktree 에도 `base`가 채워진다(degrade 면 `null` + 경고). `reviewHint`는 base 가 있으면
이미 `--base`를 붙인다 — 코드 변경 없이 `review <engine> --scope worktree --base '<ref>'`가 된다. `mergeBase`는 envelope `extra`에 싣는다
(ship 이 변경을 읽을 때 쓴다).

**5. ship 동기화(`commands/harness-ship.md`).** 2단계 "`worktree`면 uncommitted 변경까지 포함된 상태다" → "base 이후 커밋 + 미커밋";
7단계 worktree 명령에 `--base "$BASE"`(degrade 로 base 가 null 이면 생략); 8단계 pr-check 주석 정리; 예시 블록의 worktree 읽기를
`git diff --stat <mergeBase>` + untracked 로. shipcheck 프롬프트 미러 블록은 불변(placeholder 불변).

**6. 경계 동작.**

| 상황 | merge-base | 결과 |
|---|---|---|
| feature 브랜치, 커밋 + 미커밋 | 분기점 | 커밋 + 미커밋 모두 리뷰 — **이 task 의 목표** |
| base 브랜치(main) 위, origin 과 동기 | HEAD | 사실상 미커밋만 — 종전과 같은 대상, fill 문구만 sha 명시 |
| main 위, origin/main 보다 ahead(미푸시 커밋) | origin/main tip | 미푸시 커밋 + 미커밋 — 리뷰 안 된 변경이 맞게 들어간다 |
| main 위, origin/main 보다 behind | HEAD | 미커밋만 |
| origin 없는 저장소 | `main`과의 merge-base | feature 면 분기점, main 위면 HEAD |
| 브랜치에 커밋 없음(분기 직후) + 미커밋 | HEAD | 미커밋만 — 종전과 같음 |
| 명시 `--scope worktree` + clean | 분기점 | 커밋된 변경을 리뷰 — 종전엔 빈 대상을 리뷰했다 |
| unborn HEAD · 비-git · base 추론 실패 | — | degrade(미커밋만) + 경고 |

**7. 변경량.** 프롬프트 길이는 sha 한 개만큼 늘 뿐이다. 리뷰어가 볼 변경량은 "같은 브랜치의 diff scope + 미커밋분"이다 — 이미 diff scope 가
감당하는 크기라 새 상한을 두지 않는다. 미커밋만 리뷰하고 싶으면 `--base HEAD`(merge-base = HEAD)로 종전 범위를 명시적으로 고를 수 있다 —
새 플래그·새 scope 값을 만들지 않는다.

**영향 표.**

| 파일 | 변경 |
|---|---|
| `src/commands/review.mjs` | base 사다리 추출 · worktree·diff 에 mergeBase 판정(worktree degrade/error 비대칭) · `buildPrompt` fill · entry `base`·`mergeBase` 키 · degrade 경고 · 블록 줄에 base |
| `src/commands/scope.mjs` | `extra.mergeBase` · degrade 경고를 nextActions 에 |
| `tests/review-command.test.mjs` | S1·S2·S3 테스트 추가 |
| `tests/scope-command.test.mjs` | S4 — 기존 "worktree 는 base 를 비운다" 단언을 새 계약으로 수정(의도된 계약 변경) |
| `commands/harness-review.md` | 2단계 worktree 의미·base·degrade · 3단계 fill 규칙 · 5단계 entry 스키마와 `base` 해석 규칙 |
| `commands/harness-ship.md` | 2·7·8단계·예시의 worktree 서술 |
| `src/commands/summary.mjs` | entry 스키마 주석 한 줄(코드 불변) |
| `CHANGELOG.md` | `[Unreleased]` 항목 |
| `docs/followups.md` | 17번 삭제(task 로 올림 표시) |

**기각한 대안.**
- **가드에 scope 검사**(worktree 기록을 verify 증거에서 제외) — 선행 task "B 판단"에서 기각: 정당한 커밋 전 리뷰까지 빼면서 결함(리뷰가 커밋을 안 봄)은 못 고친다.
- **새 scope 값**(`branch`·`worktree+diff` 등) — 신·구 구분은 되지만 `SCOPES`·`--scope` 허용값·ship 분기·scope 힌트·문서 전반을 바꾸고, 사용자가
  고를 선택지만 늘린다. brief 도 "worktree 의 의미를 넓힌다"로 지시했다. 구분은 `base`·`mergeBase` 키로 충분하다.
- **placeholder 리터럴 변경** — 7 템플릿·6 문서 미러·pin 테스트를 같이 바꿔야 하는데 얻는 것은 문서 표기뿐이다. fill 이 `working tree changes`로
  시작해 리터럴이 여전히 참이다.
- **base ref 만 프롬프트에 넣고 merge-base 계산은 리뷰어에게** — `git diff <base>`(tip 비교)로 base 쪽 drift 를 끌고 오기 쉽다. sha 는 모호하지 않다.
- **추론 실패를 error 로** — 오늘 항상 성공하는 worktree 리뷰가 base 설정이 없는 저장소에서 새로 막힌다. degrade + 경고가 종전 동작의 상위집합이다.

## Ontology
*이 task가 다루는 핵심 개념의 정의. "X가 정확히 뭔가?"에 답한다.*

- **base**: scope 판정 사다리(명시 `--base` → `origin/HEAD`·`origin/main`·`origin/master` 중 실재 → origin 없을 때만 `main`)가 고른 ref. diff·worktree 공용.
- **merge-base**: `git merge-base <base> HEAD` — 브랜치가 base 에서 갈라진 커밋. diff scope 의 `<base>...HEAD`와 같은 기준점.
- **worktree scope(넓어진 의미)**: merge-base 대비 작업 트리 전체 — merge-base 이후 커밋 + 미커밋 + untracked. 기록에 `base: <ref>`·`mergeBase: <sha>`.
- **리뷰 범위 증명**: 기록의 `mergeBase`..`tip`(+ worktree 면 그 시점 미커밋). base ref 는 움직이므로 sha 가 정본이다.
- **worktree degrade**: base 또는 merge-base 를 판정하지 못한 worktree — 종전 의미(미커밋만), 기록에 `base: null`·`mergeBase: null`, 출력에 경고. 증거 자격은 그대로(Q2).
- **과거 worktree 기록**: `base`·`mergeBase` 키가 없는 `scope: worktree` 항목 — 이 변경 이전, 미커밋만. 증거 자격은 그대로.
- 게이트 근거: Goal·Constraint·Success·Context 전 항목 pass — 아래 자가진단.

## Ambiguity 자가진단
*각 항목이 명확하면 체크. 3개 이상 미체크면 구현 진입 금지 — 인터뷰/브레인스토밍으로 복귀해
모호성을 제거한다. 게이트를 통과하면 그 근거를 위 Ontology 섹션에 한 줄로 남긴다.*

- [x] **Goal 명확도** (40%) — 목표가 한 문장으로 구체화되었는가? — 근거: "worktree scope 리뷰가 base 와의 merge-base 이후 커밋까지 보게 하고, 그 의미를 기록의 `base` 키로 구분한다".
- [x] **Constraint 명확도** (30%) — 기술/시간/범위 제약이 명시되었는가? — 근거: 제약 절(의존성 0·가드 불변·diff/task-docs 불변·placeholder 불변·소급 없음·범프 없음).
- [x] **Success 기준** (30%) — 완료를 어떻게 측정하는가? — 근거: Done evidence S1–S4 + `npm test`·`npm run docs:check` 통과.
- [x] **Context 명확도** (brownfield 한정) — 영향 받는 기존 코드/파일을 식별했는가? — 근거: 설계 절 영향 표, 기준 origin/main `a8e230b`(0.49.1).
- [x] **Ambiguity ≤ 0.2** — 위 항목 가중합 ≥ 0.8 — 근거: 전 항목 pass(가중합 1.0). 열린 질문 Q1–Q3 은 2026-10-11 사람 결정으로 닫혔다(참고 절).

<!-- 선택 선언. 아래 주석을 벗기면 done 가드가 검사한다.
     미선언 기본값: "tests": "required" (소스가 바뀌면 테스트 파일 변경을 요구), "review": "optional",
     "verify": "optional" ("required"면 검증 프레이밍 kind 마커 — -adversarial 등 — 를 요구).
     R2(옵트인): "scenarios": [{ "id", "given", "when", "then", "test", "cmd" }] — 수용 기준을 Given/When/Then으로 쓰고
     증거(테스트 이름·명령)를 잇는다. `harness-team scenario check`가 cmd exit 0을, `review <engine> --framing scenario`가
     "증거가 Then을 검증하는가"를 판정한다. 선언하면 verify 증거는 -scenario kind만 센다. -->
## Done evidence
```json
{
  "version": 1,
  "review": "required",
  "scenarios": [
    {
      "id": "S1",
      "given": "활성 task 가 있고 origin 없는 저장소의 feature 브랜치에 main 이후 구현 커밋이 있으며, 그 위에 추적 파일 미커밋 편집이 있다",
      "when": "--scope 없이 resolveScope 와 review 를 실행한다",
      "then": "scope 는 worktree, base 는 main, mergeBase 는 분기점 sha 다. 엔진에 간 프롬프트가 그 sha 와 'committed and uncommitted' 를 담고, meta.reviews 항목이 scope=worktree·base=main·mergeBase=분기점 sha 로 기록된다",
      "test": "resolveScope: worktree scope carries the merge base so committed branch changes are reviewed",
      "cmd": "node --test --test-name-pattern=\"resolveScope: worktree scope carries the merge base so committed branch changes are reviewed\" tests/review-command.test.mjs"
    },
    {
      "id": "S2",
      "given": "origin 이 있지만 origin/HEAD·origin/main·origin/master 가 모두 없는 저장소에 미커밋 편집이 있다",
      "when": "--scope 없이 review 를 실행하고, 이어서 --scope worktree --base nope 로 실행한다",
      "then": "첫 실행은 실패하지 않고 scope=worktree·base=null·mergeBase=null 로 기록되며 프롬프트는 종전 'working tree changes' 이고 출력에 커밋된 변경이 빠졌다는 경고가 있다. 둘째 실행은 exit 1 이고 아무것도 기록하지 않는다",
      "test": "resolveScope: worktree degrades to uncommitted-only when the base cannot be inferred",
      "cmd": "node --test --test-name-pattern=\"resolveScope: worktree degrades to uncommitted-only when the base cannot be inferred\" tests/review-command.test.mjs"
    },
    {
      "id": "S3",
      "given": "origin 없는 저장소의 main 위(브랜치 커밋 없음)에 미커밋 편집이 있다",
      "when": "--scope 없이 resolveScope 를 실행한다",
      "then": "scope 는 worktree, base 는 main, mergeBase 는 HEAD sha 다 — base 브랜치 위에서는 종전과 같은 대상(미커밋)만 본다",
      "test": "resolveScope: worktree on the base branch has its merge base at HEAD",
      "cmd": "node --test --test-name-pattern=\"resolveScope: worktree on the base branch has its merge base at HEAD\" tests/review-command.test.mjs"
    },
    {
      "id": "S4",
      "given": "origin 없는 저장소에 미커밋 편집이 있다",
      "when": "harness-team scope --json 을 CLI 로 실행한다",
      "then": "exit 0, scope 는 worktree, base 는 main(null 이 아님), extra 에 mergeBase 가 있고 review 안내에 --base 가 붙는다",
      "test": "CLI scope: dirty worktree reports its base and merge base",
      "cmd": "node --test --test-name-pattern=\"CLI scope: dirty worktree reports its base and merge base\" tests/scope-command.test.mjs"
    }
  ]
}
```

## 참고
*코드 기반 참조가 산문 설계보다 정밀하다 — 테스트 스위트·Boundary contract(JSON Schema)·
다이어그램·기존 코드 경로를 우선 링크하고, 산문은 코드로 표현 못 하는 의도만 담는다.*

- 판정: `src/commands/review.mjs` `resolveScope`(base 사다리 L266–303) · 프롬프트 `buildPrompt`(L50) · 기록 `runReview` entry(L542)·`renderReviewBlock`(L118)
- 소비자: `src/commands/scope.mjs` `runScope`·`reviewHint` · `commands/harness-ship.md` 2·7·8단계·예시 · `src/commands/pr-check.mjs:184`(명시 diff — 불변)
- 가드(불변): `src/commands/task.mjs` `verifyEvidencePredicate`·`parseMetaReviews`·`parseReviewMarkers`
- (resolved 2026-10-11) **Q1 기록 필드** → 결정(사람, 오케스트레이터 경유): `base`와 `mergeBase`를 둘 다 기록한다. base ref 는 움직이고 머지 뒤 merge-base 는 재계산할 수 없어 `tip`과 짝지은 sha 가 범위의 사후 증명이다. degrade 는 두 키 모두 `null`(생략 아님) — 설계 3.
- (resolved 2026-10-11) **Q2 degrade 처리** → 결정: 출력 경고 + `base: null` 기록만, 증거 제외 없음(제외는 기각된 B 의 변형).
- (resolved 2026-10-11) **Q3 다이어그램** → 결정: 생략. plan 에 단계를 두지 않는다.

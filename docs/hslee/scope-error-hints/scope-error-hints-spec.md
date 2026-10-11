# scope-error-hints — Spec

## 목적 / 요구사항
*문제(오늘 무엇이 안 되는가) → 영향받는 사용자·시스템 → 기대 결과 → 제약 순으로 쓴다.
답 없는 질문은 요구가 아니다 — `## 참고` 절에 `- (open) …`으로 남긴다.*

**문제.** PR #143(task `review-retry-hint`)이 `review`·`scope` 의 retry 를 원인 종류(`errorKind`)로 고르게 했지만, 두 안내가 여전히 원인과 무관한 한 문장이다.
- (followups 20) `harness-team scope` 오류의 `alternatives`(`src/commands/scope.mjs` `runScope`)는 모든 오류에 "`git remote -v` 와
  `git symbolic-ref refs/remotes/origin/HEAD` 로 기본 브랜치 설정을 확인" 을 낸다. 맞는 것은 `default-base` 뿐이다.
- (followups 21) `harness-team pr-check` 의 base 오류 retry(`src/commands/pr-check.mjs` `emitBaseError`)는 pre-push 가 아니면
  "`--base <ref>` 로 기준을 직접 주거나 `git remote set-head origin -a` 로 origin/HEAD 를 설정" 한 문장이다. set-head 는 `base-missing`·`not-git`·
  `diff-failed` 어느 것도 고치지 못한다. pre-push 는 set-head 만 안내한다.

**영향.** 오류 envelope 를 읽고 재시도하는 사람·에이전트, 그리고 pre-push 훅에 막힌 사람. 차단·exit 은 이미 옳다 — 결함은 안내뿐(경미).

**기대 결과.** 두 안내가 원인 종류에 맞는다. 따라 해도 고쳐지지 않는 안내를 하지 않는다.

**제약(오케스트레이터 브리프).** `errorKind` 4값을 재사용한다(새 종류를 만들지 않는다). `flags.base` 유무로 분기하지 않는다.
불변: cause 문자열(followups 22 범위), exit code, JSON envelope 형태, `stop`(D11 강제 검사), `safeDefault`, `originIsEmpty` 통과 분기,
`review`·`scope` 의 retry(#143 결과). `review` 의 scope 오류 패킷은 건드리지 않는다. 버전·매니페스트 무변경.

## 원천 검토 (R1)

### 원천
- `docs/followups.md` 20·21번(main `a493364`) — 소스 위치·실측·고칠 방향·테스트 자리.
- task `review-retry-hint` spec `## 설계 / 접근` 의 종류별 retry 표.
- 오케스트레이터 브리프(2026-10-11).

### 발견
- **followups 21 의 "pre-push 는 사실상 `default-base` 만 닿는다" 는 틀렸다 → 결정: pre-push 갈래도 종류별로 고른다.** 실측(2026-10-11, git 2.54.0,
  origin + origin/HEAD 를 세운 저장소에서 `resolveScope({ scope: 'diff' })`, 훅과 같이 `--base` 없음):
  - orphan 브랜치(`gh-pages` 형태)를 체크아웃한 채 → `diff-failed`(`origin/main...HEAD` 에 merge-base 없음).
  - unborn HEAD(`checkout --orphan`, 커밋 전) → `diff-failed`.
  - bare 저장소 → `not-git`(`git status` 가 work tree 를 요구). 단 `init` 은 bare 저장소에 훅을 설치하지 않는다.
  pr-check 는 base 판정을 **체크아웃된 HEAD** 로 하므로(`resolveScope` 의 `<base>...HEAD`), 피처 브랜치를 push 해도 HEAD 가 무관한 히스토리면 막힌다.
- `review` 의 scope 오류 패킷에는 `alternatives` 가 없다(`review.mjs` `runReview` 의 `if (scoped.error)` — `buildErrorPacket` 에 `alternatives` 미전달). 사실이다 → review 는 건드리지 않는다.
- `errorKind` 는 이미 pr-check 의 판정 경로에 실려 온다 — pr-check 는 `resolveScope({ scope: 'diff' })` 를 부르고, 그 diff 갈래의 모든 error(`not-git`·
  `resolveBase` 의 두 갈래·`diff-failed`)에 #143 이 종류를 붙였다(위 실측이 확인). 판정 지점에 새로 실을 것은 없다 — `emitBaseError` 에 넘기기만 한다.
- `renderErrorPacket` 은 빈 `alternatives` 의 줄을 내지 않는다(`...packet.alternatives.map`, 주석 `observation.mjs`). `buildErrorPacket` 의 기본값도 `[]` 다.
- 문서 미러: 바뀌는 문구를 싣는 현행 문서 없음. `commands/harness-review.md` 2단계의 set-head 안내는 `default-base`(origin 이 있는데 기본 브랜치를
  못 찾음) 설명이라 그대로 맞다.
- 검토 완료: 2026-10-11

## 설계 / 접근

**원인 종류는 #143 의 `errorKind` 를 그대로 쓴다.** 두 명령 모두 호출부의 표 조회만 바뀐다. 모르는 종류(미래 경로)는 `default-base` 항목으로 떨어진다 — 종전 동작.

### 20 — `scope` 오류 `alternatives`

| `errorKind` | `alternatives` |
|---|---|
| `base-missing` | `[]` |
| `default-base` | **종전 그대로** — `git remote -v` 와 `git symbolic-ref refs/remotes/origin/HEAD` 로 기본 브랜치 설정을 확인 |
| `not-git` | `[]` |
| `diff-failed` | `[]` |

- 맞는 대안이 없는 종류는 빈 배열이다. text 출력에서 `alternatives:` 줄이 사라지고, JSON 은 `alternatives: []`(필드 유지 — envelope 형태 불변).
- 알려진 거칠기(고치지 않음): origin 이 없는 `default-base`(`base ref "main" 를 찾을 수 없음`)도 원격 확인 줄을 받는다. 브리프가 4값 재사용을 정했고
  `git remote -v` 는 origin 부재를 보여 주므로 해롭지 않다.

### 21 — `pr-check` base 오류 retry

| `errorKind` | 수동 실행(`--pre-push` 없음) | pre-push |
|---|---|---|
| `base-missing` | 존재하는 `--base <ref>` 로 기준을 직접 주고 다시 실행 | (왼쪽과 같음) |
| `default-base` | **종전 그대로** — `--base <ref>` 로 기준을 직접 주거나 `git remote set-head origin -a` 로 origin/HEAD 를 설정 | **종전 그대로** — `git remote set-head origin -a` 로 origin/HEAD 를 설정한 뒤 다시 push |
| `not-git` | git 저장소 안에서 실행하거나 `--target <저장소 경로>` 로 저장소를 가리켜 다시 실행 | (왼쪽과 같음) |
| `diff-failed` | HEAD 와 공통 조상이 있는 `--base <ref>` 를 주고 다시 실행(`git merge-base <ref> HEAD` 로 확인) | 기본 브랜치와 공통 조상이 있는 브랜치를 체크아웃한 뒤 다시 push — 훅은 체크아웃된 HEAD 로 base 를 판정한다(`git merge-base <기본 브랜치> HEAD` 로 확인) |

- pr-check 는 diff scope 고정이다 — 어느 문구도 `--scope worktree` 를 권하지 않는다. set-head 는 `default-base` 에만 남는다.
- **pre-push 는 `default-base`·`diff-failed` 만 덮는다.** 훅은 `--base` 없이 부르므로(`src/git-hooks.mjs` `PRE_PUSH_BLOCK`) `--base` 안내는 소용없다 —
  그래서 그 두 종류는 push 를 다시 시도하는 문구로 둔다. `base-missing` 은 수동 `--pre-push --base <ref>` 에서만, `not-git` 은 훅이 설치되지 않는 bare 저장소에서만
  닿으므로 수동 실행 문구를 그대로 쓴다(`--base` 를 준 사람에게 `--base` 를 고치라는 것은 맞다).
- pre-push 의 `--no-verify` 우회는 `alternatives` 에 이미 있다 — retry 에 반복하지 않는다. `alternatives`(pre-push 만)·`stop`·`safeDefault` 는 그대로다.
- **기존 테스트 픽스처 이동.** `pr-check: base 를 판정하지 못하면 차단(exit 1) — pre-push 는 set-head 와 --no-verify 를 알린다` 는 `--base nosuch`(`base-missing`)로
  pre-push 를 재현했다 — 훅이 닿지 않는 종류다. 이제 `base-missing` 은 set-head 를 받지 않으므로, 단언은 그대로 두고 픽스처를 훅이 실제로 닿는 `default-base`
  (origin 이 있고 `origin/HEAD`·`origin/main`·`origin/master` 가 없음)로 옮긴다. 브리프가 허용한 retry 변경의 결과이지 계약 위반이 아니다.

## Ontology
*이 task가 다루는 핵심 개념의 정의. "X가 정확히 뭔가?"에 답한다.*

- **scope 오류 원인 종류(`errorKind`)**: #143 의 정의 그대로(`base-missing`·`default-base`·`not-git`·`diff-failed`). 이 task 는 `scope` 의 `alternatives` 와
  `pr-check` 의 retry 선택에도 쓴다 — 값·발생 자리는 바뀌지 않는다.
- **pre-push 판정 HEAD**: pr-check 의 base 판정은 push 되는 sha 가 아니라 체크아웃된 HEAD 로 한다(`resolveScope` 의 `<base>...HEAD`). 그래서 pre-push 의
  `diff-failed` 는 "HEAD 를 바꾸라" 가 맞는 안내다.
- 게이트 통과(2026-10-11): 목표·제약은 브리프가 고정했고, 영향 코드는 두 파일 두 자리로 식별됐으며, 성공은 종류별 회귀 테스트로 잰다. 브리프가 맡긴 판단(pre-push 갈래)은 실측으로 닫았다.

## Ambiguity 자가진단
*각 항목이 명확하면 체크. 3개 이상 미체크면 구현 진입 금지 — 인터뷰/브레인스토밍으로 복귀해
모호성을 제거한다. 게이트를 통과하면 그 근거를 위 Ontology 섹션에 한 줄로 남긴다.*

- [x] **Goal 명확도** (40%) — `scope` alternatives·`pr-check` retry 가 원인 종류(4종)에 맞게 갈린다.
- [x] **Constraint 명확도** (30%) — `errorKind` 재사용, `flags.base` 분기 금지, cause·exit·envelope·stop·originIsEmpty·review/scope retry 불변, 버전 무변경.
- [x] **Success 기준** (30%) — 종류별 회귀 테스트가 구현 전 ✖, 구현 후 ✔ + `npm test`·`npm run docs:check` 통과.
- [x] **Context 명확도** (brownfield 한정) — `scope.mjs` `runScope`, `pr-check.mjs` `emitBaseError`·`runPrCheck`, `git-hooks.mjs` `PRE_PUSH_BLOCK`, `observation.mjs` `renderErrorPacket` 확인.
- [x] **Ambiguity ≤ 0.2** — 위 항목 가중합 = 1.0

<!-- 선택 선언. 아래 주석을 벗기면 done 가드가 검사한다.
     미선언 기본값: "tests": "required" (소스가 바뀌면 테스트 파일 변경을 요구), "review": "optional",
     "verify": "optional" ("required"면 검증 프레이밍 kind 마커 — -adversarial 등 — 를 요구).
     R2(옵트인): "scenarios": [{ "id", "given", "when", "then", "test", "cmd" }] — 수용 기준을 Given/When/Then으로 쓰고
     증거(테스트 이름·명령)를 잇는다. `harness-team scenario check`가 cmd exit 0을, `review <engine> --framing scenario`가
     "증거가 Then을 검증하는가"를 판정한다. 선언하면 verify 증거는 -scenario kind만 센다. -->
## Done evidence
<!--
```json
{ "version": 1, "review": "required", "tests": "skip" }
```
-->

## 참고
*코드 기반 참조가 산문 설계보다 정밀하다 — 테스트 스위트·Boundary contract(JSON Schema)·
다이어그램·기존 코드 경로를 우선 링크하고, 산문은 코드로 표현 못 하는 의도만 담는다.*

- 코드: `src/commands/scope.mjs` (`runScope`), `src/commands/pr-check.mjs` (`emitBaseError`, `runPrCheck`)
- 테스트: `tests/scope-command.test.mjs` (`CLI scope error alternatives:`), `tests/pr-check.test.mjs` (`pr-check base error retry:`)
- 출처: `docs/followups.md` 20·21번(이 task 로 올려 지움), task `review-retry-hint`

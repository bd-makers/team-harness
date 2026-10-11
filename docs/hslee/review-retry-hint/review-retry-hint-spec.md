# review-retry-hint — Spec

## 목적 / 요구사항
*문제(오늘 무엇이 안 되는가) → 영향받는 사용자·시스템 → 기대 결과 → 제약 순으로 쓴다.
답 없는 질문은 요구가 아니다 — `## 참고` 절에 `- (open) …`으로 남긴다.*

**문제.** `harness-team review` 가 scope 를 결정하지 못하면(exit 1, 엔진 미실행) 오류 envelope 의 `retry:` 는 원인과 무관하게
한 문장이다 — "`--scope worktree` 를 명시하거나 존재하는 `--base <ref>` 를 주고 다시 실행"(`src/commands/review.mjs:506`).
`--scope worktree --base <없는 ref>` 처럼 worktree 를 이미 명시한 호출에서는 앞 절반이 어긋나고, 따라 해도 같은 오류가 난다
(followups 19, 실측: task `review-scope-committed` artifact `### 실사용 검증`). standalone `scope` 명령의 retry(`src/commands/scope.mjs:46`)도
같은 이유로 어긋난다 — 아래 `### scope.mjs 판정`.

**영향.** 오류 envelope 를 읽고 재시도하는 사람·에이전트(ship 계약이 envelope 를 따른다). 기록·exit 은 이미 옳다 — 결함은 안내뿐(경미).

**기대 결과.** retry 문구가 원인 종류에 맞는다. 따라 해서 같은 오류가 나는 안내를 하지 않는다.

**제약(오케스트레이터 결정).** 후보 (B) — `resolveScope` 가 error 와 함께 원인 종류를 돌려주고 호출부가 그것으로 retry 를 고른다.
`flags.base !== undefined` 로 분기하지 않는다. 원인 문자열(`cause`)·exit code·`safeDefault`·`stop`·`alternatives`·JSON envelope 형태는
바꾸지 않는다 — retry 문자열만 바뀐다. 버전·매니페스트 무변경.

## 원천 검토 (R1)

### 원천
- `docs/followups.md` 19번(main `5428c46`) — 소스 위치·세 경로·후보 A/B·`:272`/`:288` 예외·선행 조건.
- 오케스트레이터 브리프(2026-10-11) — (B) 선택과 원인 종류별 retry 규칙.

### 발견
- 두 원천은 일치한다. 브리프가 `:288`(diff 계산 실패) 문구를 spec 에 맡겼다 → 결정: 아래 표.
- `:288` 의 실제 발생 경로를 실측했다: 관계없는 히스토리의 ref 를 base 로 주면 `git diff --stat other...HEAD` 가
  `fatal: other...HEAD: no merge base`(exit 128, git 2.54.0). 다른 경로는 커밋 없는 HEAD. 둘 다 merge-base 가 없다는 뜻이다.
  그 밖의 `git diff` 예외(출력 버퍼 초과 등)도 같은 종류로 오지만 드물다 — 안내는 흔한 경우에 맞춘다.
  cause 는 `err.message` 첫 줄(실행한 명령줄)이라 git 의 stderr(`no merge base`)를 싣지 않는다 — 기존 동작이고 범위 밖(followups 22).
- 검토 완료: 2026-10-11

## 설계 / 접근

**원인 종류는 판정하는 자리에서 붙인다.** `resolveBase` 는 이미 두 갈래를 안다 — 기본 base 사다리가 후보를 못 찾은 갈래
(`!resolvedBase`, 원인 문자열 `:340`)와 마지막 `rev-parse --verify` 가 실패한 갈래(`:347`). 후자는 사람이 준 `--base` 에서만 닿는다
(사다리 후보는 이미 `--verify` 를 통과한 것만 채택하므로). 그래서 `flags.base` 를 보지 않고도 정확히 갈린다.
`resolveScope` 는 그 값을 그대로 넘기고, 자기가 만드는 두 error 에 종류를 붙인다.

| `errorKind` | 발생 자리 | `review` retry | `scope` retry |
|---|---|---|---|
| `base-missing` | `:277` worktree + 없는 `--base`, `:284` diff + 없는 `--base` (`resolveBase` `:347`) | 존재하는 `--base <ref>` 를 주고 다시 실행 | 존재하는 `--base <ref>` 로 기준을 직접 주고 다시 실행 |
| `default-base` | `:284` `--base` 없음, 기본 base 판정 실패 (`resolveBase` `:340`) | **종전 그대로** | **종전 그대로** |
| `not-git` | `:272` diff scope + git 저장소 아님 | `--scope worktree` 를 명시해 다시 실행 | `--scope worktree` 로 워킹트리 전체를 대상으로 다시 실행 |
| `diff-failed` | `:288` `git diff <base>...HEAD` 실패 | HEAD 와 공통 조상이 있는 `--base <ref>` 를 주거나(`git merge-base <ref> HEAD` 로 확인) `--scope worktree` 로 다시 실행 — worktree 는 merge-base 를 못 잡으면 미커밋만 본다 | HEAD 와 공통 조상이 있는 `--base <ref>` 를 주거나(`git merge-base <ref> HEAD` 로 확인) `--scope worktree` 로 다시 실행 — worktree 는 merge-base 를 못 잡으면 미커밋만 본다 |

- `base-missing` 에 `--scope worktree` 를 권하지 않는다 — worktree 도 사람이 준 `--base` 가 없으면 `:277` 에서 같은 오류다.
- `not-git` 은 종전 문장의 뒤 절반("존재하는 `--base`")을 뺀다. git 저장소가 아니면 base 를 줘도 `:272` 에서 같은 오류이고, worktree 만
  `:273` 에서 base 검사 전에 degrade 한다. 브리프의 "`--scope worktree` 안내 유지" 안에서 따라 해도 실패하는 절반만 덜어낸 것이다.
- `diff-failed` 는 base 가 이미 존재하므로 "존재하는" 이 아니라 "HEAD 와 공통 조상이 있는" 이 맞는 조건이다. worktree 는 같은 base 로
  `mergeBaseOf` 가 null 이면 degrade(경고 + 미커밋만)하므로 실패하지 않는다 — 좁아진다는 사실을 문구에 함께 적는다.
- `default-base` 는 종전 문장이 이미 옳다(worktree 는 base 추론 실패 시 degrade, 다른 `--base` 도 해법). 바이트 그대로 둔다.
- 종류를 모르는 error(미래 경로)는 종전 문장으로 떨어진다 — 맵 조회 실패 시 기본값.

**필드 이름은 `errorKind`.** `kind` 는 리뷰 kind(`codex-adversarial` 등) 개념과, `reason` 은 `degraded` 와 겹친다.

**호출부 계약.** `resolveScope` 의 호출부는 셋이다 — `review.mjs:502`, `scope.mjs:37`, `pr-check.mjs:184`. 셋 다 `.error` 만 읽고
결과 객체를 그대로 직렬화하지 않는다. 테스트에도 error 객체를 `deepEqual` 하는 곳이 없다(`grep deepEqual tests/` — 성공 결과 두 건뿐).
필드 추가는 기존 계약을 깨지 않는다. `pr-check` 는 자기 문구(`emitBaseError`)를 쓰고 diff scope 만 쓰므로 이 task 범위 밖이다.

### scope.mjs 판정
**해당 있음 — 같이 고친다.** `harness-team scope --scope worktree --base nope` 는 `:277` 에서 error 이고, retry 가
"`--base <ref>` 로 기준을 직접 주거나, `--scope worktree` 로 워킹트리 전체를 대상으로 다시 실행" 이라 이미 준 worktree 를 다시 권한다.
같은 `errorKind` 로 고친다(위 표 오른쪽 열). `alternatives`(`git remote -v`·`symbolic-ref` 확인)는 `default-base` 에만 맞지만
브리프가 retry 외 필드를 고정했으므로 두고, 보고에 남긴다.

### 문서 미러
retry 문구는 `commands/`·`skills/`·`docs/*.md`·`docs/harness-overview.html` 어디에도 실려 있지 않다(grep "명시하거나"·"워킹트리 전체를 대상으로" 0건).
동기화 대상 없음 — `docs:check` 로 확인만 한다.

## Ontology
*이 task가 다루는 핵심 개념의 정의. "X가 정확히 뭔가?"에 답한다.*

- **scope 오류 원인 종류(`errorKind`)**: `resolveScope` 가 `{ error }` 를 돌려줄 때 함께 싣는 판정 갈래. 값은 `base-missing`(사람이 준
  `--base` 가 없는 ref) · `default-base`(`--base` 없이 기본 base 를 못 찾음) · `not-git`(diff scope 인데 git 저장소 아님) ·
  `diff-failed`(base 는 있으나 `<base>...HEAD` diff 실패 — merge-base 없음). retry 문구 선택에만 쓰고 원인 문자열은 그대로다.
- **retry 문구**: 오류 envelope 의 `safe_retry`. 따라 했을 때 같은 오류가 나면 안 된다는 것이 이 task 의 기준이다.
- 게이트 통과(2026-10-11): 목표·제약은 브리프가 고정했고, 영향 코드는 두 파일 네 갈래로 식별됐으며, 성공은 종류별 회귀 테스트로 잰다.

## Ambiguity 자가진단
*각 항목이 명확하면 체크. 3개 이상 미체크면 구현 진입 금지 — 인터뷰/브레인스토밍으로 복귀해
모호성을 제거한다. 게이트를 통과하면 그 근거를 위 Ontology 섹션에 한 줄로 남긴다.*

- [x] **Goal 명확도** (40%) — scope 오류 retry 가 원인 종류(4종)에 맞게 갈린다.
- [x] **Constraint 명확도** (30%) — (B) 방식, retry 외 필드·exit·envelope 불변, `flags.base` 분기 금지, 버전 무변경.
- [x] **Success 기준** (30%) — 종류별 회귀 테스트가 구현 전 ✖(종전 문구), 구현 후 ✔ + `npm test`·`npm run docs:check` 통과.
- [x] **Context 명확도** (brownfield 한정) — `review.mjs` `resolveBase`·`resolveScope`·`:506`, `scope.mjs:46`, 호출부 3곳 확인.
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

- 코드: `src/commands/review.mjs` (`resolveBase`, `resolveScope`, `runReview` 의 `if (scoped.error)`), `src/commands/scope.mjs` (`runScope`)
- 테스트: `tests/review-command.test.mjs`, `tests/scope-command.test.mjs` — `scope error retry` 이름의 신규 테스트
- 출처: `docs/followups.md` 19번(이 task 로 올려 지움)

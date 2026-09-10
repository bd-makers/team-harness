# review-evidence-cli-owned — Artifact

*최종 결과물과 학습 내용을 기록한다.*

## 결과

**`harness-team review`가 리뷰 엔진의 실행과 증거 기록을 소유한다.** 성공(exit 0)한 실행만 artifact
`## Reviews` 블록(출력 + 종전 형식 마커)과, `reviews` 키가 있는 meta의 `reviews[]`에 기록한다.
`verify: required` 가드는 CLI 소유 task에서 `meta.reviews`만 센다 — 손으로 쓴 마커는 검증 증거가 아니다.
구 task(키 없음)는 CLI가 키를 만들지 않고 종전 판정 그대로다.

| 변경 | 위치 |
|---|---|
| `review` 명령 신설 — 엔진 결정(probe 체인)·scope·runner 표·`--framing`·`--prompt-file`·기록 | `src/commands/review.mjs` (신설), `src/cli-args.mjs`, `bin/harness-team.mjs` |
| 가드 분기: `reviews` 키 있으면 verify=meta만, review=meta∪마커; 없으면 종전 | `src/commands/task.mjs` `collectDoneIssues` + `parseMetaReviews` |
| meta 템플릿 `reviews: []` | `src/commands/summary.mjs` |
| 문서 계약: 3·5단계 CLI 호출, 마커 손 작성 지시 제거, 구 task 호환·동시성 전제 | `commands/harness-review.md` |
| 프레이밍 7종이 `--framing --prompt-file`로 호출 | `commands/harness-{adversarial-review,unittest,inttest,comptest,ship,contrarian,simplifier}.md` |
| meta 필드 문서 | `commands/harness-task.md` |
| 다이어그램 | `review-evidence-cli-owned-diagram.html` (inline SVG) |

**검증.**
- `tests/review-command.test.mjs` 15건(기록/미기록/framing/상한/치환/fence/프롬프트 pin/scope/엔진 결정 +
  리뷰 반영 5건), `tests/done-guard.test.mjs` +6건(CLI 소유 차단/통과/창·깨진 항목/구 task 회귀/review 양쪽/파서).
- `npm run test` 전체 통과, `npm run docs:check` 최신.
- **dogfood**: 이 변경 자체를 새 CLI로 `review claude --framing adversarial` 실행 → `meta.reviews[0]` 기록 →
  아래 블록. 이 task의 `done`이 그 항목으로 `verify: required`를 통과하는 것이 최종 E2E다.

**검증이 증명하지 못하는 것.** 리뷰 **품질**은 여전히 기계가 판정하지 않는다 — exit 0과 출력 존재까지다.
meta를 손으로 고치는 위조는 막지 않는다(위협 모델 밖, `done-guard-window` 결정). 같은 task에 리뷰를
동시에 두 번 돌리면 meta read-modify-write가 경합한다 — 기존 meta 쓰기 전부와 같은 D4 전제다.


## Reviews
*Codex 등 리뷰 실행 시 결과(요약·발견·조치)를 날짜와 함께 남긴다. 남기지 않은 리뷰는 "안 한 것"으로 간주.*
*기계 판독용 마커를 함께 남긴다: `<!-- harness:review kind=codex scope=worktree tip=<sha|none> at=<ISO8601> -->`*


## Learnings


### 2026-09-10T16:16:37.115Z — claude-adversarial (harness-team review)

- engine: claude · scope: worktree · tip: 826826bb98a9647b1fea1733c1a9c5123e9ffd71 · exit 0 · 10555 B

````text
## Adversarial review — `review.mjs` + `meta.reviews` verify-evidence change

I read the full working-tree diff, `src/commands/review.mjs`, `src/commands/task.mjs` (`collectDoneIssues`/`parseMetaReviews`), `src/commands/summary.mjs`, the spec, and both new/changed test files (`tests/review-command.test.mjs`, `tests/done-guard.test.mjs`).

### (1) `{prompt}` substitution via `sh -c` — **P1, blocking**

`posixSingleQuote` (review.mjs:65-67) is correct POSIX single-quote escaping *in isolation*, and `runEngine`'s custom branch (review.mjs:212-217) uses `spawn` with an args array (no outer shell), so nothing added by *this* call leaks. But the safety contract ("POSIX 단일 인용 리터럴 하나," comment at :64, and the spec at line 29-30 "실행 계약을 바꾸지 않는다") silently assumes the template author places `{prompt}` in a **bare, unquoted** word position, exactly like the documented example at :138 (`"mycli review --readonly {prompt}"`). Nothing validates that assumption.

Concrete break: a reviewers.json author writes what looks like the *more* careful version —
```json
{ "custom": { "command": "echo '{prompt}'" } }
```
`resolveEngine` accepts it (only checks `.includes('{prompt}')`, review.mjs:137). At runtime, `command.split('{prompt}').join(posixSingleQuote(prompt))` (review.mjs:216) produces `echo ''` + `posixSingleQuote(prompt)` + `''`. Tracing shell quote-toggling: the template's own `'` pairs with the *first* `'` emitted by `posixSingleQuote`, closing an empty quoted string after only 2 characters — everything from that point until the *next* stray `'` is now **unquoted**. For `prompt = "hello; rm -rf /tmp"` this yields the literal script `echo ''hello; rm -rf /tmp''`, which the shell parses as `echo` (empty arg) **followed by a second, fully unquoted command `rm -rf /tmp`**. The "single-quote literal" contract is defeated by the template itself, no malicious reviewers.json content beyond a plausible authoring mistake is required, and the injected content comes from `prompt` — which is built from CLI focus args or `--prompt-file` content (review.mjs:43-52, :312-323), i.e., attacker/operator-influenced text, not from the trusted template.

No test exercises `{prompt}` nested inside template-authored quotes — `tests/review-command.test.mjs:128-139` only tests shell-metacharacter-laden *focus* text against the documented bare-placeholder template, which is exactly the case that already works.

This isn't fixable by "just don't misconfigure it" — the whole point of the escaping layer is to make the substitution safe *regardless* of prompt content; it currently isn't safe regardless of template content, and the code gives no signal (error, warning, doc enforcement) when the precondition is violated.

### (2) `meta.reviews` as verify source — **P1, blocking (functional regression, not security)**

The spec's constraint (review-evidence-cli-owned-spec.md:31, Ontology "degrade" at :103-104) is explicit: legacy tasks (no `reviews` key) must not have their existing evidence retroactively invalidated. The decision table (spec:69-72) is framed as two *static* states (key present / key absent) but the code never treats "key present" as an opt-in — it treats it as **whatever state `meta.json` happens to be in the instant `collectDoneIssues` runs** (task.mjs:604 `cliOwned = Boolean(meta && Array.isArray(meta.reviews))`), and `runReview` unconditionally adds the `reviews` key to *any* meta object on its very first successful call, for *any* engine/framing (review.mjs:353-355), not just a verify-framed one.

Concrete break: a legacy task has an in-window, hand-written verify marker in `artifact.md` (satisfies `verify: required` today). The operator runs a plain `harness-team review codex` (no `--framing`) simply to pick up fresh `review: required` evidence, or just to try the new CLI. That single call writes `meta.reviews: [{kind:'codex', ...}]` to the previously-key-less meta.json. On the *next* `done` check, `cliOwned` flips to `true`, `freshCli` contains only the non-verify-framed `codex` entry, `verifySource` at task.mjs:615 becomes `freshCli` (the old marker is now ignored), and `evidence.verify === 'required'` at task.mjs:616 now fails — a gate that was passing moments earlier now blocks, with no warning that the ordinary act of running `review` did this. This is exactly the "소급하면 이미 닫힌 증거가 무효가 되어 가드가 `--force` 훈련기가 된다" failure mode the spec says it's designed to avoid, reached through a path the spec doesn't discuss (the field being added as a *side effect* of an unrelated call, rather than as a deliberate migration).

Test coverage does not catch this: `tests/done-guard.test.mjs:883-893` ("CLI 소유 meta(reviews: []) + 손으로 쓴 verify 마커만 → 차단") hand-constructs a meta that *already* has `reviews: []` — it's testing the new-task-template case, not the legacy-task-transition case. `:920-929` tests the legacy no-key case but never calls `runReview` to trigger the flip. No test drives `runReview` against a fixture whose `demo-meta.json` starts without a `reviews` key and then asserts on the resulting `done` verdict.

### (3) `collectDoneIssues` — failed-engine-run evidence — **checked, no live bug (P3 hardening gap only)**

`runReview` only constructs and writes the `entry`/`meta.reviews` push *after* the early return on `result.exitCode !== 0` (review.mjs:333-341 return before :349-356 write), and the `run()` helper correctly maps a signal-killed child (`code === null`) to `exitCode: 1` via `code ?? 1` (review.mjs:203-204), so it isn't mistaken for success. No path in this diff writes evidence for a failed run.

The one gap: `parseMetaReviews` (task.mjs:511-520) never checks `r.exitCode === 0` on stored entries even though the field exists in the schema — today harmless since `runReview` is the sole writer and always hardcodes `exitCode: 0` before pushing, but it's a missing defense-in-depth check that the marker-based path didn't need (markers are inherently only ever written post-success by the same code). Worth a one-line assertion; not a blocking finding since there's no current writer that could trip it.

### (4) `resolveScope` degrade — **mostly sound, one P2 (coverage), one P3 (nit)**

Logic read carefully:
- No git / not a repo: both `git rev-parse HEAD` and `git status --porcelain` throw → `dirty === null` → degrades to `worktree` (or errors only if `--scope diff` was explicitly forced) — matches the stated intent (review.mjs:160-161, :169-171).
- Unborn HEAD (git repo, zero commits): `rev-parse HEAD` throws (tip stays `'none'`) but `status --porcelain` still succeeds, so this correctly falls through to normal dirty/clean logic rather than mis-degrading.
- Empty diff (`--stat` output blank) correctly returns `{empty:true}` and `runReview` skips recording (review.mjs:302-309) — matches spec:59.

**P2 — no test exercises any of this.** Every fixture in `tests/review-command.test.mjs` is a non-git `mkdtemp` dir (comment at line 13 says so explicitly), so the dirty→worktree branch, the clean→diff branch, the `origin/main`→`main` base fallback, and the empty-diff short-circuit are all untested in a real git repo. `resolveScope` isn't even imported directly by the test file — only exercised transitively, and only through the one branch (no-git) that a real git checkout won't hit.

**P3 — nit.** The base auto-detection (review.mjs:176-179) only ever tries `origin/main` then hardcoded `main`; a repo whose default branch is `master`/`develop` and has no `origin/main` will hit the `base ref "main" 를 찾을 수 없음` error (review.mjs:183) rather than silently doing the wrong thing — so it fails safely, just noisily, and only with `--base` as a workaround. Not a correctness bug, just narrow.

### (5) Test coverage gaps beyond what's already noted

- **P2**: No test simulates the legacy→CLI-owned transition via an actual `runReview` call (ties directly to finding #2 — this is the single most important missing test given what the change is *for*).
- **P2**: No test constructs a real git repo for `resolveScope`/`runReview --scope diff` (ties to finding #4).
- **P1-adjacent**: No test covers `{prompt}` nested inside a template-authored quote (ties to finding #1) — the existing shell-injection test (`review-command.test.mjs:128`) only proves the documented-correct-usage case is safe, not that misuse is caught or safe.
- **P3**: `which()`'s path-with-slash branch (review.mjs:112-114) is untested.

### Unflagged but worth noting — concurrency (asked-for hazard class, found one)

**P2**: `readTaskMeta` → mutate → `writeTaskMeta` (review.mjs:353-355) is a non-atomic, unlocked read-modify-write. Two concurrent `harness-team review` invocations against the same task (two terminals, or an agent script firing engine calls without awaiting) can race: both read the same `reviews` array, each appends its own entry, the second write clobbers the first. The lost invocation's `artifact.md` block *and marker* still get appended (that's a separate `appendFile` per call, review.mjs:356) — so you end up with an artifact block/marker that has no corresponding `meta.reviews` entry, silently desyncing the human-readable log from the evidence the gate actually reads. Not exploitable maliciously, but a real data-integrity hazard under realistic (not exotic) usage.

---

## Verdict

**Two real blockers**, not theoretical:
- **(1)** the `{prompt}`/`sh -c` "single-quote literal" safety contract is not actually enforced by the code — it's defeated by a plausible, undetected reviewers.json authoring mistake, with a concrete injection PoC and zero test coverage of the failure mode.
- **(2)** the CLI silently and irreversibly (until a fresh verify-framed run) flips a legacy task's verify-evidence source the first time *any* review call succeeds, invalidating pre-existing valid evidence — directly contradicting the spec's own explicit "no retroactive invalidation" constraint, with the exact transition scenario absent from both the implementation's guard logic and the test suite.

Everything else (git-repo `resolveScope` behavior, failed-run evidence handling, `parseMetaReviews` defensiveness) held up under adversarial reading — those are real but secondary (P2/P3) items: missing test coverage and a lurking race condition, not confirmed exploitable bugs. I'd send this back before merge on (1) and (2); the rest can be should-fix follow-ups.
````

<!-- harness:review kind=claude-adversarial scope=worktree tip=826826bb98a9647b1fea1733c1a9c5123e9ffd71 at=2026-09-10T16:16:37.115Z -->

**판별 (4단계 — 이 세션).** 엔진: codex 미설치 → `claude` (컨텍스트 분리만, vendor 분리 없음).

- **P1-1 `{prompt}` 템플릿 따옴표 안** — ✅ **진짜 · 수정.** 리뷰어 PoC(`echo '{prompt}'` + `hello; <cmd>`)를
  테스트로 재현했다. `promptPlaceholderIsBare()`가 `{prompt}`가 공백으로 둘러싸인 독립 토큰이 아니면
  실행 전에 거부한다. 문서 custom 절에 계약을 명시.
- **P1-2 구 task에 review 한 번이 `reviews` 키를 만들어 손 마커 무효화** — ✅ **진짜 · 수정.** spec의 "소급 금지"를
  제가 side-effect로 어긴 것이다. CLI는 키가 **이미 있을 때만** meta에 쓴다. 구 task는 artifact 마커(CLI가
  쓴다)가 종전 증거이고 판정도 종전 그대로. 테스트: legacy meta가 바이트 단위로 불변.
- **P3 `parseMetaReviews`가 exitCode를 안 봄** — ✅ **진짜(방어) · 수정.** `exitCode ≠ 0` 항목은 증거가 아니다.
- **P2 git 저장소 scope 테스트 부재** — ✅ **진짜 · 수정.** 실제 git fixture로 dirty→worktree, clean→diff(base 폴백),
  빈 diff→미기록, 없는 base→error를 고정.
- **P3 base 폴백이 main만** — ⚠️ **사실이나 범위 밖.** 실패가 안전하고(`--base`로 우회) 문서 2단계 규칙 그대로다.
- **P2 동시 review의 meta RMW 경합** — ⚠️ **사실이나 범위 밖.** `done`·`task` 등 기존 meta 쓰기 전부가 같은
  구조이며 D4(단일 스레드)가 전제다. 문서 5단계에 전제를 명시했다. 잠금 도입은 별도 task.
- **(3) 실패 실행이 증거로 새는 경로** — 리뷰어도 없음 확인. 유지.

**조치 후:** `tests/review-command.test.mjs` +5, `tests/done-guard.test.mjs` +1 케이스. 전체 스위트 통과.

## Learnings (2026-09-10)

- 위임하지 않은 검증의 값: 리뷰어가 낸 P1 두 건은 둘 다 spec이 이미 금지한 것을 구현이 side-effect로 어긴 경우였다(소급 무효화·인용 계약) — spec의 제약을 "코드가 지키는가"가 아니라 "어떤 경로로 새는가"로 다시 읽어야 잡힌다. 증거를 harness 소유로 옮길 때 "언제 키를 만드는가"가 곧 "언제 규칙이 바뀌는가"다 — 키 생성을 부수효과로 두면 마이그레이션이 조용히 일어난다. working-tree 리뷰가 도는 동안 stop hook이 커밋을 요구해도 미룬다 — 지난 task의 학습을 이번에 실제로 적용했다.

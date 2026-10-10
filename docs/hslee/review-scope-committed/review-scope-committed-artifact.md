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

**의도된 계약 변경:** `tests/scope-command.test.mjs`의 "dirty 워킹트리는 worktree 로 보고하고 base 는 비운다"를 S4 테스트로 바꿨다(spec 영향 표).

**미검증:** 실제 codex·claude 리뷰어가 넓어진 fill 문구를 받아 `git diff <mergeBase>`를 실제로 실행하는지는 엔진 행동이라 테스트하지 않았다(프롬프트 문자열까지만 assert).

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

## Learnings

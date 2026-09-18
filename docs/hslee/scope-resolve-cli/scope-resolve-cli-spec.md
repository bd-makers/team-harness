# scope-resolve-cli — Spec

## 목적 / 요구사항

**문제 1 — ship에 CLI 표면이 없다.** [harness-ship.md:33](commands/harness-ship.md:33) 2단계가
base/scope 사다리를 산문으로 적어 에이전트에게 **손으로 실행**시키고, 그 결과를 7단계에서
`review --scope diff --base <ref>`로 넘긴다. 부를 수 있는 명령이 없었다.

> 착수 전 보고에서 "같은 사다리가 ship.md와 review.md에 두 번 적혀 있다"고 했지만 **부분적으로
> 틀렸다.** review.md의 것은 우발적 중복이 아니라 선언된 정본이다 — `review.mjs:224`가
> `// scope 결정 — harness-review.md 2단계`라 적고, review.md 3단계도 "CLI가 1·2단계를 같은
> 규칙으로 다시 판정한다"고 명시한다. 문서가 정본, 코드가 미러인 이 저장소의 관용구다. 지울 중복이 아니다.

**문제 2 — 기본 브랜치 판정이 세 벌이고 규칙이 갈렸다.** 이쪽이 실제 결함이다.

| 위치 | 규칙 |
|---|---|
| `review.mjs:239` | `--base` → `origin/main` → `main` — **`origin/HEAD`를 안 봤다** |
| `remote-task.mjs:29` `resolveDefaultRef` | `origin/HEAD` → `origin/main` → `null` |
| `summary.mjs:301` `isSyncedWithDefault` | `origin/HEAD` (+ `refs/remotes/` 스펠링 가드) |

**영향.** 기본 브랜치가 `master`·`develop`인 저장소(또는 포크)에서 `review --scope diff`가 base를
`main`으로 잡는다. 그런 ref가 없으면 `base ref "main" 를 찾을 수 없음`으로 죽고, **동명의 낡은 로컬
브랜치가 있으면 엉뚱한 diff를 조용히 리뷰한다** — 후자가 더 나쁘다. 실패가 보이지 않기 때문이다.
같은 저장소·같은 세션에서 `remote-task.mjs`는 올바르게 판정하므로 취향 차이가 아니라 불일치다.

**기대 결과.** `resolveScope`가 `resolveDefaultRef`를 쓰고, `harness-team scope`가 그 판정을 read-only로
보고한다. ship은 사다리를 재기술하는 대신 그 명령을 부른다.

**제약.**

- 판정 로직을 **네 번째로 복제하지 않는다.** `scope.mjs`는 `resolveScope`를 호출만 한다.
- `summary.mjs`의 `isSyncedWithDefault`는 **건드리지 않는다.** 하는 일이 다르다(동기화 여부 판정,
  origin 없으면 false). 지금 합치면 그 함수의 실패 모드가 바뀐다.
- origin이 없는 저장소의 기존 동작(`main` 폴백)을 보존한다 — 기존 테스트가 그것을 기대한다.
- 규칙을 바꿨으므로 그것을 서술한 정본 산문(review.md 2단계)도 **같은 커밋에서** 갱신한다.

## 설계 / 접근

- `review.mjs`의 하드코딩 폴백 → `(await resolveDefaultRef(targetDir)) ?? 'main'`.
  `resolveDefaultRef`는 이미 export돼 있고 전용 테스트도 있다. 순환 import 없음
  (`remote-task.mjs` → `summary.mjs`만 참조).
- `src/commands/scope.mjs` 신규 — `runScope(ctx)`가 `resolveScope`의 세 반환을 전부 다룬다:
  정상 / `{empty:true}`(warning, exit 0 — 빈 diff는 실패가 아니라 관측이다) / `{error}`(error packet, exit 1).
- 배선은 `stack`과 동일: `COMMANDS` + `case 'scope'`, `taskCmds`에 넣지 않아 `[dir]` positional이 target.

## Ontology

- **base ref**: diff scope의 비교 기준. 정본은 `--base` 인수 → **원격 기본 브랜치**(`origin/HEAD`) →
  `main`. "원격 기본 브랜치"이지 "main"이 아니라는 점이 이 task의 핵심 정정이다.
- **scope**: `worktree`(dirty 워킹트리 전체) · `diff`(base 대비 브랜치) · `task-docs`(spec/plan 문서).
  `resolveScope`가 판정하고 `review`·`ship`이 소비한다.
- **빈 diff**: 실패가 아니라 관측이다. exit 0 + warning으로 보고하고, 호출자가 "할 것 없음"으로 멈춘다.
- **정본과 미러**: 이 저장소는 규칙마다 한쪽을 정본으로 선언하고 다른 쪽이 따른다. scope 규칙은
  **문서(review.md)가 정본, 코드(review.mjs)가 미러**다. 규칙을 바꾸면 둘 다 같은 커밋에서 움직인다.

## Ambiguity 자가진단

- [x] **Goal 명확도** (40%) — `resolveScope`가 `origin/HEAD`를 보게 하고, 그 판정을 `harness-team scope`로 노출한다.
- [x] **Constraint 명확도** (30%) — 판정 복제 금지 · `isSyncedWithDefault` 불변 · origin 없을 때 `main` 폴백 보존.
- [x] **Success 기준** (30%) — master 기본 브랜치 fixture에서 base가 `origin/master`가 된다(고치기 전 실패하는
      회귀 테스트로 고정) + `npm test` 전체 통과 + ship.md에서 사다리 산문이 사라진다.
- [x] **Context 명확도** (brownfield 한정) — `src/commands/review.mjs`, `src/commands/scope.mjs`(신규),
      `src/cli-args.mjs`, `bin/harness-team.mjs`, `commands/harness-{ship,review}.md`,
      `skills/harness-team/SKILL.md`, `tests/scope-command.test.mjs`(신규), `tests/cli-args.test.mjs`.
- [x] **Ambiguity ≤ 0.2** — 위 항목 가중합 ≥ 0.8

## Done evidence

```json
{ "version": 1, "review": "required", "tests": "required" }
```

## 참고

- 재사용한 판정: `src/commands/remote-task.mjs`의 `resolveDefaultRef` (+ `tests/remote-task.test.mjs`)
- 변경한 판정: `src/commands/review.mjs`의 `resolveScope`
- 기존 scope 테스트(보존 확인용): `tests/review-command.test.mjs:300`
- 건드리지 않은 세 번째 구현: `src/commands/summary.mjs:301` `isSyncedWithDefault`

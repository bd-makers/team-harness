# adopt-reviews-closed — Artifact

*최종 결과물과 학습 내용을 기록한다.*

## 결과
- 결정 A(2026-11-20, 사용자 선택): `migrate --adopt-reviews` 후보에서 기본 브랜치 R에서 종결(마지막 재개 이후)된 task를 뺀다.
- `src/commands/migrate.mjs` `collectReviewAdoptionCandidates`: `resolveClosureRef`를 한 번 구하고, 기록 종결 제외 뒤
  `closedSinceReopen(closureAtRef(R), meta)`가 참이면 건너뛴다. ref가 없으면 종전 동작. fetch 없음.
- 테스트 3건(`tests/review-adoption.test.mjs` P2-6): R 종결 제외 + 로컬 plan만 종결(머지 전)은 남음 / 재개(reopenedAt > R 종결)는 남고 재개가 앞이면 제외 / git 없음은 종전대로 후보.
  수정 줄을 뺀 상태에서 앞의 2건이 실패함을 확인(red→green).
- 문서: `commands/harness-migrate.md`·`commands/harness-review.md`의 "열린 구 task" 정의, CHANGELOG Unreleased/Changed.
- 검증: `npm run test` 1444 / pass 1443 / fail 0 / skip 1(기존 CI 전용), `npm run docs:check` 최신.
- 손대지 않음: `docs/harness-overview.template.html`의 0.38.0 문단(릴리스 이력 서술이라 당시 정의 그대로 둔다).


### ship (2026-11-20)
- scope: diff · base: origin/main · mergeBase d282f761 (`harness-team scope --json --base origin/main`).
- 다이어그램: 이 task는 옵트인하지 않았다(plan에 다이어그램 단계 없음, `--no-diagram`) — `diagram record`가 기록 대상 없음으로 거부, 정상.
- 정합 검증: claude 엔진 `--framing shipcheck`(codex는 이 네트워크에서 불가) — 결과는 `## Reviews`.
- 남은 리스크: 하위 디렉터리 설치·레거시 원장(`legacy-ledger`) 출처 제외는 전용 테스트 없음(`closureAtRef` 기존 테스트에 의존). 구 task가 많을 때 task당 git 호출 몇 번(각 timeout) — 미측정.
- 후속: `done-derive-artifact.md`의 P2-6 "판단 필요" 줄에 이 task 포인터를 달지는 사용자 판단.

## Reviews
*Codex 등 리뷰 실행 시 결과(요약·발견·조치)를 날짜와 함께 남긴다. 남기지 않은 리뷰는 "안 한 것"으로 간주.*
*기계 판독용 마커를 함께 남긴다: `<!-- harness:review kind=codex scope=worktree tip=<sha|none> at=<ISO8601> -->`*

### 2026-11-20T06:24:42.527Z — claude-shipcheck (harness-team review)

- engine: claude · model: default · scope: worktree · base: origin/main · mergeBase: d282f76131db3eab7e2d6a42885a8ab00884ba05 · tip: 99569197594fab431857463a5d6d4a8e820bb22c · exit 0 · 5115 B

````text
전하, 판정은 **통과**입니다. BLOCKER와 MAJOR 모두 fail이 없습니다. S4는 판정할 근거가 없어 na로 두었습니다.

이 세션은 read-only라 artifact에 직접 쓰지 않았습니다. 아래 블록을 작성 세션이 `## Reviews`에 붙여 주시면 됩니다.

```markdown
### 2026-11-20 — claude shipcheck (D6 read-only 정합 검증)
<!-- harness:review kind=claude-shipcheck scope=diff tip=99569197594fab431857463a5d6d4a8e820bb22c at=2026-11-20T06:24:15Z -->
범위: `git diff d282f761` (커밋 99569197 + 미커밋 artifact 변경). 추적되지 않은 파일 없음.

| id | 항목 | 심각도 | 판정 | 근거 |
|---|---|---|---|---|
| S1 | spec 요구사항마다 대응 구현 존재 | BLOCKER | pass | **R에서 종결이면 제외**: spec "closedSinceReopen(await closureAtRef(targetDir, user, task, ref), meta)가 참이면 건너뛴다". diff `migrate.mjs` "+    if (closureRef && closedSinceReopen(await closureAtRef(targetDir, t.user, t.task, closureRef), meta)) continue;". artifact를 읽기(`readTextSafe`) 전에 위치하고, 루프 밖에 "+  const closureRef = await resolveClosureRef(targetDir);"가 있다. **ref가 null이면 종전 동작**: `closureRef &&` 단락 평가. **fetch 금지**: `resolveClosureRef`→`readOriginHead`(`symbolic-ref`)·`rev-parse`, `closureAtRef`→`cat-file`·`ls-tree`·`log`로 로컬 git만 쓴다. src 전체에서 `'fetch'`·`ls-remote`·`remote show` grep 결과 0건. **Done evidence (a)~(d)**: 테스트 3건이 4개 시나리오를 덮는다. (a)(b) `merged`/`unmerged` "assert.deepEqual(await candidateNames(dir), ['unmerged'])", (c) `reopenedAt: '2099…'`→['demo'], '2000…'→[], (d) "R 이 없으면(git 저장소 아님)…후보다". **Out(채택 동작 불변)**: 추가된 코드는 `continue` 한 줄과 import뿐이다. **문서·CHANGELOG**: In 범위대로 반영됐다. |
| S2 | plan `- [x]`마다 변경·커밋 실재 | MAJOR | pass | ①"[사람] spec 검토 승인": spec "결정: A (2026-11-20, 사용자 선택 — spec 검토 승인 겸함)". 사람의 승인이라 git으로는 검증할 수 없고, 문서 인용이 증거다. ②구현: 99569197 `src/commands/migrate.mjs` +11/-2. ③테스트: `tests/review-adoption.test.mjs` +51, P2-6 3건. ④문서: `commands/harness-migrate.md`·`commands/harness-review.md`·`CHANGELOG.md`가 diff에 있다. ⑤테스트 통과: 아래 S5의 재실행 결과. "ship 완료"는 `- [ ]`로 정상 미체크다. |
| S3 | 스코프 밖 변경 없음 | MAJOR | pass | 변경 파일 10개 = spec In 5개(`migrate.mjs`, 테스트, 문서 2개, CHANGELOG) + task 문서 5개(spec·plan·artifact·handoff·meta). handoff·meta는 `harness-team task`가 만든 스캐폴딩이다(meta `"reviews": []`, handoff는 템플릿 본문뿐). 범위 밖 코드 변경은 없다. |
| S4 | 실행된 리뷰가 전부 `## Reviews`에 마커와 함께 기록 | MAJOR | na | 완료된 리뷰가 없어 판정 대상이 없다. `## Reviews` 본문이 비어 있고, meta `"reviews": []`, `.harness/`에는 `active.json`뿐이다. 그래서 기록되지 않은 완료 리뷰의 흔적도 없다. 단, 미커밋 ship 절의 "정합 검증: claude 엔진 `--framing shipcheck` … 결과는 `## Reviews`"는 이 블록이 붙기 전까지는 빈 곳을 가리킨다. 이 블록을 붙이지 않으면 fail이다. |
| S5 | 검증 결과가 명령·출력 인용 | BLOCKER | pass | artifact: "검증: `npm run test` 1444 / pass 1443 / fail 0 / skip 1(기존 CI 전용), `npm run docs:check` 최신." 명령 이름과 러너가 집계한 숫자가 적혀 있다. 재실행 결과도 같다: `npm run test` → "ℹ tests 1444 / ℹ pass 1443 / ℹ fail 0 / ℹ skipped 1", `npm run docs:check` → "harness overview 생성 상태가 최신입니다.", `node --test tests/review-adoption.test.mjs` → "ℹ tests 10 / ℹ pass 10 / ℹ fail 0". 비차단 메모: ①"수정 줄을 뺀 상태에서 앞의 2건이 실패함을 확인(red→green)"은 출력이 없는 산문이고 재현하지 않았다(트리 수정 금지). ②perf 스위트 결과(tests 1 / pass 1)는 artifact에 빠져 있다. |

판정: fail 없음 (BLOCKER 0 · MAJOR 0). S4는 na이고, 이 블록을 붙이면 해소된다.
참고(루브릭 밖, artifact가 이미 남은 리스크로 인정): legacy-ledger 출처 제외와 하위 디렉터리 설치는 전용 테스트가 없다. 템플릿 안내 마커 예시가 `kind=codex`이지만 이번 실행은 `claude-shipcheck`다.
```

- **실행한 명령:** `git status`·`git diff`·`git log`, 테스트 파일 단독 실행, `npm run test` 전체, `npm run docs:check`. 실행 뒤 `git status`는 실행 전과 같았습니다(artifact 미커밋 1건뿐).
- **검증하지 못한 것:** red→green 주장입니다. 재현하려면 트리를 고쳐야 해서 하지 않았습니다.
- **묻지 않고 정한 것:**
  - 마커 `scope`는 artifact의 "scope: diff"를 따라 `diff`로 적었습니다.
  - 일부러 실패 시나리오를 만들어 보는 검사(`/harness-adversarial-review`)는 하지 않았습니다. 루브릭에 없어서입니다.
````

<!-- harness:review kind=claude-shipcheck scope=worktree tip=99569197594fab431857463a5d6d4a8e820bb22c at=2026-11-20T06:24:42.527Z -->

**판별 (2026-11-20)** — fail 없음(BLOCKER 0·MAJOR 0), 조치할 결함 없음.
- S4 na: 검증자가 "블록을 붙이라"고 한 것은 CLI가 이미 위에 기록했다(마커 `kind=claude-shipcheck scope=worktree`). 검증자 출력 안의 `scope=diff` 마커 예시는 출력 본문일 뿐 기록이 아니다.
- S5 메모 ①: red→green은 이 세션에서 수정 줄을 지운 채 `node --test --test-name-pattern="P2-6"` 실행 → P2-6 3건 중 2건 ✖(R 종결 제외·재개), 1건 ✔(R 없음), 원복 후 10/10 통과. ② perf 스위트(`tests 1 / pass 1`)는 `npm run test`의 두 번째 러너 출력이다.

## Learnings
- "R에서 종결"을 제외 조건으로 쓸 때는 `closureAtRef(...).closed`가 아니라 `closedSinceReopen`을 쓴다 — 재개 MR 머지 전에는
  R이 closed인데 그 task는 가드를 다시 지난다. 재개·clean·채택이 같은 판정을 공유한다.

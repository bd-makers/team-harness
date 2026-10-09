# review-scope-handoff — Artifact

*최종 결과물과 학습 내용을 기록한다.*

## 결과

- `resolveScope`(→ `review`·`scope`)의 dirty 판정이 활성 task의 훅 출력 경로(`handoffRelPaths` — `runHandoffAuto`가 쓰는 두 파일)를 뺀다.
  `git status --porcelain -z` + `parsePorcelainPaths` + `repoPrefix`(export만) — done 가드와 같은 집합·파서·접두 보정. 명시 `--scope`는 불변.
- 재현(2026-10-10, 수정 전 임시 저장소): 구현 커밋 후 task handoff 한 줄만 변경 → 자동 `{scope:'worktree'}`, `--scope diff` → `{scope:'diff', base:'main'}`.
- 실패 재현 먼저: S1·S2·S3 테스트를 수정 전 코드에 돌려 3건 모두 실패 확인(S1 `actual {scope:'worktree'}` vs `expected {empty:true,…}`, S2·S3 `'worktree'` vs `'diff'`) → 수정 후 3건 pass.
- 검증(2026-10-10, 로컬): `npm test` exit 0 — tests 1217 · pass 1216 · fail 0 · skipped 1(기존 CI 전용) · perf pass 1.
  `npm run docs:check` — "harness overview 생성 상태가 최신입니다". `harness-team scenario check` — `scenario: pass (3 checked)`.
- B(가드 강화) 기각·관련 잠재 문제 후속 — spec 설계 절 "B 판단", `docs/followups.md` 17번.
- 구현 중 발견: 리뷰 기록(artifact·meta)이 다음 자동 판정을 worktree로 되돌린다(실측) — 범위 밖, `docs/followups.md` 18번.


## Reviews
*Codex 등 리뷰 실행 시 결과(요약·발견·조치)를 날짜와 함께 남긴다. 남기지 않은 리뷰는 "안 한 것"으로 간주.*
*기계 판독용 마커를 함께 남긴다: `<!-- harness:review kind=codex scope=worktree tip=<sha|none> at=<ISO8601> -->`*

### 2026-10-09T16:21:05.053Z — codex-scenario (harness-team review)

- engine: codex · scope: diff · tip: 262d9436a522cf1d78acf58e3b9bc50ef10633ef · exit 0 · 1791 B

```text
전하, `git status`와 `git diff refs/remotes/origin/main`을 직접 확인했습니다. 파일 수정과 테스트·변이 실행은 하지 않았으며, 기계 행은 재판정하지 않았습니다.

| id | 항목 | 심각도 | 판정 | 근거 |
|---|---|---|---|---|
| E1 | 증거가 각 Then을 실제로 검증한다 | BLOCKER | **fail** | **S1**의 [테스트](/Users/hsonpro/.ao/data/worktrees/harness-aijient-team-plugin/harness-aijient-team-plugin-21/tests/review-command.test.mjs:365)는 `assert.equal(rr.result.entry.scope, 'diff')`만 검사하며 저장된 `meta.reviews`를 읽지 않습니다. 따라서 저장만 누락하거나 저장 scope를 잘못 기록하면서 반환값을 유지하는 변이를 탐지하지 못합니다. main 상태도 `resolveScope`의 `empty`만 확인하고 `review`를 호출하지 않습니다(355행). S2·S3는 Then에 대응하는 assertion이 있지만, [artifact](/Users/hsonpro/.ao/data/worktrees/harness-aijient-team-plugin/harness-aijient-team-plugin-21/docs/hslee/review-scope-handoff/review-scope-handoff-artifact.md:10)의 “3건 pass”·“3 checked”는 테스트 이름이 나온 실행 출력이 아니므로 실제 선택·실행 여부는 **na**입니다. |
| E2 | spec 밖 동작 변경이 없다 | MAJOR | **pass** | 런타임 diff는 [resolveScope](/Users/hsonpro/.ao/data/worktrees/harness-aijient-team-plugin/harness-aijient-team-plugin-21/src/commands/review.mjs:242)의 `-z` 파싱·활성 task handoff 제외와 `repoPrefix` export뿐입니다. 모두 spec 설계에 대응합니다. 나머지는 해당 테스트·문서·task 기록이며, 후속 17·18번은 동작 구현 없이 사유만 기록했습니다. |

**Verdict: fail — 전체 fail 목록: E1(S1의 저장 결과 및 main review 검증 누락).**
```

<!-- harness:review kind=codex-scenario scope=diff tip=262d9436a522cf1d78acf58e3b9bc50ef10633ef at=2026-10-09T16:21:05.053Z -->

**판별·조치 (2026-10-10, 작성 세션):** scope=diff 확인(이번 수정 덕에 handoff dirty 상태에서도 명시값 그대로).
- E1 **진짜 결함** — S1 테스트가 Then의 두 부분을 검증하지 않았다: ① 저장된 `meta.reviews`의 scope를 읽지 않고 반환 entry만 봤다, ② main 상태에서
  `review`를 부르지 않아 "리뷰하지 않는다"가 아니라 `resolveScope`의 empty만 확인했다. 조치: main에서 `runReview` → `recorded === false`·`meta.reviews` 빈 배열,
  feature에서 `readTaskMeta(...).reviews` 1건·`scope === 'diff'` 단언 추가.
- E1의 "실행 출력 없음(na)" — 이름 선택 실행 출력을 아래에 남긴다(각 cmd 그대로):
  `✔ resolveScope: a tree dirty only from the post-commit handoff resolves to diff` (pass 1) ·
  `✔ resolveScope: only the active task's hook-written handoff paths are excluded` (pass 1) ·
  `✔ scope: handoff-only dirty tree reports diff like review` (pass 1). `scenario check` — `pass (3 checked)`.
- 변이: `src/commands/review.mjs`를 0.49.0판(`396fbcc`)으로 되돌리면 세 테스트 모두 `✖`(pass 0 · fail 3), 복원 후 커밋본과 동일.
- E2 pass — 조치 없음.

## Learnings

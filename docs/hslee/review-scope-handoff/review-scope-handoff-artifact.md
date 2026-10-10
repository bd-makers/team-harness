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
- **사람 결정 반영(2026-10-10) — followups 18 포함**: 원칙 "하네스가 스스로 쓴 기록 파일은 dirty 판정에서 제외"로 scope 판정 제외 집합에
  활성 task의 `<name>-artifact.md`·`<name>-meta.json`(review 가 성공마다 쓰는 두 파일 — `runReview` 코드 확인)을 추가. done 가드 집합은 handoff만으로 불변.
  artifact 손 편집만 있을 때도 diff로 가는 트레이드오프는 spec 설계 절 "제외 집합 확장". followups 18 지움(괄호 기록), 17 open 유지.
  - 실패 재현 먼저: S4 `resolveScope: consecutive reviews without a commit both resolve to diff`를 수정 전에 돌려 2회차 `actual: 'worktree'`로 실패 확인 → 수정 후 pass.
  - 변이: 제외 집합에서 artifact·meta를 빼면 S4만 `✖`(pass 0 · fail 1), 복원 후 동일.
  - 재검증: `npm test` exit 0 — tests 1218 · pass 1217 · fail 0 · skipped 1(기존 CI 전용) · perf pass 1. `docs:check` 최신. `scenario check` pass (4 checked).
    이름 선택 실행: `✔ resolveScope: consecutive reviews without a commit both resolve to diff` (pass 1) · `✔ resolveScope: only the active task's harness-written paths are excluded` (pass 1, S2 테스트 이름 변경).

- 다이어그램: 미실행 — 함수 하나의 판정 수정 — 그림 이득 적음(사람 결정) (2026-10-10)

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

### 2026-10-09T16:22:54.672Z — codex-scenario (harness-team review)

- engine: codex · scope: diff · tip: 4d2af027a104992b480a14db683728d740bcc1c7 · exit 0 · 1777 B

```text
전하, `git status`와 `git diff refs/remotes/origin/main`을 직접 확인했습니다. 파일 변경·테스트·변이 재실행은 하지 않았으며, 기계 행은 재판정하지 않았습니다.

| id | 항목 | 심각도 | 판정 | 근거 |
|---|---|---|---|---|
| E1 | 각 시나리오의 증거가 Then을 실제로 검증한다 | BLOCKER | **pass** | **S1**: [테스트](tests/review-command.test.mjs:355)가 main의 `empty`, `recorded === false`, 저장된 `reviews === []`와 feature의 `scope/base`, 저장 건수·`scope === 'diff'`를 단언합니다. 저장 누락·잘못된 scope·main 기록 변이는 해당 assertion에서 실패합니다. **S2**: [테스트](tests/review-command.test.mjs:390)가 전제 diff와 (a)–(d)의 worktree, 명시 diff를 각각 단언하여 제외 범위 확대·dirty 무시·명시값 무시를 탐지합니다. **S3**: [CLI 테스트](tests/scope-command.test.mjs:328)가 실제 프로세스의 종료 코드와 JSON `scope === 'diff'`를 검사합니다. [기록된 실행 출력](docs/hslee/review-scope-handoff/review-scope-handoff-artifact.md:42)에 spec의 세 테스트 이름이 모두 `✔`로 등장하며, 46행에는 구버전 복원 시 세 테스트 실패가 기록되어 있습니다. |
| E2 | spec 밖 동작 변경이 없다 | MAJOR | **pass** | 런타임 diff는 [resolveScope](src/commands/review.mjs:245)의 `-z` 파싱·활성 task handoff 제외·접두 보정과 [repoPrefix](src/commands/task.mjs:798)의 export입니다. 모두 spec 설계에 대응합니다. 나머지는 관련 테스트·문서·task 기록이며, 후속 17·18은 사유 기록만 추가했습니다. |

**Verdict: pass — fail 목록: 없음.** 실행·변이 결과는 artifact의 기록을 근거로 확인했습니다.
```

<!-- harness:review kind=codex-scenario scope=diff tip=4d2af027a104992b480a14db683728d740bcc1c7 at=2026-10-09T16:22:54.672Z -->

**판별 (2026-10-10):** R2 재실행 pass — E1·E2 모두 pass, 조치 없음. scope=diff 확인.

### 2026-10-09T16:23:59.469Z — codex (harness-team review)

- engine: codex · scope: diff · tip: 4d2af027a104992b480a14db683728d740bcc1c7 · exit 0 · 573 B

```text
전하, `git status`와 `git diff refs/remotes/origin/main`을 직접 확인했습니다.

**발견 사항: 없음 — P1/P2/P3로 보고할 유의미한 결함을 찾지 못했습니다.**

활성 task의 handoff 제외, rename 양쪽 경로 처리, 하위 디렉터리 접두 보정과 명시 scope 유지가 설계에 부합합니다.

`git diff --check`와 변경된 JavaScript 4개 파일의 구문 검사는 통과했습니다. 파일은 수정하지 않았으며, 테스트·빌드는 실행하지 않았습니다.

**최종 판정: PASS — 정적 리뷰 기준.**
```

<!-- harness:review kind=codex scope=diff tip=4d2af027a104992b480a14db683728d740bcc1c7 at=2026-10-09T16:23:59.469Z -->

**판별 (2026-10-10):** R3 발견 없음(PASS, 정적 리뷰) — 조치 없음. scope=diff 확인. 최종 재검증: `npm test` exit 0 — 1217 · pass 1216 · fail 0 · skipped 1(기존 CI 전용) · perf pass 1, `docs:check` 최신, `scenario check` pass(3).

### 2026-10-10T13:11:09.678Z — codex-scenario (harness-team review)

- engine: codex · scope: diff · tip: 0afbee1ff708285234e1043c59fe4abb60e0837e · exit 0 · 1989 B

```text
전하, `git status`와 `git diff refs/remotes/origin/main`을 직접 확인했습니다. 파일 수정·테스트·변이 재실행은 하지 않았으며, 기계 행은 재판정하지 않았습니다.

| id | 항목 | 심각도 | 판정 | 근거 |
|---|---|---|---|---|
| E1 | 각 시나리오의 증거가 Then을 실제로 검증한다 | BLOCKER | **pass** | **S1**: [테스트](tests/review-command.test.mjs:355)가 main의 `empty`, `recorded === false`, 저장된 `reviews === []`와 feature의 `scope/base`, 저장 건수·scope를 단언합니다. **S2**: [테스트](tests/review-command.test.mjs:411)가 (a)–(d)의 `worktree`와 명시 `diff`를 각각 단언합니다. **S3**: [테스트](tests/scope-command.test.mjs:328)가 실제 CLI 출력의 `scope === 'diff'`를 검사합니다. **S4**: [테스트](tests/review-command.test.mjs:385)가 연속 리뷰 반환값, 저장된 `['diff','diff']`, spec 수정 후 `worktree`를 단언합니다. 해당 결과를 깨뜨리는 변이는 각 assertion에서 실패합니다. [실행 기록](docs/hslee/review-scope-handoff/review-scope-handoff-artifact.md:50)에 S1·S3의 정확한 테스트 이름이, [추가 기록](docs/hslee/review-scope-handoff/review-scope-handoff-artifact.md:18)에 현재 S2·S4 이름이 `✔`로 나옵니다. 구버전 복원 시 S1–S3 실패와 artifact·meta 제외 제거 시 S4 실패도 기록돼 있습니다. |
| E2 | spec 밖 동작 변경이 없다 | MAJOR | **pass** | 런타임 diff는 [resolveScope](src/commands/review.mjs:249)의 `-z` 파싱·활성 task 기록 파일 제외·접두 보정과 [repoPrefix](src/commands/task.mjs:798)의 export입니다. 모두 spec 설계에 대응합니다. artifact·meta 제외 확장과 수기 편집 트레이드오프도 문서화됐으며, 나머지는 관련 테스트·문서·task 기록입니다. |

**Verdict: pass — 전체 fail 목록: 없음.** 실행·변이 결과는 artifact에 기록된 증거를 근거로 판단했습니다.
```

<!-- harness:review kind=codex-scenario scope=diff tip=0afbee1ff708285234e1043c59fe4abb60e0837e at=2026-10-10T13:11:09.678Z -->

**판별 (2026-10-10, followups 18 포함 후 재리뷰):** R2 pass — E1(S1–S4 증거가 Then 검증)·E2(spec 밖 변경 없음) 모두 pass, 조치 없음. scope=diff 확인.

### 2026-10-10T13:12:27.689Z — codex (harness-team review)

- engine: codex · scope: diff · tip: 0afbee1ff708285234e1043c59fe4abb60e0837e · exit 0 · 592 B

```text
전하, `git status`와 `git diff refs/remotes/origin/main`을 직접 검토했으며 **P1·P2·P3 지적 사항은 없습니다.**

활성 task 기록 파일의 제외 범위, rename 원본 경로 보존, 경로 접두 보정과 명시적 scope 유지가 설계에 부합합니다.

문법 검사와 `git diff --check`는 통과했고, 현재 상태의 자동 판정도 `diff`로 확인했습니다. 테스트·빌드는 실행하지 않았으며 파일은 변경하지 않았습니다.

**최종 판정: PASS — 이번 변경에서 유의미한 결함을 발견하지 못했습니다.**
```

<!-- harness:review kind=codex scope=diff tip=0afbee1ff708285234e1043c59fe4abb60e0837e at=2026-10-10T13:12:27.689Z -->

**판별 (2026-10-10):** R3 발견 없음(PASS) — 조치 없음. scope=diff 확인. 도그푸딩: R2가 artifact·meta를 쓴 뒤(`M` artifact·meta·handoff) `scope --json`이 `scope: diff`.

## Learnings

- (2026-10-10) R2 1차가 잡은 것은 "테스트가 Then의 저장 결과·미기록을 단언하지 않음"이었다 — Then에 "기록한다/하지 않는다"가 있으면 반환값이 아니라 저장소(`meta.reviews`)를 읽어 단언한다.

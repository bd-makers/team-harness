# wiki-commit-provenance — Artifact

*최종 결과물과 학습 내용을 기록한다.*

## 결과

- `wiki sources`가 PR 번호를 못 찾으면 `no-pr` 막힘 대신 커밋 출처 마커(`pr=` 없음)를 낸다. PR 경로 마커는 바이트 불변(S4 기존 테스트 무수정 통과).
- 검증(2026-10-09, 로컬): `npm test` exit 0 — tests 1213 · pass 1212 · fail 0 · skipped 1(기존 CI 전용 jq 매트릭스) · perf pass 1.
  `npm run docs:check` — "harness overview 생성 상태가 최신입니다". `harness-team scenario check` — `scenario: pass (5 checked)`.
- heliosent-profile 읽기 전용 재현(`--target ~/projects/heliosent/heliosent-profile`): 전 `marker: (막힘)` + `✗ no-pr` →
  후 `marker: <!-- harness:wiki task=hslee/hslee-profile commit=714c448 author=hslee at=2026-10-09 -->` + `note:` 한 줄, JSON `success · 컴파일 가능 (PR 없음 — 커밋 출처) · blockers []`.
  실행 전후 그 저장소 `git status --porcelain` 0줄.

- 다이어그램: 미실행 — 함수 하나의 폴백 — 그림 이득 적음(사람 결정) (2026-10-09)

- **사람 승인 3건 반영(2026-10-09)**: ① 커밋 출처의 `commit=`을 종결 커밋(task 폴더를 마지막으로 건드린 first-parent 커밋, `lastTouchingCommit`)으로 — PR 출처·PR 추론의 커밋 선택은 그대로.
  ② 다이어그램 건너뜀 기록. ③ 종결된 wiki-compile spec S3 증거를 새 테스트로 정정(정정 사유 한 줄 포함).
- 재검증(2026-10-09, 로컬): `npm test` exit 0 — 1213 · pass 1212 · fail 0 · skipped 1(기존 CI 전용) · perf pass 1. `docs:check` 최신. `scenario check` pass(5).
  이름별 출력: `✔ wiki sources: without a PR number the marker cites the closing commit` · `✔ wiki sources: --pr overrides the commit-only provenance`(S3–S5는 위 기록과 같은 이름으로 재실행 pass).
  wiki-compile S3 정정 cmd도 `✔ wiki sources: --pr overrides the commit-only provenance`(pass 1)를 고른다.
- 변이 확인: `wiki.mjs`를 직전 커밋 판(들여온 커밋 사용)으로 되돌리면 S1 `…cites the closing commit`만 실패(pass 11 · fail 1).
- heliosent 읽기 전용 재현(갱신): `provenance: PR (없음) · commit 7713257 · author hslee`, `marker: <!-- harness:wiki task=hslee/hslee-profile commit=7713257 author=hslee at=2026-10-09 -->`. 그 저장소 `git status --porcelain` 전후 0줄.

## Reviews
*Codex 등 리뷰 실행 시 결과(요약·발견·조치)를 날짜와 함께 남긴다. 남기지 않은 리뷰는 "안 한 것"으로 간주.*
*기계 판독용 마커를 함께 남긴다: `<!-- harness:review kind=codex scope=worktree tip=<sha|none> at=<ISO8601> -->`*

### 2026-10-09T13:04:51.361Z — codex-scenario (harness-team review)

- engine: codex · scope: worktree · tip: 40f056a36abbe2af57e6e335377b58706b492606 · exit 0 · 2050 B

```text
전하, **E1은 na, E2는 pass**입니다. 현재 working tree diff는 handoff 기록 17줄 추가뿐이며, 구현 변경은 이미 `40f056a`에 커밋되어 있습니다. 커밋 diff로 검토 범위를 확대하지 않았습니다.

| id | 항목 | 심각도 | 판정 | 근거 |
|---|---|---|---|---|
| E1 | 증거가 각 시나리오의 Then을 실제 검증 | BLOCKER | **na** | S1은 [테스트](/Users/hsonpro/.ao/data/worktrees/harness-aijient-team-plugin/harness-aijient-team-plugin-20/tests/wiki.test.mjs:104)의 blockers·status·provenance·마커·안내 단언, S2는 124–133행의 PR override·커밋 유지·exit 2 단언, S3는 143–148행의 `compiled` 단언, S4는 58–76행의 세 병합 방식·마커 전체 문자열 단언으로 Then 위반을 잡는 구조입니다. 그러나 [artifact](/Users/hsonpro/.ao/data/worktrees/harness-aijient-team-plugin/harness-aijient-team-plugin-20/docs/hslee/wiki-commit-provenance/wiki-commit-provenance-artifact.md:8)에는 집계 결과만 있고 **S1–S4 테스트 이름이 나온 실행 출력이 없습니다**. 해당 테스트는 임시 저장소를 쓰므로 현재 읽기 전용 환경에서 재실행하지 않았습니다. S5는 직접 실행하여 `✔ wiki command: the compile contract stops on blockers and compiled, and never pushes`를 확인했고, [54·67행 단언](/Users/hsonpro/.ao/data/worktrees/harness-aijient-team-plugin/harness-aijient-team-plugin-20/tests/wiki-command.test.mjs:54)이 요구 문구 변경을 검출합니다. |
| E2 | spec 밖 동작 변경 없음 | MAJOR | **pass** | `git status --short`, `git diff`, `git diff --cached` 확인 결과, 유일한 변경은 [handoff](/Users/hsonpro/.ao/data/worktrees/harness-aijient-team-plugin/harness-aijient-team-plugin-20/docs/hslee/wiki-commit-provenance/wiki-commit-provenance-handoff.md:5)의 커밋 제목·통계 기록입니다. 실행 동작 변경이 없습니다. |

**Verdict: fail 없음. E1은 증거 부족으로 na이며, 전체 시나리오 검증 완료 판정은 보류합니다.**
```

<!-- harness:review kind=codex-scenario scope=worktree tip=40f056a36abbe2af57e6e335377b58706b492606 at=2026-10-09T13:04:51.361Z -->

판별(작성 세션): 이 실행은 **무효 범위**다 — 구현이 이미 `40f056a`에 커밋된 뒤라 scope가 `worktree`(handoff 17줄)로 잡혔다. E2 pass는 handoff만 본 결과라 증거가 아니다.
E1 na의 지적(실행 출력에 테스트 이름이 없음)은 **진짜 결함**이다 — 아래 증거를 더하고 `--base refs/remotes/origin/main`으로 다시 돌린다.

시나리오별 증거 명령 실행 출력(2026-10-09, 시간 표기 제거):
```text
S1 ✔ wiki sources: without a PR number the marker cites the commit            — pass 1 · fail 0
S2 ✔ wiki sources: --pr overrides the commit-only provenance                   — pass 1 · fail 0
S3 ✔ wiki sources: a commit-only marker still counts as compiled when a PR number arrives later — pass 1 · fail 0
S4 ✔ wiki sources: infers PR, merge commit and author from first-parent history — pass 1 · fail 0
S5 ✔ wiki command: the compile contract stops on blockers and compiled, and never pushes — pass 1 · fail 0
scenario: pass (5 checked)
```
변이 확인: `src/commands/wiki.mjs`를 origin/main 판으로 되돌리면 `tests/wiki.test.mjs`에서 S1만 실패(pass 11 · fail 1)한다.
S2·S3은 옛 코드에서도 통과한다 — 새 동작이 아니라 불변식(`--pr` 우선, 멱등 키 `task=`)을 고정하는 회귀 가드라서다. S4도 같은 성격(PR 경로 바이트 불변).

### 2026-10-09T13:07:08.183Z — codex-scenario (harness-team review)

- engine: codex · scope: diff · tip: 3bbc0c493f84d3a6a4c91f07c99ffb0806d0debd · exit 0 · 2198 B

```text
전하, **E1·E2 모두 pass**입니다. `git status --short`는 비어 있으며, `refs/remotes/origin/main` 대비 전체 diff를 검토했습니다.

| id | 항목 | 심각도 | 판정 | 근거 |
|---|---|---|---|---|
| E1 | 각 증거가 해당 Then을 실제 검증 | BLOCKER | pass | [artifact 실행 기록](/Users/hsonpro/.ao/data/worktrees/harness-aijient-team-plugin/harness-aijient-team-plugin-20/docs/hslee/wiki-commit-provenance/wiki-commit-provenance-artifact.md:39)에 **S1–S5 각각의 실제 테스트 이름**이 있습니다. [테스트](/Users/hsonpro/.ao/data/worktrees/harness-aijient-team-plugin/harness-aijient-team-plugin-20/tests/wiki.test.mjs:101)는 S1의 blockers·status·출처·마커·JSON/텍스트 안내를 직접 단언하고, S2는 PR override·커밋 유지·잘못된 인수의 exit 2, S3는 `compiled` 파일 경로를 단언합니다. S4는 세 병합 방식을 순회하여 마커 전체 문자열을 비교합니다(57–81행). S5는 [문서 전문 대조](/Users/hsonpro/.ao/data/worktrees/harness-aijient-team-plugin/harness-aijient-team-plugin-20/tests/wiki-command.test.mjs:54)로 요구 문구의 삭제·반전을 검출합니다. 각 결과를 깨뜨리면 해당 단언이 실패하는 구조이며, artifact에는 origin/main 복원 시 S1 실패 기록도 있습니다. |
| E2 | spec 밖 동작 변경 없음 | MAJOR | pass | 런타임 diff는 `wikiMarker`의 `pr=` 생략(R-1·R-6), `no-pr` 제거(R-1), JSON/텍스트 안내(R-5)에 한정됩니다. PR 우선순위와 `findCompiled`·`wikiMarkersIn`·`parseMarkerAttrs`는 불변입니다. 명령·스킬·README·cycle·CHANGELOG 변경도 spec의 영향 표와 요구사항에 대응하며, 나머지는 테스트와 task 기록입니다. |

S5는 직접 재실행하여 `✔ wiki command: the compile contract stops on blockers and compiled, and never pushes`를 확인했습니다. S1–S4는 임시 저장소 쓰기가 필요하므로 읽기 전용 환경에서 재실행하지 않고 기록된 이름별 출력과 테스트 코드를 대조했습니다. 기계 행은 재판정하지 않았으며, 파일은 수정하지 않았습니다.

**Verdict: pass — fail 목록: 없음.**
```

<!-- harness:review kind=codex-scenario scope=diff tip=3bbc0c493f84d3a6a4c91f07c99ffb0806d0debd at=2026-10-09T13:07:08.183Z -->

판별(작성 세션): 발견 없음 — 조치 없음. 이 실행이 R2 증거다(scope=diff, base `refs/remotes/origin/main`).

### 2026-10-09T13:08:28.216Z — codex (harness-team review)

- engine: codex · scope: diff · tip: beb382d5ef043550570b1091df2e659e003ef024 · exit 0 · 599 B

```text
전하, `git status`와 `refs/remotes/origin/main` 대비 전체 diff를 직접 검토했습니다. **P1·P2·P3 발견 사항은 없습니다.**

PR 마커 형식과 `task=` 기반 멱등 판정은 유지되며, 변경은 커밋 출처 허용과 안내에 한정됩니다.

문서 테스트 2개, 마커 생성·파싱 단언, `docs:check`, `git diff --check`가 통과했습니다. 임시 저장소 쓰기가 필요한 통합 테스트와 전체 테스트·빌드는 재실행하지 않았습니다. 파일 변경은 없습니다.

**최종 판정: 승인 가능 — 유의미한 결함 없음.**
```

<!-- harness:review kind=codex scope=diff tip=beb382d5ef043550570b1091df2e659e003ef024 at=2026-10-09T13:08:28.216Z -->

판별(작성 세션): 발견 없음 — 조치 없음. 리뷰어가 재실행하지 않은 통합 테스트·전체 스위트는 작성 세션이 돌렸다(## 결과의 `npm test`·`docs:check`·scenario check).

### 2026-10-09T13:20:24.395Z — codex (harness-team review)

- engine: codex · scope: diff · tip: 5a2eaed1043d15eb120b3b746b38f663aee2fca2 · exit 0 · 1031 B

```text
전하, **P2 1건**입니다. P1·P3 및 `lastTouchingCommit` 구현의 유의미한 결함은 발견하지 못했습니다.

- **P2 should-fix — [wiki-compile-spec.md:155](/Users/hsonpro/.ao/data/worktrees/harness-aijient-team-plugin/harness-aijient-team-plugin-20/docs/chad/wiki-compile/wiki-compile-spec.md:155)**: S3의 새 테스트는 `--pr 9` 경로만 실행하므로, 여전히 Then에 선언된 첫 실행의 `marker=null`·`no-pr` 차단을 검증하지 않습니다. Then을 현재 동작으로 정정하고 두 실행 모두를 검증하는 증거에 연결해야 합니다.

커밋 출처는 마지막 task 변경 커밋, PR 출처는 introducing commit을 선택하며, 추가 테스트도 이 구분을 확인합니다.

검증: `git status` clean, origin/main 대비 diff 확인, 문서 계약 테스트 2건·구문 검사 통과. Git fixture를 생성하는 런타임 테스트는 읽기 전용 제약으로 실행하지 않았습니다.

**최종 판정: Request changes — S3 증거 계약 정정 필요.**
```

<!-- harness:review kind=codex scope=diff tip=5a2eaed1043d15eb120b3b746b38f663aee2fca2 at=2026-10-09T13:20:24.395Z -->

판별(작성 세션): P2 **진짜 결함** — 정정한 wiki-compile S3의 Then이 여전히 첫 실행 `no-pr` 막힘을 선언했고, 새 증거는 `--pr` 실행만 단언했다.
조치: `--pr overrides the commit-only provenance` 테스트가 같은 저장소의 `--pr` 없는 첫 실행(blockers 없음·종결 커밋 출처 marker)도 단언하게 하고, wiki-compile S3 Then을 현재 동작으로 고쳤다(정정 사유 줄 갱신). 이 task S2 Then에도 그 단언을 반영했다.

### 2026-10-09T13:23:05.884Z — codex (harness-team review)

- engine: codex · scope: diff · tip: c45a1706fdbbc4b9bd4736093776dbbd0eb40c8e · exit 0 · 1095 B

```text
전하, origin/main 대비 diff를 직접 검토했습니다. **P1·P2 결함은 없으며, P3 문서 정합성 문제 1건입니다.**

- **P3 nit — [wiki-commit-provenance-spec.md:196](/Users/hsonpro/.ao/data/worktrees/harness-aijient-team-plugin/harness-aijient-team-plugin-20/docs/hslee/wiki-commit-provenance/wiki-commit-provenance-spec.md:196)**: S3 증거를 “고치지 않았다”고 남겨 두었지만, 이번 변경에서 Then·test·cmd와 정정 사유를 이미 갱신했으므로 해당 항목을 해소 처리해야 합니다.

`lastTouchingCommit`은 설계대로 커밋 출처에만 적용되며 PR 출처는 introducing commit을 유지합니다. 보강된 테스트는 첫 실행과 `--pr 9` 실행을 모두 단언하여 수정된 S3에 대응합니다.

문서 테스트 2건·구문 검사·`docs:check`·`git diff --check`가 통과했습니다. 임시 저장소를 생성하는 런타임 테스트와 전체 테스트·빌드는 실행하지 않았으며, 파일 변경은 없습니다.

**최종 판정: Approve with nit — 유의미한 코드 결함 없음.**
```

<!-- harness:review kind=codex scope=diff tip=c45a1706fdbbc4b9bd4736093776dbbd0eb40c8e at=2026-10-09T13:23:05.884Z -->

판별(작성 세션): P3 진짜(문서 정합) — spec 참고 절의 S3 `(open)` 항목을 해소로 고쳤다. 코드 결함 없음 — 이 실행이 반영 후 R3 증거다.

## Learnings

- 구현을 커밋한 **뒤** `harness-team review`를 돌리면 post-commit 훅이 고친 handoff 때문에 트리가 dirty라 scope가 `worktree`로 잡히고,
  리뷰어는 handoff 몇 줄만 본다 — exit 0이라 기록은 남지만 증거가 아니다(이 task의 첫 R2). handoff를 따로 커밋해 clean tree로 만든 뒤
  `harness-team scope --json`이 `diff`인지 확인하고 돌린다.
- R2 루브릭 E1은 artifact에 **테스트 이름이 찍힌 실행 출력**을 요구한다 — `scenario: pass (N checked)` 집계만으로는 na가 난다.

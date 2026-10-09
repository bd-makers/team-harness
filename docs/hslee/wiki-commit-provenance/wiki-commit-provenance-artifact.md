# wiki-commit-provenance — Artifact

*최종 결과물과 학습 내용을 기록한다.*

## 결과

- `wiki sources`가 PR 번호를 못 찾으면 `no-pr` 막힘 대신 커밋 출처 마커(`pr=` 없음)를 낸다. PR 경로 마커는 바이트 불변(S4 기존 테스트 무수정 통과).
- 검증(2026-10-09, 로컬): `npm test` exit 0 — tests 1213 · pass 1212 · fail 0 · skipped 1(기존 CI 전용 jq 매트릭스) · perf pass 1.
  `npm run docs:check` — "harness overview 생성 상태가 최신입니다". `harness-team scenario check` — `scenario: pass (5 checked)`.
- heliosent-profile 읽기 전용 재현(`--target ~/projects/heliosent/heliosent-profile`): 전 `marker: (막힘)` + `✗ no-pr` →
  후 `marker: <!-- harness:wiki task=hslee/hslee-profile commit=714c448 author=hslee at=2026-10-09 -->` + `note:` 한 줄, JSON `success · 컴파일 가능 (PR 없음 — 커밋 출처) · blockers []`.
  실행 전후 그 저장소 `git status --porcelain` 0줄.


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

## Learnings

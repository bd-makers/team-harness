# task-folder-removal — Artifact

*최종 결과물과 학습 내용을 기록한다.*

## 결과

- 다이어그램: docs/chad/task-folder-removal/task-folder-removal-diagram.html 생성 (2026-10-09)
- C2a 구현(2026-10-09): `parseSummaryRows` 단일 파서 · `collectTasks({ includeLedgerOnly })`(summary만) · done-on-main/`list --remote` 원장 폴백 · 종결 이름 재사용 가드 · 문서(`commands/harness-task.md`·`templates/docs/README.md`·CHANGELOG).
- 검증(2026-10-09, R2 지적 반영 후): `npm test` 1209개 중 pass 1208 · fail 0 · skip 1(기존 CI 전용 `jq-present` 매트릭스) · `npm run docs:check` 통과.
- `harness-team scenario check` (2026-10-09, R2 지적 반영 후) — `scenario: pass (8 checked)`, 시나리오마다 `ℹ tests 1 · pass 1`(이름 필터가 정확히 한 테스트를 골랐다):
  ```text
  S1 pass [summary: keeps a done ledger row whose task folder is gone]
  S2 pass [summary: drops an open ledger row whose task folder is gone]
  S3 pass [migrate: does not recreate a ledger-only task folder]
  S4 pass [remote-task: falls back to the default-ref ledger when the task folder is gone]
  S5 pass [remote-task: a deliberate reopen silences the ledger-sourced nudge]
  S6 pass [list --remote: a task done in the default-ref ledger is not branch-only]
  S7 pass [task: refuses to reuse the name of a done task whose folder is gone]
  S8 pass [task: a done task whose folder exists still reopens]
  ```
- S3 변이 검사: `migrate.mjs` `backfillTaskMeta`가 `includeLedgerOnly: true`를 넘기도록 일시 변경하면 S3가 fail(지운 폴더 부활) — 되돌린 뒤 diff 없음.

## Reviews
*Codex 등 리뷰 실행 시 결과(요약·발견·조치)를 날짜와 함께 남긴다. 남기지 않은 리뷰는 "안 한 것"으로 간주.*
*기계 판독용 마커를 함께 남긴다: `<!-- harness:review kind=codex scope=worktree tip=<sha|none> at=<ISO8601> -->`*

### 2026-10-09T02:28:41.135Z — codex-scenario (harness-team review)

- engine: codex · scope: diff · tip: 1cdab139dae3dc0584f9e1f7495c8919127eb852 · exit 0 · 1967 B

```text
전하, `git status`는 clean이며 `refs/remotes/origin/main` 대비 diff를 직접 확인했습니다. 파일은 수정하지 않았습니다.

| id | 항목 | 심각도 | 판정 | 근거 |
|---|---|---|---|---|
| E1 | 증거가 각 시나리오의 Then을 실제 검증 | BLOCKER | **fail** | **S6**은 `list --remote` 실행을 요구하지만, 테스트는 `listBranchOnlyTasks(dir)`만 호출합니다(`tests/list-remote.test.mjs:226–230`). CLI가 반환 결과를 잘못 출력하도록 바뀌어도 이 assertion은 통과하므로, 사용자에게 branch-only로 나오지 않는다는 Then을 증명하지 못합니다. **S4** 지정 필터는 새 ledger 테스트만 선택하며, Then의 기존 meta 문구 유지까지 검증하는 테스트는 실행하지 않습니다(`tests/remote-task.test.mjs:187–201`, spec S4 cmd). 또한 artifact에는 테스트 이름이 표시된 실행 출력이 없습니다(`task-folder-removal-artifact.md:5–14`). 따라서 S1–S8의 **실제 선택·실행 여부는 na**이며 pass로 인정하지 않았습니다. |
| E2 | spec 밖 동작 변경 없음 | MAJOR | **pass** | `summary.mjs`의 공유 파서·ledger-only 포함은 R-1/R-2, `remote-task.mjs`의 fallback·nudge·default 집합은 R-3/R-4와 Q6 문구 설계, `task.mjs`의 이름 가드는 R-5에 대응합니다. 나머지 diff는 관련 테스트·문서·task 산출물이며, 별도의 범위 밖 동작 변경은 발견하지 못했습니다. |

S1/S2의 행 보존·제거, S3의 폴더 미생성, S4/S5의 verdict·재개 판정, S7/S8의 거부·reopen assertion은 코드에서 확인했습니다. 다만 실행 출력이 없고, 읽기 전용 환경에서 임시 저장소를 생성하는 테스트는 실행하지 않았습니다. 기계 행의 evidence 존재 여부와 command exit 0은 재채점하지 않았습니다.

**Verdict: fail — 전체 fail 목록: E1(S6 CLI 결과 검증 누락, S4 meta 문구 유지 증거 미포함).**
```

<!-- harness:review kind=codex-scenario scope=diff tip=1cdab139dae3dc0584f9e1f7495c8919127eb852 at=2026-10-09T02:28:41.135Z -->

판별(작성 세션, 코드 대조): E1 지적 3건 모두 **진짜 결함**.
- S6 테스트가 `listBranchOnlyTasks`만 검증하고 `list --remote` 출력은 보지 않았다 → `runList` 출력의 branch-only 절에 `chad/x`가 없고 `alice/foo`는 있음을 추가.
- S4 Then의 "meta 출처 문구 불변"이 S4 명령이 고르는 테스트 밖에 있었다 → 같은 테스트에 meta 출처 문구 단언(종전 끝맺음 `… 로 다시 연다(reopened).`, `새 이름` 없음) 추가.
- artifact에 이름 찍힌 실행 출력이 없었다 → `## 결과`에 `scenario check` 출력 기록.
E2(범위 밖 변경 없음) pass는 수용. 재검증은 다음 R2 실행으로 한다.

## Learnings

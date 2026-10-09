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
- 같은 `scenario check` 실행의 **테스트 러너(`node --test`) 출력** — 각 시나리오 cmd가 실제로 고른 테스트 이름과 소요 시간:
  ```text
  ✔ summary: keeps a done ledger row whose task folder is gone (92.826583ms)
  ✔ summary: drops an open ledger row whose task folder is gone (89.34925ms)
  ✔ migrate: does not recreate a ledger-only task folder (18.573209ms)
  ✔ remote-task: falls back to the default-ref ledger when the task folder is gone (234.819209ms)
  ✔ remote-task: a deliberate reopen silences the ledger-sourced nudge (209.350083ms)
  ✔ list --remote: a task done in the default-ref ledger is not branch-only (867.172167ms)
  ✔ task: refuses to reuse the name of a done task whose folder is gone (5.932083ms)
  ✔ task: a done task whose folder exists still reopens (4.805541ms)
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

### 2026-10-09T02:30:42.748Z — codex-scenario (harness-team review)

- engine: codex · scope: diff · tip: fff3355c24b7d845cff89a72430a8cb7aedf09a2 · exit 0 · 2000 B

```text
전하, `git status`는 clean이며 `refs/remotes/origin/main` 대비 diff를 직접 확인했습니다. 파일은 수정하지 않았습니다.

| id | 항목 | 심각도 | 판정 | 근거 |
|---|---|---|---|---|
| E1 | 각 시나리오의 증거가 Then을 실제 검증 | BLOCKER | **na** | 테스트 assertion은 S1–S8의 결과에 대응합니다. S1/S2는 행 보존·제거(`tests/summary.test.mjs:843–869`), S3는 폴더 미생성(`tests/migrate.test.mjs:132–147`), S4/S5는 verdict·문구·재개 판정(`tests/remote-task.test.mjs:187–221`), S6는 실제 `runList` 출력에서 `chad/x` 제외(`tests/list-remote.test.mjs:235–240`), S7/S8은 거부·미생성·reopen을 단언합니다(`tests/task-name-reuse.test.mjs:36–66`). 그러나 artifact:12–19의 `S1 pass [테스트 이름]`은 **테스트 러너 출력이 아니라 scenario checker가 선언된 이름을 출력하는 형식**입니다(`src/commands/scenario.mjs:52`). 실제 테스트 이름이 찍힌 러너 출력이 없어 S1–S8의 선택·실행 여부를 pass로 인정할 수 없습니다. `ℹ tests 1 · pass 1` 요약도 이 공백을 해소하지 못합니다. |
| E2 | spec 밖 동작 변경 없음 | MAJOR | **pass** | 공유 파서·summary의 ledger-only 포함은 R-1/R-2, remote fallback·nudge 문구·default 집합은 R-3/R-4와 Q6 설계, 이름 재사용 가드는 R-5에 대응합니다. 나머지는 관련 테스트·문서·생성물이며, migrate·observe·done 가드·버전은 변경하지 않았습니다. 범위 밖 동작 변경은 발견하지 못했습니다. |

이전 E1의 S6 출력 검증 누락과 S4 meta 문구 검증 누락은 보완되었습니다. 이번에는 읽기 전용 조건상 임시 저장소를 만드는 테스트나 변이 검사를 실행하지 않았으며, 기계 행도 재채점하지 않았습니다.

**Verdict: 검증 미완료 — fail 목록: 없음. E1은 실제 테스트 이름이 포함된 러너 실행 출력 부족으로 na입니다.**
```

<!-- harness:review kind=codex-scenario scope=diff tip=fff3355c24b7d845cff89a72430a8cb7aedf09a2 at=2026-10-09T02:30:42.748Z -->

판별(작성 세션): 이전 E1의 S6·S4 지적은 보완 확인됨. 이번 E1 na의 근거("`S<n> pass [이름]`은 검사기가 선언명을 찍은 것이지 러너 출력이 아니다")는 **진짜 공백** —
`src/commands/scenario.mjs`가 선언명을 그대로 찍는다. 같은 실행 로그의 러너 `✔ <테스트 이름> (ms)` 8줄을 `## 결과`에 추가했다. fail 0, E2 pass.

### 2026-10-09T02:31:47.411Z — codex-scenario (harness-team review)

- engine: codex · scope: diff · tip: d51a9c5869bfc61608ff655853ff061252939ad9 · exit 0 · 1908 B

```text
전하, `git status`는 clean이며 `refs/remotes/origin/main` 대비 diff를 직접 확인했습니다. 파일은 수정하지 않았습니다.

| id | 항목 | 심각도 | 판정 | 근거 |
|---|---|---|---|---|
| E1 | 각 시나리오의 증거가 Then을 실제 검증 | BLOCKER | **pass** | artifact:21–30에 S1–S8 각각의 실제 러너 출력 `✔ <테스트 이름> (ms)`가 있습니다. S1/S2는 보존할 행의 모든 필드·user index·check와 open 행 제거를 단언합니다(`tests/summary.test.mjs:843–869`). S3는 폴더 미생성과 정상 task의 meta 생성을 함께 확인합니다(`tests/migrate.test.mjs:140–145`); artifact:32에는 ledger-only를 migrate에 포함하는 변이에서 실패했다는 기록도 있습니다. S4/S5는 정확한 verdict·시각·출처·문구와 재개 시각 전후 판정을 검증합니다(`tests/remote-task.test.mjs:190–221`). S6는 실제 `runList` 출력에서 `chad/x` 제외와 `alice/foo` 포함을 단언합니다(`tests/list-remote.test.mjs:233–237`). S7/S8은 exit·안내·미생성·reopen 상태를 확인합니다(`tests/task-name-reuse.test.mjs:39–66`). 각 Then의 결과를 뒤집으면 해당 assertion이 실패하는 구조입니다. |
| E2 | spec 밖 동작 변경 없음 | MAJOR | **pass** | `summary.mjs`의 공유 파서·ledger-only 포함은 R-1/R-2, `remote-task.mjs`의 fallback·문구·default 집합은 R-3/R-4와 Q6 설계, `task.mjs`의 이름 가드는 R-5에 대응합니다. 나머지 diff는 관련 테스트·문서·task 산출물입니다. migrate·observe·done 가드·버전 변경이나 별도 범위 밖 동작은 발견하지 못했습니다. |

기계 행은 재채점하지 않았습니다. 테스트·변이를 새로 실행하지 않았으며, 실행 여부는 기록된 러너 출력과 현재 테스트 코드를 대조했습니다.

**Verdict: pass — fail 목록: 없음.**
```

<!-- harness:review kind=codex-scenario scope=diff tip=d51a9c5869bfc61608ff655853ff061252939ad9 at=2026-10-09T02:31:47.411Z -->

판별(작성 세션): E1·E2 pass, fail 없음 — 수용. R2 완료.

### 2026-10-09T02:33:12.754Z — codex (harness-team review)

- engine: codex · scope: diff · tip: 0aaabf31f2d99fca6d06410a5d63b535fdbee716 · exit 0 · 1028 B

```text
전하, **P2 수정 사항 2건**을 발견했습니다.

- **P2 — `src/commands/summary.mjs:181`**: 원장 행의 `user`를 경로 검증 없이 렌더에 전달하여, `../../outside` 같은 값이 있으면 `summary --write`가 저장소 밖 `/outside-task.md`에 쓰기를 시도합니다. 기존 user 경로 검증을 적용해야 합니다.
- **P2 — `src/commands/remote-task.mjs:75`**: meta 읽기 실패를 폴더 삭제로 간주하여, 폴더가 남아 있는 레거시 task나 손상된 meta에도 “폴더가 지워짐·새 이름으로 생성”을 안내합니다. 원격 폴더 존재 여부를 별도로 확인해야 합니다.

**최종 판정: 수정 후 재검토 권장.** P1은 발견하지 못했습니다.

`git status`는 clean이며, `git diff --check`와 `docs:check`는 통과했습니다. 위 두 경로는 쓰기 없는 함수 호출로 확인했습니다. 전체 테스트는 파일 생성이 필요한 read-only 제약으로 실행하지 않았으며, 파일은 변경하지 않았습니다.
```

<!-- harness:review kind=codex scope=diff tip=0aaabf31f2d99fca6d06410a5d63b535fdbee716 at=2026-10-09T02:33:12.754Z -->

판별(작성 세션, 재현 테스트로 확인): P2 2건 모두 **진짜 결함**.
- P2-1 경로 탈출 — 원장 행 user `../../outside`가 ledger-only로 이어받아져 `docs/<user>/<user>-task.md` 쓰기 경로가 된다. 폴더 이름에서 오던 때는 불가능했던 입력이다.
  → `collectTasks`가 `userNameError`·task 이름 규칙을 어기는 행을 버린다. 테스트 `summary: ignores ledger-only rows whose user or task is not a safe path segment`.
- P2-2 오탐 nudge — meta 없는 구 task 폴더가 main에 있어도 원장 폴백이 "폴더가 지워짐"을 안내했다(종전에는 null — spec "오늘 동작 불변"과 충돌).
  → default ref 트리에 spec 마커가 있으면 폴백하지 않는다. blob이 아니라 `ls-tree`로 보아 partial clone 오판도 피한다.
  테스트 `remote-task: a meta-less task whose folder is still on the default ref does not use the ledger fallback`.

## Learnings

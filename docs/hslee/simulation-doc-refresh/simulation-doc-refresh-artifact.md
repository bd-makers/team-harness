# simulation-doc-refresh — Artifact

*최종 결과물과 학습 내용을 기록한다.*

## 결과

### 대조표 — 0.40.1~0.44.4 × 시뮬레이션 시나리오 (2026-09-28)

확인 근거: CHANGELOG 해당 버전 절 + 아래 "확인" 열의 소스/명령 문서(워크트리 HEAD `cbc0a6c` = 0.44.4).
"반영"은 이 PR에서 본문을 고친 곳, "해당 없음"은 워크스루 단계에 닿지 않아 배너 요약만 한 것이다.

| 버전 (PR) | 변경 | 닿는 곳 | 확인 | 처리 |
|---|---|---|---|---|
| 0.40.1 | 시뮬레이션 문서 자체의 ship base 사다리·footer 수정 | S7 | 현재 본문에 이미 반영됨 | 해당 없음(이미 현행) |
| 0.40.2 | `.git/hooks` 없고 `core.hooksPath` 없으면 mkdir 후 설치, hooksPath 있으면 안내만 | S1 step 4 | `src/git-hooks.mjs` mkdir·hooksPath 분기 | 반영(step-detail) |
| 0.40.3 | protect-files 훅 비밀 3종, `migrate`로 도달 | 시나리오 밖 | — | 배너만 |
| 0.41.0 | `task --area`·`list --area`, meta `area`, 경로 불변 | S2·명령 카드 | `commands/harness-task.md` 모노레포 area 절 | 반영(명령 카드) |
| 0.41.1 | spec 마커 없는 비어 있지 않은 디렉터리 활성화 거부 | S2 step 3 | CHANGELOG + harness-task 문서 | 반영(거부 목록) |
| 0.41.2 | artifact 템플릿 EOF 빈 줄 제거 | — | — | 해당 없음 |
| 0.41.3 | migrate 훅 sha 테이블 누락 수정 | — | — | 해당 없음 |
| 0.41.4 | 새 task 이름이 명령 이름(`list` 등)이면 거부 | S2 step 3 | `commands/harness-task.md` 머리말 | 반영 |
| 0.41.5 | `--member`가 config user보다 우선, 추론 member로 다른 member의 동명 task 생성 거부 | S2 step 1·3, S6 | 같은 문서 머리말 | 반영 |
| 0.41.6 | user가 한 세그먼트가 아니면 `task`·`init` 거부 | S2 step 3 | 같은 문서 머리말 | 반영 |
| 0.42.0 | D10(CLAUDE.md import 유지), `list --remote`, active.json 경로 검증, `.`·`..` 거부, done-on-main 전체 ref | 명령 카드·S2 | harness-task `list --remote` 절 | 반영(`list --remote` 카드·거부 목록). D10은 배너만 |
| 0.42.1 (#105) | handoff만 담는 sweep 커밋을 따로 만들지 않음 — 다음 작업 커밋에 함께 stage, 단독 sweep은 푸시·전환 직전만 | S3 | harness-task "post-commit handoff" 절 | 반영(S3 step 3·5 신설) |
| 0.42.1 | review·scope 추론 base = `refs/remotes/origin/<branch>` | S7 | CHANGELOG | 해당 없음(S7은 소유자 `scope`만 가리킴) |
| 0.43.0 | doctor가 낡은 관리 절 경고 → `init` 처방, migrate는 관리 절 미렌더 | S1 infobox | `src/commands/doctor.mjs:980` | 반영(S1 infobox 정정) |
| 0.44.0 (#108) | done 가드 체크박스-only plan 면제 → 머지 후 종결 = 체크→done→summary→커밋 하나 | S4 | harness-task "머지 후 종결" 절 + `isCheckboxOnlyChange` | 반영(S4 infobox·가드 3 주석) |
| 0.44.0 (#107) | AGENTS.md protocol 관리 절 압축, 소비자는 `init --yes` | S1 infobox | CHANGELOG | 반영(관리 절 = init) |
| 0.44.1 | 하위 디렉터리 설치본의 handoff 제외·면제 판정 수정 | S4 가드 3 | CHANGELOG | 해당 없음(동작 정정, 워크스루 불변) |
| 0.44.2 | 워크트리에서 백업 경로를 메인 체크아웃 기준으로 | — | — | 해당 없음 |
| 0.44.3 (#111/#113) | `init --stack X` 고정(render-state `stack`), `harness-team stack`의 `pin:` 줄 | S1 step 3·명령 카드 | `src/render-state.mjs` stack 필드 | 반영 |
| 0.44.3 | docs:check 버전 표지 검사, 이 문서는 명시 제외 | 레지스트리 | `scripts/docs-version-drift.mjs` | 이 PR로 등록 |
| 0.44.4 (#115) | `docs/*/*-handoff.md` gitignore(워크트리 로컬), `task` 활성화가 user handoff를 씀, 커밋 대상은 task handoff 1파일 | 구조·S1·S2·S3·S5·S6·명령 카드 | `src/harness.mjs` gitignore 목록, `task-paths.mjs` `USER_HANDOFF_IGNORE`, `task.mjs` `renderUserHandoff`·활성화 | 반영 |

소스로 추가 확인한 기존 본문 오류(0.40.0 이전부터):
- S3 task handoff 항목 형식 — 실제는 `## <ISO> — <short sha> <msg>` + `git diff HEAD~1 --stat`(`runHandoffAuto`). 본문의
  `commit:`/`변경:`/`다음:` 형식은 실제와 달라 고쳤다.
- S3·S5 user handoff 내용 — 실제는 `## Active Task` / `## Last Commit (<date>)` / `## Full Context → <task handoff>`
  (`renderUserHandoff`). "다음:" 줄은 없다. 고쳤다.
- S4 done — `<user>-handoff.md`도 종결 형태로 다시 쓴다(`runDone`). 트리에 추가했다.
- post-commit 훅의 `PLAN_COMPLETE` 신호(S3 step 4)는 현행 그대로다 — 수정 없음.

## Reviews
*Codex 등 리뷰 실행 시 결과(요약·발견·조치)를 날짜와 함께 남긴다. 남기지 않은 리뷰는 "안 한 것"으로 간주.*
*기계 판독용 마커를 함께 남긴다: `<!-- harness:review kind=codex scope=worktree tip=<sha|none> at=<ISO8601> -->`*

### 2026-09-27T16:07:20.493Z — codex (harness-team review)

- engine: codex · scope: worktree · tip: c210a38764dcb2b019bf241f090be78a207b0fb5 · exit 0 · 2264 B

```text
전하, **P1은 없습니다. 문서의 동작 주장 두 곳은 수정이 필요합니다.** Working tree에는 post-commit이 갱신한 task handoff만 미커밋 상태였고, 요청하신 HTML·레지스트리·MAINTAINING 변경은 `main` 대비 커밋 `c210a38`에서 검토했습니다. 파일은 수정하지 않았습니다.

- **P2** [docs/harness-workflow-simulation.html:730](/Users/hsonpro/.ao/data/worktrees/harness-aijient-team-plugin/harness-aijient-team-plugin-12/docs/harness-workflow-simulation.html:730) — `summary --write`가 `origin/HEAD`와 같은 커밋에서만 허용된다는 주장은 과장입니다. 실제 가드는 기본 브랜치 **이름**이면 커밋 동일성 검사를 건너뛰므로, ahead·behind 상태에서도 실행될 수 있습니다.
- **P2** [docs/harness-workflow-simulation.html:721](/Users/hsonpro/.ao/data/worktrees/harness-aijient-team-plugin/harness-aijient-team-plugin-12/docs/harness-workflow-simulation.html:721) — 직접 실행한 `harness-team done`까지 `AskUserQuestion`을 거친다는 기존 본문 주장은 실제 CLI와 다릅니다. `runDone`은 가드 통과 후 확인 질문 없이 완료 상태를 씁니다.
- **P3** [docs/harness-workflow-simulation.html:1123](/Users/hsonpro/.ao/data/worktrees/harness-aijient-team-plugin/harness-aijient-team-plugin-12/docs/harness-workflow-simulation.html:1123) — 훅 위치를 `.git/hooks/post-commit`으로 고정해 적었습니다. 설치 코드는 `core.hooksPath`와 Git worktree의 실제 hooks 경로를 따릅니다.
- **P3** [MAINTAINING.md:202](/Users/hsonpro/.ao/data/worktrees/harness-aijient-team-plugin/harness-aijient-team-plugin-12/MAINTAINING.md:202) — 시뮬레이션 문서 갱신 항목을 추가했지만 설명은 여전히 “이 두 줄”이라고 합니다.

**검토 결과:** `docs-version-drift.mjs`의 레지스트리 이동과 MAINTAINING의 표지 갱신 절차는 일치합니다. 표지 검사 결과는 `[]`이고 `docs:check`도 통과했습니다. 작성된 버전 주장에서 **0.44.4 이후의 미래 버전 번호는 발견하지 못했습니다.** 다만 표지 검사는 본문 사실관계를 검증하지 않으므로, 위 P2를 고친 뒤 문서 현행화를 승인하는 것이 적절합니다.
```

<!-- harness:review kind=codex scope=worktree tip=c210a38764dcb2b019bf241f090be78a207b0fb5 at=2026-09-27T16:07:20.493Z -->

**판별·조치 (2026-09-28):** 4건 모두 소스로 재현해 진짜 결함으로 판별, 전부 반영했다.
- P2 `summary --write` 조건 — `runSummary`는 현재 브랜치가 기본 브랜치 이름이면 통과하고, 아니면 `isSyncedWithDefault`(같은 커밋)를
  본다(`src/commands/summary.mjs:390-392`). S4 infobox를 "기본 브랜치이거나 같은 커밋"으로 고쳤고, 같은 과장이 있던 기존 summary
  명령 카드(0.30.0 문장)도 함께 고쳤다.
- P2 `done`의 AskUserQuestion — `runDone`은 묻지 않는다. 확인은 Claude가 (1)·(2) 트리거에서 실행 전에 하는 것이라고 S4 infobox와
  done 명령 카드를 고쳤다(기존 본문 오류).
- P3 훅 경로 — handoff 카드를 `git rev-parse --git-path hooks`(core.hooksPath·워크트리 반영) 기준 서술로 고쳤다.
- P3 MAINTAINING "이 두 줄" → "이 줄들".

## Learnings

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


## Learnings

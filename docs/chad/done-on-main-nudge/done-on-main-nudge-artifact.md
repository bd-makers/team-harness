# done-on-main-nudge — Artifact

*최종 결과물과 학습 내용을 기록한다.*

## 결과

**2026-09-11 — "main에서 이미 종결된 task" 감지, 브랜치 `done-on-main-nudge`.**

- 판정 한 곳: `src/commands/remote-task.mjs` — `resolveDefaultRef`(origin/HEAD → origin/main) · `readRemoteTaskMeta`(`git show <ref>:docs/<u>/<t>/<t>-meta.json`) ·
  `doneOnMainVerdict`(원격 done ∧ 로컬 미종결 ∧ ¬고의 재개) · `renderDoneOnMainNudge` · `checkDoneOnMain`(원콜, 절대 throw 안 함).
  fetch 없음 + `GIT_NO_LAZY_FETCH=1` + 2 s timeout — partial clone에서는 null(모른다).
- 소비자 3곳(사용자 결정 3곳): `session-context`(breadcrumb·TCC 대신 nudge + next-action) · `doctor`(`done on main` warning + hint) ·
  `task <name>`(출력 첫 줄, 막지 않음, `--json`은 최상위 `doneOnMain`). 모두 `doneOnMain` 주입으로 테스트.
- 실측(이 저장소): `review-codex-live-check`(main에서 done) 로컬 meta를 임시 open으로 두고 세 지점 모두 nudge 확인 → `git checkout --`으로 원복.
- 문서: AGENTS.md·템플릿 task-gate 절 한 줄(eager 상한 17500 B 때문에 103 B로 압축 — 상세는 `commands/harness-task.md` "원격 done nudge" 절), CHANGELOG `[Unreleased]`.
- 테스트: `tests/remote-task.test.mjs` 14 · `tests/task-done-on-main.test.mjs` 4 · session-context +3 · doctor +3. `npm test` 전체 통과(아래 Reviews 뒤 검증 줄).

**다이어그램**: 옵트인 질문 1회 — 아니오(2026-09-11).

## Reviews
*Codex 등 리뷰 실행 시 결과(요약·발견·조치)를 날짜와 함께 남긴다. 남기지 않은 리뷰는 "안 한 것"으로 간주.*
*기계 판독용 마커를 함께 남긴다: `<!-- harness:review kind=codex scope=worktree tip=<sha|none> at=<ISO8601> -->`*


## Learnings


### 2026-09-11T07:30:22.564Z — codex (harness-team review)

- engine: codex · scope: worktree · tip: 7ba738000f49eb494b1afd804daf7359e367648a · exit 0 · 2025 B

```text
전하, P1은 없습니다. 다만 P2 세 건으로 변경 요청 판정입니다.

- **P2** — [src/commands/remote-task.mjs:50](</Users/hsonpro/Library/Mobile Documents/iCloud~md~obsidian/Documents/para_vault/10_Projects/Harness/harness-aijient-team-plugin/src/commands/remote-task.mjs:50>) — 로컬 `status: done`을 무조건 제외하므로, fetch 후 발견된 더 최신 원격 종결도 숨긴 채 오래된 로컬 task를 `reopened`할 수 있습니다.
- **P2** — [src/commands/remote-task.mjs:53](</Users/hsonpro/Library/Mobile Documents/iCloud~md~obsidian/Documents/para_vault/10_Projects/Harness/harness-aijient-team-plugin/src/commands/remote-task.mjs:53>) — 두 머신의 wall-clock timestamp만 비교하므로 clock skew가 있으면 원격 종결 이후가 아닌 재개도 “고의 재개”로 오판해 nudge를 누락합니다.
- **P2** — [src/commands/remote-task.mjs:16](</Users/hsonpro/Library/Mobile Documents/iCloud~md~obsidian/Documents/para_vault/10_Projects/Harness/harness-aijient-team-plugin/src/commands/remote-task.mjs:16>) — `git show`에 `--no-lazy-fetch`/`GIT_NO_LAZY_FETCH`와 timeout이 없어 partial clone에서는 암묵적 네트워크 fetch가 발생해 “fetch 없음” 계약을 깨고 10초 SessionStart에서 task context 전체를 잃을 수 있습니다.
- **P3** — [tests/task-done-on-main.test.mjs:22](</Users/hsonpro/Library/Mobile Documents/iCloud~md~obsidian/Documents/para_vault/10_Projects/Harness/harness-aijient-team-plugin/tests/task-done-on-main.test.mjs:22>) — 문서화된 `--json` 최상위 `doneOnMain` 계약을 검증하는 테스트가 없어 created/activated 두 envelope의 회귀를 잡지 못합니다.

검증: `node --check`, `git diff --check`, `npm run docs:check` 통과. Fixture 기반 테스트는 read-only sandbox의 `mkdtemp EPERM` 때문에 유효하게 실행되지 않았으며, 순수 verdict/render 테스트 8건은 통과했습니다. 파일 변경은 하지 않았습니다.

**최종 verdict: CHANGES REQUESTED**
```

<!-- harness:review kind=codex scope=worktree tip=7ba738000f49eb494b1afd804daf7359e367648a at=2026-09-11T07:30:22.564Z -->

**판별 (harness-review.md 4단계, 2026-09-11)**

| codex 발견 | 판별 | 조치 |
|---|---|---|
| P2 `remote-task.mjs:16` — partial clone에서 `git show`가 lazy fetch → "fetch 없음" 계약 위반, SessionStart 10초 예산 위험 | **진짜 결함** | `GIT_NO_LAZY_FETCH=1` + `timeout: 2000` 추가. 테스트: bare origin에 `uploadpack.allowFilter`를 켠 진짜 partial clone에서 대조군(lazy 허용)은 읽히고 기본 경로는 null |
| P3 `--json` 최상위 `doneOnMain` 계약 테스트 없음 | **진짜(누락)** | created·activated·null 세 경우 테스트 추가 |
| P2 `:50` — 로컬 done을 무조건 제외해 "더 최신 원격 종결"을 숨긴 채 reopen 가능 | **오탐 (의도된 설계)** | 로컬 meta가 done이면 `task <name>`이 `reopened:`를 찍는다 — 사용자는 이미 "종결된 task를 다시 연다"를 안다. 원격이 T1이 아니라 T2에 닫혔다는 정보는 그 결정을 바꾸지 않는다. 로컬 reopen 뒤 main이 다시 닫은 경우(reopenedAt < closedAt)는 nudge — 테스트 있음 |
| P2 `:53` — 두 머신 wall-clock 비교라 clock skew면 고의 재개 오판 | **실재하나 P3, 조치 없음** | 오판 조건 = 사용자가 원격 종결을 pull한 뒤 skew 이내에 reopen. pull이 closedAt 이후 실시간이므로 skew가 fetch 지연을 넘어야 한다. 비교 대상을 커밋 시각으로 바꾸는 것도 같은 문제라 이득 없음. 기록만 |

codex의 "CHANGES REQUESTED"는 P2 1건(lazy fetch) 반영으로 해소. 리뷰 시점 tip `7ba7380`은 커밋 전 worktree — 반영 후 재리뷰는 돌리지 않았다(변경이 env 2줄 + 테스트).

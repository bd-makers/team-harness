# user-handoff-parallel-conflict — Artifact

*최종 결과물과 학습 내용을 기록한다.*

## 결과
**2026-09-27** — 선택지 A 구현(사용자 결정: A · 소비자 migrate는 안내만).
- `src/task-paths.mjs` `USER_HANDOFF_IGNORE` = `docs/*/*-handoff.md` → `src/harness.mjs` `appendGitignore`(export) 관리 목록에 추가.
- `src/commands/task.mjs`: `writeActivationHandoff`(생성·재활성 시 활성 형태 1회), `trackedUserHandoffs`(`git ls-files :(glob)…`).
- `src/commands/doctor.mjs` `checkTrackedUserHandoffs`(warn-only), `src/commands/migrate.mjs` `migrateUserHandoffUntrack`(gitignore 보장 + `git rm --cached` 안내, 인덱스 무변경).
- 이 레포 사본 `docs/chad/chad-handoff.md`·`docs/hslee/hslee-handoff.md` 추적 해제 + `.gitignore` 줄.
- 규범: AGENTS.md·템플릿·harness-task.md·harness-ship.md·ao-worker-rules §2·§7·templates/docs/README.md·docs/index.html.
- 검증: `tests/user-handoff-untracked.test.mjs` 7케이스(무시 줄을 빼면 4개 실패 — 병렬 머지 충돌 재현 확인),
  `npm test` 1058 tests / 0 fail, `npm run docs:check` 최신. 기존 `tests/summary.test.mjs` 병렬 원장 테스트가
  활성화 기록 때문에 실패 → fixture에 설치본과 같은 무시 줄 추가(전환 전 저장소는 종전과 같은 충돌 프로파일).
- 남은 리스크: 전환기 구 브랜치 머지 시 modify/delete 충돌 1회. 새 main을 pull한 워크트리에서 로컬 user handoff가
  한 번 지워졌다가 다음 활성화·커밋에 재생성.


## Reviews
*Codex 등 리뷰 실행 시 결과(요약·발견·조치)를 날짜와 함께 남긴다. 남기지 않은 리뷰는 "안 한 것"으로 간주.*
*기계 판독용 마커를 함께 남긴다: `<!-- harness:review kind=codex scope=worktree tip=<sha|none> at=<ISO8601> -->`*

### 2026-09-27T14:33:44.091Z — codex (harness-team review)

- engine: codex · scope: worktree · tip: fd37fa34b6ee510a077be456e2b3a297d02c1531 · exit 0 · 1288 B

```text
전하, **P2 두 건이 있어 수정 후 진행을 권합니다.** 작업 트리와 staged 삭제를 모두 확인했으며 파일은 변경하지 않았습니다.

- **P2 — [src/commands/migrate.mjs:1087](/Users/hsonpro/.ao/data/worktrees/harness-aijient-team-plugin/harness-aijient-team-plugin-6/src/commands/migrate.mjs:1087):** 추적 중인 handoff가 없으면 `.gitignore` 갱신도 건너뛰므로, 기존 설치에서 이후 생성한 user handoff가 다시 커밋될 수 있습니다. `doctor`도 이 경우 경고하지 않습니다.
- **P2 — [src/task-paths.mjs:28](/Users/hsonpro/.ao/data/worktrees/harness-aijient-team-plugin/harness-aijient-team-plugin-6/src/task-paths.mjs:28), [src/commands/task.mjs:712](/Users/hsonpro/.ao/data/worktrees/harness-aijient-team-plugin/harness-aijient-team-plugin-6/src/commands/task.mjs:712):** glob은 깊이 2만 제한하고 파일명이 실제 `<user>-handoff.md`인지 확인하지 않습니다. 같은 위치의 다른 `*-handoff.md`도 무시되며 `git rm --cached` 안내 대상에 들어갑니다.

**판정:** should-fix. 활성화 시점 기록과 task handoff를 제외하는 깊이 제한은 확인했습니다. `git diff --check`는 통과했으며, 읽기 전용 리뷰라 테스트는 실행하지 않았습니다.
```

<!-- harness:review kind=codex scope=worktree tip=fd37fa34b6ee510a077be456e2b3a297d02c1531 at=2026-09-27T14:33:44.091Z -->

**조치 (작성 세션 판별):**
- P2-1 **수용** — 추적 해제만 되고 무시 줄이 없으면 다음 `git add -A`가 재추적한다(재현 테스트로 확인). `migrate`가 추적
  사본 유무와 무관하게 `.gitignore` 줄을 보장(`appendGitignore`가 변경 여부 반환), `doctor`가 `userHandoffIgnored`(probe
  경로 `git check-ignore`)로 무시 줄 누락도 경고.
- P2-2 **부분 수용** — gitignore 문법은 "파일명 = 디렉터리명-handoff.md"를 표현할 수 없어 같은 깊이의 다른 `*-handoff.md`
  신규 파일도 무시되는 것은 설계 한계로 남기고 `USER_HANDOFF_IGNORE` 주석에 명시(이미 추적 중인 파일은 영향 없음).
  추적 해제 **안내** 대상은 `<u>/<u>-handoff.md`만 남기도록 `trackedUserHandoffs`에 필터 추가.
- 회귀 테스트 2개 추가(9케이스), `npm test` 1060 tests / 0 fail, `docs:check` 최신.

## Learnings

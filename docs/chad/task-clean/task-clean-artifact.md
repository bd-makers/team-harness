# task-clean — Artifact

*최종 결과물과 학습 내용을 기록한다.*

## 결과


## Reviews
*Codex 등 리뷰 실행 시 결과(요약·발견·조치)를 날짜와 함께 남긴다. 남기지 않은 리뷰는 "안 한 것"으로 간주.*
*기계 판독용 마커를 함께 남긴다: `<!-- harness:review kind=codex scope=worktree tip=<sha|none> at=<ISO8601> -->`*

### 2026-11-17T13:22:51.470Z — codex (harness-team review)

- engine: codex · scope: worktree · base: refs/remotes/origin/main · mergeBase: 1d78aa5594d876c5258b29c480065fc931e14a71 · tip: 1d78aa5594d876c5258b29c480065fc931e14a71 · exit 0 · 1762 B

```text
- **P1 blocking — `src/commands/clean.mjs:219–221`**: reset으로 `.gitignore`가 되돌아가면 기존 ignored 파일이 `clean -fd` 삭제 대상이 됩니다. 백업에서도 제외되어 `.env` 등이 복구 불가능하게 유실될 수 있습니다.
- **P1 blocking — `src/commands/clean.mjs:134–135`**: 실제 인덱스 대신 HEAD에서 백업을 구성하므로 스테이지에만 남은 버전이 보존되지 않습니다. 특히 `git add -f`한 ignored 신규 파일은 백업 없이 reset으로 삭제될 수 있습니다.
- **P2 should-fix — `src/commands/clean.mjs:111–116`**: 다른 task 탐색이 `targetDir/docs`로 제한되지만 reset·clean은 저장소 전체에 적용되어, 하위 디렉터리 설치에서는 다른 위치의 task 변경을 보호하지 못합니다.
- **P2 should-fix — `src/commands/clean.mjs:192`**: 커밋된 rename의 `--name-only` 출력에는 목적지만 남으므로, 다른 task 파일을 폴더 밖으로 이동하면 원본 경로가 누락되어 보호 가드를 통과합니다.
- **P2 should-fix — `src/commands/clean.mjs:170–171`**: meta가 없는 레거시 task의 완료 상태를 추론하지 않아, 원장·handoff에서 이미 done인 task도 clean할 수 있습니다.

`task.mjs`의 `baseSha` 생성 시 기록 및 재활성화·reopen 시 보존에서는 별도 결함을 발견하지 못했습니다.

`git status`·기준 커밋 대비 diff·untracked 파일을 확인했습니다. 관련 파일 3개의 구문 검사는 통과했으며, 파일을 생성하는 동작 테스트는 읽기 전용 조건으로 실행하지 않았습니다. 변경한 파일은 없습니다.

**최종 판정: 수정 필요 — P1 데이터 유실 위험 2건이 병합을 차단합니다.**
```

<!-- harness:review kind=codex scope=worktree tip=1d78aa5594d876c5258b29c480065fc931e14a71 at=2026-11-17T13:22:51.470Z -->

**판별·조치 (작성 세션, 2026-11-17)** — 5건 모두 진짜 결함. 각 건을 먼저 실패하는 테스트로 재현(6건 ✖)한 뒤 고쳤다.
- P1 `.gitignore` 되돌림 → ignored 가 clean 대상: 재현됨. `git clean -fd` 를 없애고 백업 시점 `??` 목록만 지운다(`removeUntracked`).
  변형(시작점이 추적하던 경로의 ignored 파일을 reset 이 덮어씀)도 재현 → 그 경로는 백업에 `add -f`.
- P1 HEAD 기반 백업: 재현됨(`add -f` 파일·스테이지 내용 유실). 실제 인덱스를 복사해 백업하고, 인덱스 커밋을 둘째 부모로 둔다(stash 모양). 복구 안내에 `^2 --staged` 추가.
- P2 다른 하네스 루트: 재현됨. 다른 task 판정 정규식을 `(?:.*/)?docs/…` 로 넓혔다.
- P2 rename 누락: 재현됨. `git diff --no-renames`.
- P2 meta 없는 구 task 의 done: 재현됨. `inferLegacyMeta`(runTask 의 reopen 판정과 같은 함수)로 추론.
- 검증: `tests/clean.test.mjs` 19/19, `npm test` 1306 pass · 0 fail.

### 2026-11-17T13:28:55.165Z — codex (harness-team review)

- engine: codex · scope: worktree · base: refs/remotes/origin/main · mergeBase: 1d78aa5594d876c5258b29c480065fc931e14a71 · tip: 1d78aa5594d876c5258b29c480065fc931e14a71 · exit 0 · 1156 B

```text
- **P1 blocking — `src/commands/clean.mjs:194`**: anchor가 `cache`를 외부 디렉터리로 향하는 심볼릭 링크로 복원하면, 기존 `?? cache/note.txt` 삭제가 링크를 따라가 외부의 `note.txt`를 백업 없이 삭제합니다.
- **P1 blocking — `src/commands/clean.mjs:170`**: anchor가 `cache/config.json`을 추적하고 현재 ignored 파일 `cache`가 존재하면, 정확한 하위 경로의 존재 검사에서 백업이 누락되고 `reset --hard`가 해당 파일을 삭제합니다.
- **P1 blocking — `src/commands/clean.mjs:163–164`**: 복사한 인덱스의 `assume-unchanged` 플래그 때문에 `git add -A`가 로컬 수정을 백업하지 않으며, anchor에서 내용이 다른 파일은 reset으로 덮어써 복구할 수 없습니다.

기존 5개 수정과 전체 diff·미추적 파일을 확인했습니다. 관련 4개 파일의 구문 검사는 통과했습니다. 읽기 전용 조건으로 파일을 생성하는 동작 테스트는 실행하지 않았으며, 변경한 파일은 없습니다.

**최종 판정: 수정 필요 — 남은 데이터 손실 경로 3건이 병합을 차단합니다.**
```

<!-- harness:review kind=codex scope=worktree tip=1d78aa5594d876c5258b29c480065fc931e14a71 at=2026-11-17T13:28:55.165Z -->

**판별·조치 (작성 세션, 2026-11-17)** — 3건 모두 진짜 결함. 테스트로 먼저 재현(3건 ✖)한 뒤 고쳤다.
- P1 symlink 따라가기: 재현됨. untracked 삭제 전 부모 디렉터리의 realpath 가 저장소 안 같은 경로인지 확인하고, 아니면 건너뛴다(원본은 백업에만 있다).
- P1 시작점의 디렉터리 자리에 ignored 파일: 재현됨. 덮어쓰기 후보에 시작점 경로의 **조상**도 넣고, 지금 디렉터리가 아닌 것(파일·symlink)을 `add -f`.
- P1 assume-unchanged: 재현됨. 임시 인덱스에서 디스크에 있는 경로의 assume-unchanged·skip-worktree 를 풀고 `add -A`.
  재현 중 추가 발견: 이 플래그가 실제 인덱스에 남아 있으면 `reset --hard` 가 "not uptodate" 로 멈춘다 → 백업 뒤 실제 인덱스에서도 풀고,
  reset·정리 중 실패하면 백업 ref 와 복구 명령을 담은 error packet 으로 끝낸다.
- 검증: `tests/clean.test.mjs` 22/22, `npm test` 1309 pass · 0 fail.

### 2026-11-17T13:35:06.304Z — codex (harness-team review)

- engine: codex · scope: worktree · base: refs/remotes/origin/main · mergeBase: 1d78aa5594d876c5258b29c480065fc931e14a71 · tip: 1d78aa5594d876c5258b29c480065fc931e14a71 · exit 0 · 1622 B

```text
- **P1 blocking — `src/commands/clean.mjs:332`: Restored handoff symlinks can overwrite external files without backing them up.**  
  Reproduction: At task `x`’s anchor, track `docs/chad/chad-handoff.md` as a symlink to an external file. During `x`, remove and commit the symlink, recreate a regular ignored handoff, and write unique content to the external file. `clean x --yes` restores the symlink, then `writeText()` follows it and truncates the external file. Neither backup parent contains those external bytes. The deletion symlink test does not cover this write.

- **P2 should-fix — `src/commands/clean.mjs:289`: Other-task protection misses changes hidden by index flags.**  
  Reproduction: Commit task `other` before creating `x`; mark `other-plan.md` `--assume-unchanged`, then edit it. `clean x --yes` sees no foreign dirty path and passes the guard. Snapshot subsequently clears the flag, and reset discards `other`’s edit. The existing test checks backup preservation, not foreign-task refusal.

- **P2 should-fix — `src/commands/clean.mjs:117`: Other harness roots protect only selected filenames, not entire task folders.**  
  Reproduction: Before creating `x`, commit `pkg/docs/chad/y/y-spec.md` and `y-context.md`. Modify only `y-context.md`, then run `clean x --yes`. It passes the guard and reverts that file: local task discovery excludes `pkg/docs`, and the fallback regex excludes `context.md`.

**Verdict: Request changes.** These concrete reproduction paths were traced through the implementation; execution was not performed because the sandbox is read-only. No files were modified.
```

<!-- harness:review kind=codex scope=worktree tip=1d78aa5594d876c5258b29c480065fc931e14a71 at=2026-11-17T13:35:06.304Z -->

**판별·조치 (작성 세션, 2026-11-17)** — 3건 모두 진짜 결함. 테스트로 먼저 재현(3건 ✖)한 뒤 고쳤다.
- P1 handoff symlink 쓰기: 재현됨(첫 테스트는 링크 삭제 순서가 틀려 거짓 통과 → 순서를 고쳐 재현). handoff 자리가 symlink 면 쓰지 않고 note 를 출력한다.
- P2 플래그로 가려진 다른 task 수정: 재현됨. assume-unchanged·skip-worktree 경로를 가드 입력에 더한다.
- P2 다른 하네스 루트 폴더 전체: 재현됨. 인덱스·시작점·바뀐 경로에서 `…/docs/<u>/<t>/<t>-spec.md` 를 찾아 그 폴더 전체를 보호한다(`listTaskRefs` 의존 제거).
- 검증: `tests/clean.test.mjs` 25/25, `npm test` 전체 통과.
- **리뷰 종료 판단**: 3회차까지 지적이 symlink·인덱스 플래그 같은 드문 경로로 좁혀졌다. 남은 위험(저장소 밖 symlink 를 가진 tracked 경로 일반,
  submodule·sparse checkout, `reset` 도중 프로세스 중단)은 이번 범위에서 다루지 않고, 모든 `--yes` 실행은 백업 ref 를 먼저 남긴다는 사실로 완화한다.

## Learnings

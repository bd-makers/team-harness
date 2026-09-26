# backup-dir-worktree-base — Artifact

*최종 결과물과 학습 내용을 기록한다.*

## 결과


## Reviews
*Codex 등 리뷰 실행 시 결과(요약·발견·조치)를 날짜와 함께 남긴다. 남기지 않은 리뷰는 "안 한 것"으로 간주.*
*기계 판독용 마커를 함께 남긴다: `<!-- harness:review kind=codex scope=worktree tip=<sha|none> at=<ISO8601> -->`*

### 2026-09-26T05:29:35.695Z — codex (harness-team review)

- engine: codex · scope: worktree · tip: e08b60300ffe4f71e0818b27df46481e094dc703 · exit 0 · 1751 B

```text
전하, **P2 수정 필요 2건**입니다. P1은 발견하지 못했습니다.

- **P2 — [src/backup-dir.mjs:21](</Users/hsonpro/Library/Mobile Documents/iCloud~md~obsidian/Documents/para_vault/10_Projects/Harness/harness-aijient-team-plugin/.claude/worktrees/vigorous-kalam-69939a/src/backup-dir.mjs:21>)**: `GIT_DIR`을 그대로 상속하여 `-C targetDir`의 저장소 탐색을 무력화합니다. 워크트리 git-dir을 지정하면 비-git 대상과 하위 디렉터리 모두 메인 루트로 해석되는 것을 재현했습니다. 저장소 선택 환경변수를 격리해야 합니다. ([Git 동작 명세](https://git-scm.com/docs/git#Documentation/git.txt---git-dirltpathgt))
- **P2 — [src/backup-dir.mjs:25](</Users/hsonpro/Library/Mobile Documents/iCloud~md~obsidian/Documents/para_vault/10_Projects/Harness/harness-aijient-team-plugin/.claude/worktrees/vigorous-kalam-69939a/src/backup-dir.mjs:25>)**: common-dir의 이름이 `.git`이라는 조건만으로 체크아웃 존재를 판단하므로, `.git`에 보관한 bare 저장소의 linked worktree에서도 부모를 메인 체크아웃으로 오인합니다. 선언한 bare fallback을 지키려면 실제 메인 체크아웃 존재 여부를 확인해야 합니다.

일반 환경의 메인·비-git 문자열 불변, 워크트리 하위 경로 매핑, 명시 경로 우선순위는 읽기 전용 검증을 통과했습니다. 일반 submodule은 코드상 기존 경로로 fallback합니다. Bare는 프로세스 한정 설정으로 확인했으며, 실제 bare/submodule fixture와 전체 테스트는 실행하지 않았습니다. 파일 변경은 없습니다.

**최종 판정: 수정 후 재검토 — 환경변수 격리와 bare 판별 보완이 필요합니다.**
```

<!-- harness:review kind=codex scope=worktree tip=e08b60300ffe4f71e0818b27df46481e094dc703 at=2026-09-26T05:29:35.695Z -->

판별(작성 세션, 재현 후):
- P2 `GIT_DIR` 상속 — **진짜 결함.** `GIT_DIR=<main>/.git/worktrees/wtn git -C <비-git> rev-parse …`가 그 워크트리를 답하는 것을 재현.
  이 수정이 새로 들인 git 의존의 표면이다(git 훅 안에서 GIT_DIR이 설정된다). 조치: `backupAnchor`가 GIT_DIR·GIT_WORK_TREE·GIT_COMMON_DIR을 뗀 env로 git을 부른다. 회귀 테스트 추가(수정 전 red 확인).
- P2 `.git`에 둔 bare 저장소 — **진짜 결함.** `git clone --bare src bb/.git` + `worktree add`에서 common-dir 이름이 `.git`이라 부모를 메인 체크아웃으로 오인. `core.bare`는 워크트리에서 `true`로 읽힘(재현). 조치: `config --bool core.bare`가 true면 targetDir 그대로. 회귀 테스트 추가(수정 전 red 확인).
- 재검증: `tests/backup-dir.test.mjs` 12/12, `npm test` 1047 · fail 0.

### 2026-09-26T05:32:56.029Z — claude (harness-team review)

- engine: claude · scope: worktree · tip: e08b60300ffe4f71e0818b27df46481e094dc703 · exit 0 · 3630 B

```text
**Verdict: 전하, 머지해도 됩니다.** P1·P2는 없습니다. 이전 codex P2 2건은 둘 다 고쳐졌고, 메인 체크아웃·비-git 결과 문자열도 바뀌지 않습니다.

## 이전 P2 반영 확인
- **GIT_DIR 상속** (`src/backup-dir.mjs:21-22`): git에 넘기는 env에서 `GIT_DIR`·`GIT_WORK_TREE`·`GIT_COMMON_DIR`를 뺐습니다. 테스트는 GIT_DIR을 워크트리 gitdir로 두고 비-git 디렉터리를 넣습니다. 고치기 전 코드라면 메인 체크아웃을 돌려줘 실패할 입력이라, 회귀 테스트로 제 역할을 합니다.
- **`.git` 이름의 bare 저장소 워크트리** (`:29-30`): `core.bare`를 확인해 targetDir로 되돌립니다. 테스트(`clone --bare … bb/.git` 다음 `worktree add`)도 고치기 전에는 `bb`를 돌려줘 실패했을 입력입니다.

## 불변 제약 확인
- **메인 체크아웃**: `gitAbs === commonAbs`면 곧바로 `targetDir`를 그대로 돌려줍니다. 하위 디렉터리를 이 저장소에서 직접 확인했습니다. `--git-common-dir`가 `../.git`처럼 상대 경로로 나와도 `resolve(targetDir, …)`로 풀면 `--git-dir`과 같아져 이 분기를 탑니다.
- **비-git·git 없음·경로 없음·dubious ownership**: 모두 catch로 떨어져 `targetDir`를 돌려줍니다.
- **submodule**: 루트는 두 값이 같아서, 워크트리는 common-dir 이름이 `.git`이 아니어서 둘 다 `targetDir`로 떨어집니다.
- **호출처**: `loadBackupDir`(doctor·backup·migrate·init)와 `resolveBackupDir`(clone·symlink·delete·upgrade)가 모두 `backupDirFromConfig`라는 한 경로를 거칩니다. `{dir}` 설정과 symlink 탐지(2단계)는 바뀌지 않았습니다.

## P3 (선택)
1. **`src/backup-dir.mjs:30`**: `git -C <wt> config core.bare`만으로는 두 경우를 놓칩니다.
   - `extensions.worktreeConfig`를 켠 bare 저장소는 git 문서 권고대로 `core.bare`를 메인 쪽 `config.worktree`로 옮겨 둡니다. 링크된 워크트리에서는 이 값이 보이지 않아 false로 판정되고, `.git`의 부모를 잘못 돌려줍니다.
   - `core.worktree`로 메인 작업 트리를 다른 곳에 둔 저장소에서도 `.git`의 부모는 체크아웃이 아닙니다.
   - 필요하다면 `git -C dirname(commonAbs) rev-parse --is-inside-work-tree --git-common-dir`로 "부모가 실제로 이 common-dir의 작업 트리인가"를 직접 확인하는 편이 튼튼합니다. 다만 드문 설정이라 지금은 선택 사항입니다.
2. **`src/backup-dir.mjs:32`**: `--show-prefix`가 `pkg/`처럼 끝에 `/`를 달고 나와서, 워크트리 하위 디렉터리 설치본의 anchor 끝에 `/`가 붙습니다. 지금 소비처는 모두 `resolve`·`join`·`basename`을 거쳐 문제가 없습니다. 나중에 anchor 문자열을 그대로 출력하거나 비교하면 드러날 수 있습니다.
3. **`src/commands/init.mjs:39`**: `--no-backup`·`--backup-dir`를 줬거나 backup.json이 이미 있어 anchor를 쓰지 않을 때도 git을 한 번 실행합니다. 비용이 거의 없어 무해합니다.

## 검증 범위
diff 정독, 호출처 grep, 메인 체크아웃과 워크트리 하위 디렉터리에서 `rev-parse` 출력 확인(git 2.54)까지 했습니다. plan mode라 `npm run test`는 제가 돌리지 않았습니다. 추가된 테스트가 통과하는지는 작성 세션에서 확인해야 합니다. git 2.13 미만에서 `--git-common-dir`가 상대 경로 기준을 다르게 계산하던 버그는 검증하지 않았습니다.

같은 내용을 `~/.claude/plans/you-are-performing-an-joyful-hartmanis.md`에 요약해 두었습니다.
```

<!-- harness:review kind=claude scope=worktree tip=e08b60300ffe4f71e0818b27df46481e094dc703 at=2026-09-26T05:32:56.029Z -->

판별(작성 세션): 재리뷰는 codex가 400(`gpt-6-sol` 모델 미지원, 증거 미기록)으로 실패해 claude 엔진으로 폴백했다. P1·P2 없음.
- P3-1 `core.bare` 검사가 worktreeConfig bare·`core.worktree` 저장소를 놓침 — **진짜(드문 설정).** worktreeConfig bare에서 워크트리가
  `core.bare`를 unset으로 읽는 것을 스크래치로 재현. 조치: `core.bare` 대신 `git -C <부모> rev-parse --is-inside-work-tree --git-common-dir`로
  "부모가 이 common-dir의 작업 트리인가"를 직접 확인(호출 수 동일). 기존 bare 테스트 green, worktreeConfig 케이스는 스크래치로 targetDir 확인.
- P3-2 `--show-prefix` 끝 `/`가 anchor에 남음 — 소비처 영향 없음이나 한 줄이라 제거.
- P3-3 `init`이 anchor를 안 쓸 때도 git 1회 — 기각(비용 무시 가능, 분기 추가가 더 복잡).
- 재검증: `npm test` 1047 · fail 0, `docs:check` 통과, deep-math 워크트리·메인 doctor 모두 `…/workspace/harness-backup/deep-math`.

## Learnings

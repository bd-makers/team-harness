# backup-dir-worktree-base — Spec

## 목적 / 요구사항
- **문제**: 백업 경로 설정 `.harness/backup.json`의 `{parent,name}`은 `resolve(targetDir, '..', parent, name)`으로
  풀린다. git 워크트리(앱 워크트리 `<repo>/.claude/worktrees/<w>` 등)에서 targetDir은 그 워크트리라 `..`가
  `.claude/worktrees/`가 되고, 경로가 `.claude/worktrees/harness-backup/<name>`을 가리킨다. `backup.json`은
  커밋돼 모든 워크트리가 물려받는다.
  실측(2026-09-26): deep-math 워크트리 `doctor` → `✗ backup clone dir configured but missing on disk: …/deep-math/.claude/worktrees/harness-backup/deep-math`.
- **영향**:
  1. `loadBackupDir`(`src/harness.mjs`) — `backup`·`init`·`migrate`·`doctor`가 쓴다.
  2. `resolveBackupDir`(`src/backup-dir.mjs`) — `clone`·`symlink`·`delete`·`upgrade`가 쓴다. 1단계(`backup.json`)와
     3단계 자동 탐지(`../harness-backup/<basename(targetDir)>` — 이름이 워크트리 이름이 된다) 둘 다.
  3. `init` 신규 설정 경로 — `backup.json`이 없을 때 `{parent, name: basename(targetDir)}`을 저장한다. 워크트리에서
     돌리면 워크트리 이름이 커밋돼 메인 체크아웃까지 오염된다.
- **기대 결과**: 워크트리에서도 메인 체크아웃에서와 같은 백업 경로(메인 체크아웃 기준)를 낸다.
- **제약**: 메인 체크아웃·비-git 디렉터리의 결과는 **문자열까지 불변**. 설정 파일 형식(`{parent,name}`·`{dir}`) 불변.
  릴리스는 범위 밖(머지 후 별도 지시).

## 설계 / 접근
- `src/backup-dir.mjs`에 `backupAnchor(targetDir)`: targetDir에 대응하는 **메인 체크아웃 쪽 경로**.
  - `git -C targetDir rev-parse --git-dir --git-common-dir --show-prefix`를 한 번 읽는다.
  - git-dir == git-common-dir(메인 체크아웃) 또는 git 아님·실패 → `targetDir` 그대로(종전 동작, 문자열 불변).
  - 다르면(링크된 워크트리) `join(dirname(commonDir), prefix)` — 하위 디렉터리 설치본도 같은 상대 위치.
  - common-dir의 basename이 `.git`이 아니면(bare·submodule의 `.git/modules/…`) 부모가 체크아웃이 아니므로 `targetDir`로 degrade.
- `{parent,name}` 해석을 `backupDirFromConfig(targetDir, data)` 하나로 모으고 `loadBackupDir`·`resolveBackupDir`가 공유
  (현재 두 벌 중복).
- `resolveBackupDir` 3단계 자동 탐지: `join(anchor, '..', 'harness-backup', basename(anchor))`.
  2단계 symlink 역추적은 targetDir 안의 실제 링크를 읽으므로 그대로.
- `init` 신규 설정: `backupDir`·`name`을 anchor 기준으로.
- 기각: `--show-toplevel`(워크트리에서는 그 워크트리를 돌려준다 — 바로 이 결함) ·
  `path.relative`/realpath 계산(#109와 같은 이유 — symlink·`/private/var` 차이) ·
  `--path-format=absolute`(git 2.31+ 의존; `-C targetDir` 기준 상대경로를 `resolve`로 푸는 것으로 충분).

## Ontology
- **targetDir**: 하네스가 설치된 디렉터리(`.harness/`가 있는 곳). 워크트리 안일 수 있다.
- **anchor(메인 체크아웃 기준 경로)**: targetDir에 대응하는 메인 체크아웃 쪽 디렉터리. 메인·비-git이면 targetDir 자체.
  `{parent,name}`의 `..`와 자동 탐지 이름은 anchor 기준이다.
- 게이트 통과 근거: 결함 3지점과 재현 조건(링크된 워크트리)이 fixture 테스트로 표현되고, 수정이 헬퍼 하나로 모인다.

## Ambiguity 자가진단
- [x] **Goal 명확도** (40%) — 워크트리에서도 백업 경로가 메인 체크아웃 기준으로 풀린다
- [x] **Constraint 명확도** (30%) — 메인·비-git 결과 문자열 불변, 설정 형식 불변, 실패 시 종전 동작
- [x] **Success 기준** (30%) — 워크트리 fixture 테스트(`loadBackupDir`·`resolveBackupDir` 1·3단계·하위 디렉터리)가 수정 전 red → 후 green, `npm test` fail 0
- [x] **Context 명확도** (brownfield 한정) — `src/backup-dir.mjs`, `src/harness.mjs` `loadBackupDir`, `src/commands/init.mjs` 신규 설정 분기, `tests/backup-dir.test.mjs`
- [x] **Ambiguity ≤ 0.2** — 위 항목 가중합 ≥ 0.8

<!-- 선택 선언. 아래 주석을 벗기면 done 가드가 검사한다.
     미선언 기본값: "tests": "required" (소스가 바뀌면 테스트 파일 변경을 요구), "review": "optional",
     "verify": "optional" ("required"면 검증 프레이밍 kind 마커 — -adversarial 등 — 를 요구). -->
## Done evidence
```json
{ "version": 1, "review": "required" }
```

## 참고
- 선례: `docs/hslee/done-guard-subdir-paths/done-guard-subdir-paths-spec.md`(`--show-prefix` 패턴, #109).
- `init`은 `clone.sh` 등에 `{{BACKUP_DIR}}`을 절대경로로 렌더한다(`src/harness.mjs` planChanges) — 값의 출처가 `ctx.backupDir`라 이 수정으로 함께 옳아진다.
- 이 저장소는 plugin-dev 모드라 doctor가 backup 검사를 skip — 재현은 테스트 fixture로.

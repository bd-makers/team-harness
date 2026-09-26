# backup-dir-worktree-base — Context Card
<!-- working set only; UTF-8 <= 6 KiB, nonblank lines <= 100 -->

## Now
- Goal: git 워크트리에서도 백업 경로가 메인 체크아웃 기준으로 풀린다
- Current atomic step: 커밋·PR (구현·검증·리뷰 완료)
- Stop / human-decision condition: 머지·릴리스는 전하 지시

## Constraints and settled decisions
- 메인·비-git 결과 문자열 불변, backup.json 형식 불변
- anchor = common-dir 부모 + show-prefix, 부모가 실제 그 작업 트리일 때만(bare·core.worktree 제외), GIT_DIR 등 env 제거

## JIT retrieval map
- Identifiers / symbols: backupAnchor, backupDirFromConfig, loadBackupDir, resolveBackupDir
- Narrow globs: src/backup-dir.mjs, src/harness.mjs, src/commands/init.mjs
- Read next: tests/backup-dir.test.mjs
- Verification command: node --test tests/backup-dir.test.mjs

## Failure capsules (max 3 unresolved)
- 없음

## Resume checklist
- PR 상태 확인 → 머지 후 종결(체크만 → done → summary --write → 커밋 1개)

---
description: 현재 프로젝트에 팀 하네스를 신규 scaffold합니다 (Claude 메인 + Codex/Gemini/Cursor/OpenCode)
argument-hint: [--stack react-native|next|node|python|generic] [--yes]
---

현재 작업 디렉토리에 팀용 하네스를 설치합니다.

**Step 1 — 백업 폴더 설정**

`AskUserQuestion` 툴로 다음을 물어보세요:

> 백업 스크립트(clone.sh / symlink.sh / delete.sh)를 어디에 저장할까요?
>
> **옵션 1 — 상위 폴더만 입력** (권장)
> 프로젝트 형제 위치에 `<상위폴더>/<프로젝트명>/` 형태로 생성됩니다.
> 예: `harness-backup` → `../harness-backup/my-app/`
>
> **옵션 2 — 전체 경로 직접 입력**
> 원하는 경로를 그대로 지정합니다.
> 예: `~/backup/team-backups/my-app`
>
> **옵션 3 — 기본값 사용**
> `../harness-backup/<프로젝트명>/` 에 자동 생성됩니다. (Enter)

**Step 2 — 답변에 따라 실행**

- 옵션 1 (상위 폴더 입력 → `<value>`):
```bash
node "${CLAUDE_PLUGIN_ROOT}/bin/harness-team.mjs" init --backup-parent "<value>" $ARGUMENTS
```

- 옵션 2 (전체 경로 입력 → `<value>`):
```bash
node "${CLAUDE_PLUGIN_ROOT}/bin/harness-team.mjs" init --backup-dir "<value>" $ARGUMENTS
```

- 옵션 3 (기본값):
```bash
node "${CLAUDE_PLUGIN_ROOT}/bin/harness-team.mjs" init --yes $ARGUMENTS
```

결과 확인 후 `/harness-doctor`로 무결성 점검을 권장합니다.

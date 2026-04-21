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

**Step 2 — AI 도구 .gitignore 항목 추가 여부 확인**

`AskUserQuestion` 툴로 다음을 물어보세요:

> .gitignore에 AI 도구 관련 항목을 추가할까요?
>
> 추가될 항목:
> ```
> # AI
> CLAUDE.md
> AGENTS.md
> GEMINI.md
>
> oh-my-openagent.json
> opencode.json
>
> handoff.md
> plan.md
>
> .claude
> .claude/
> .cursor
> .cursor/
> .omc / .omx / .ai / .sisyphus / .agents /
> .cursorrules
>
> # build
> output/
> *.log
> docs/
> ```
>
> **예** — 추가합니다
> **아니오** — 건너뜁니다 (하네스 전용 항목만 추가됨)

**Step 3 — 답변에 따라 실행**

백업 폴더 답변(Step 1)과 gitignore 답변(Step 2)을 조합해서 실행합니다.

`--gitignore-ai` 플래그: gitignore에 AI 항목 추가 / `--no-gitignore-ai`: 건너뜀

- 옵션 1 (상위 폴더 입력 → `<backup_value>`) + gitignore 추가:
```bash
node "${CLAUDE_PLUGIN_ROOT}/bin/harness-team.mjs" init --backup-parent "<backup_value>" --gitignore-ai $ARGUMENTS
```

- 옵션 1 + gitignore 건너뜀:
```bash
node "${CLAUDE_PLUGIN_ROOT}/bin/harness-team.mjs" init --backup-parent "<backup_value>" --no-gitignore-ai $ARGUMENTS
```

- 옵션 2 (전체 경로 → `<backup_value>`) + gitignore 추가:
```bash
node "${CLAUDE_PLUGIN_ROOT}/bin/harness-team.mjs" init --backup-dir "<backup_value>" --gitignore-ai $ARGUMENTS
```

- 옵션 2 + gitignore 건너뜀:
```bash
node "${CLAUDE_PLUGIN_ROOT}/bin/harness-team.mjs" init --backup-dir "<backup_value>" --no-gitignore-ai $ARGUMENTS
```

- 옵션 3 (기본값) + gitignore 추가:
```bash
node "${CLAUDE_PLUGIN_ROOT}/bin/harness-team.mjs" init --yes --gitignore-ai $ARGUMENTS
```

- 옵션 3 + gitignore 건너뜀:
```bash
node "${CLAUDE_PLUGIN_ROOT}/bin/harness-team.mjs" init --yes $ARGUMENTS
```

결과 확인 후 `/harness-doctor`로 무결성 점검을 권장합니다.

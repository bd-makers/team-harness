---
tags:
  - project
  - ai
  - obsidian
created: 2026-04-23
modified: 2026-04-23
---

# Design: clone/symlink/delete as Harness CLI Commands

Date: 2026-04-23

## Goal

`templates/clone.sh`, `symlink.sh`, `delete.sh` 를 harness CLI 서브커맨드 및 Claude Code slash command로 대체한다.
backup dir은 `.harness/backup.json` 에서 자동 해결하며, 구버전 설치(backup.json 없음)는 symlink 역추적으로 fallback한다.

## Architecture

### New Files

| Layer | File | Role |
|-------|------|------|
| Shared util | `src/backup-dir.mjs` | backup dir 해결 (json → symlink fallback → error) |
| CLI | `src/commands/clone.mjs` | project → backup dir 동기화 |
| CLI | `src/commands/symlink.mjs` | backup → project symlink 생성 |
| CLI | `src/commands/delete.mjs` | project symlink 제거 |
| Claude command | `commands/harness-clone.md` | `/harness-clone` slash command |
| Claude command | `commands/harness-symlink.md` | `/harness-symlink` slash command |
| Claude command | `commands/harness-delete.md` | `/harness-delete` slash command |

### Changed Files

- `bin/harness-team.mjs`: `clone`, `symlink`, `delete` case 추가
- `templates/clone.sh`, `symlink.sh`, `delete.sh`: deprecated 주석 추가, 파일 유지 (구버전 호환)

## backup-dir Resolution (`src/backup-dir.mjs`)

```
resolveBackupDir(targetDir):
  1. .harness/backup.json 읽기 → { dir } 또는 { parent, name } 으로 경로 계산 → 반환
  2. 없으면: CLAUDE.md 또는 .claude 심링크 readlink → dirname → 반환
  3. 둘 다 없으면: null 반환 → 호출부에서 에러 출력
```

에러 메시지 표준:
```
No backup dir found. Run `harness-team init` or `harness-team backup` first.
```

## Command: clone

**Purpose:** project root의 실제 파일/디렉토리를 backup dir로 동기화 (merge 시맨틱)

**Target items:** `CLAUDE.md`, `AGENTS.md`, `GEMINI.md`, `.claude`, `.cursor`, `.opencode`, `.cursorrules`, `docs`, `.harness`

| 항목 | 처리 |
|------|------|
| backup dir를 가리키는 symlink | skip |
| 다른 절대경로 symlink | backup dir에 동일 symlink 생성 |
| 디렉토리 | backup dir에 merge copy (newer-wins, backup-only 보존) |
| 파일 | backup dir에 newer-wins 복사 |
| 없음 | skip |

**Flags:** `--yes` (비대화형), `--target <dir>`

## Command: symlink

**Purpose:** backup dir 항목 → project root에 절대경로 symlink 생성/교체

**Target items:** `CLAUDE.md`, `AGENTS.md`, `GEMINI.md`, `.claude`, `.cursor`, `.opencode`, `.cursorrules`, `docs`, `.harness`, `clone.sh`, `delete.sh`

> `clone.sh`, `delete.sh`는 backup dir에 있는 경우 symlink 포함 (구버전 스크립트 연결 유지)

| 상태 | 처리 |
|------|------|
| backup에 없음 | skip |
| 이미 같은 backup 가리키는 symlink | skip |
| 다른 symlink 또는 파일/디렉토리 | rm → ln -s (절대경로) |
| 없음 | ln -s |

**Flags:** `--yes`, `--target <dir>`

## Command: delete

**Purpose:** symlink 명령으로 생성된 project symlink 제거

**MOVE_ITEMS** (`CLAUDE.md`, `.claude`, `.cursor`, `.opencode`, `docs`, `.harness`, `clone.sh`, `delete.sh`):
- backup dir 가리키는 symlink → `rm`
- 다른 symlink 또는 파일 → skip

**ALIAS_ITEMS** (`AGENTS.md`, `GEMINI.md`, `.cursorrules`):
- symlink면 → `rm` (타깃 무관)
- 실제 파일이면 → skip (터치하지 않음)

**Flags:** `--yes`, `--target <dir>`

## Claude Code Commands

각 command는 CLI에 단순 위임:

```markdown
# commands/harness-clone.md
node "${CLAUDE_PLUGIN_ROOT}/bin/harness-team.mjs" clone $ARGUMENTS
```

동일 패턴으로 `harness-symlink.md`, `harness-delete.md`.

## Backward Compatibility

| 시나리오 | 결과 |
|----------|------|
| 신규 설치 (backup.json 있음) | json에서 backup dir 해결 → 정상 동작 |
| 구버전 설치 (backup.json 없음, symlink 있음) | symlink 역추적으로 backup dir 해결 → 정상 동작 |
| backup.json도 symlink도 없음 | 에러 + 안내 메시지 |
| backup dir의 .sh 파일 (구버전) | 유지됨 — 신규 CLI와 충돌 없음 |

## Out of Scope

- `.sh` 템플릿 파일 삭제 (deprecated 주석만 추가, 파일은 유지)
- Windows 지원 (`--no-symlinks` 플래그는 기존 init/apply 전용으로 유지)

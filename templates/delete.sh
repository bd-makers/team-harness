#!/bin/bash
# Removes only symlinks in this project that point into the harness backup directory.
# Never deletes real files/directories — neither in the project nor in the backup.
# To remove real files too, use `harness-team delete --include-real` (interactive).
# Run from the project root.
set -euo pipefail

BACKUP_DIR="{{BACKUP_DIR}}"
# AGENTS.md is a real file now (not CLAUDE.md aliases); .cursorrules retired.
ITEMS=("CLAUDE.md" "AGENTS.md" ".claude" ".cursor" ".codex" "docs" ".harness")

for item in "${ITEMS[@]}"; do
  if [ -L "$item" ]; then
    target="$(readlink "$item")"
    # 경로 경계까지 본다 — 접두 매치는 project-a가 project-ab의 링크까지 잡는다.
    if [[ "$target" == "$BACKUP_DIR" || "$target" == "$BACKUP_DIR"/* ]]; then
      rm "$item"
      echo "removed: $item (backup symlink)"
    else
      echo "skip: $item (local symlink -> $target)"
    fi
  elif [ -e "$item" ]; then
    echo "skip: $item (real file/dir — use 'harness-team delete --include-real' to remove)"
  else
    echo "skip: $item (not found)"
  fi
done

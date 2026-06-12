#!/bin/bash
# Removes only symlinks in this project that point into the harness backup directory.
# Never deletes real files/directories — neither in the project nor in the backup.
# To remove real files too, use `harness-team delete --include-real` (interactive).
# Run from the project root.
set -euo pipefail

BACKUP_DIR="{{BACKUP_DIR}}"
# AGENTS.md / GEMINI.md are real files now (not CLAUDE.md aliases); .cursorrules retired.
ITEMS=("CLAUDE.md" "AGENTS.md" "GEMINI.md" ".claude" ".cursor" ".opencode" "docs" ".harness")

for item in "${ITEMS[@]}"; do
  if [ -L "$item" ]; then
    target="$(readlink "$item")"
    if [[ "$target" == "$BACKUP_DIR"* ]]; then
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

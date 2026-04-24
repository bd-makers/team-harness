#!/bin/bash
# Removes symlinks in this project that point to the harness backup directory.
# Run from the project root.
set -euo pipefail

BACKUP_DIR="{{BACKUP_DIR}}"
ITEMS=("CLAUDE.md" ".claude" ".cursor" ".opencode" "docs" ".harness")
ALIAS_ITEMS=("AGENTS.md" "GEMINI.md" ".cursorrules")

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
    rm -rf "$item"
    echo "removed: $item"
  else
    echo "skip: $item (not found)"
  fi
done

for item in "${ALIAS_ITEMS[@]}"; do
  if [ -L "$item" ]; then
    rm "$item"
    echo "removed: $item (alias symlink)"
  elif [ -e "$item" ]; then
    echo "skip: $item (not a symlink, leaving untouched)"
  fi
done

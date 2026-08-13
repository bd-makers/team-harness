#!/bin/bash
# Syncs non-symlink items from this project to the harness backup directory.
# Run from the project root.
set -euo pipefail

BACKUP_DIR="{{BACKUP_DIR}}"
ITEMS=("CLAUDE.md" "AGENTS.md" "GEMINI.md" ".claude" ".cursor" ".opencode" ".codex" "docs" ".harness")

if [ ! -d "$BACKUP_DIR" ]; then
  echo "error: backup dir not found: $BACKUP_DIR" >&2
  exit 1
fi

for item in "${ITEMS[@]}"; do
  if [ -L "$item" ]; then
    target="$(readlink "$item")"
    if [[ "$target" == "$BACKUP_DIR"* ]]; then
      echo "skip: $item (backup symlink)"
    else
      ln -sf "$target" "$BACKUP_DIR/$item"
      echo "synced symlink: $item -> $target"
    fi
  elif [ -d "$item" ]; then
    mkdir -p "$BACKUP_DIR/$item"
    rsync -a --update "$item/" "$BACKUP_DIR/$item/"
    echo "merged dir: $item -> $BACKUP_DIR/$item"
  elif [ -e "$item" ]; then
    if [ ! -e "$BACKUP_DIR/$item" ] || [ "$item" -nt "$BACKUP_DIR/$item" ]; then
      cp -p "$item" "$BACKUP_DIR/$item"
      echo "copied (newer): $item -> $BACKUP_DIR/$item"
    else
      echo "skip: $item (backup is newer or equal)"
    fi
  else
    echo "skip: $item (not found)"
  fi
done

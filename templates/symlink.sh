#!/bin/bash
# Creates symlinks in this project pointing to items in the harness backup directory.
# Run from the project root.
set -euo pipefail

BACKUP_DIR="{{BACKUP_DIR}}"
ITEMS=("CLAUDE.md" "AGENTS.md" "GEMINI.md" ".claude" ".cursor" ".opencode" ".cursorrules" "docs" ".harness")

if [ ! -d "$BACKUP_DIR" ]; then
  echo "error: backup dir not found: $BACKUP_DIR" >&2
  exit 1
fi

for item in "${ITEMS[@]}"; do
  backup="$BACKUP_DIR/$item"
  if [ ! -e "$backup" ]; then
    echo "skip: $item (not found in backup)"
    continue
  fi

  if [ -L "$item" ]; then
    target="$(readlink "$item")"
    if [ "$target" = "$backup" ]; then
      echo "skip: $item (already linked to backup)"
    else
      rm "$item"
      ln -s "$backup" "$item"
      echo "replaced: $item -> $backup"
    fi
  elif [ -e "$item" ]; then
    rm -rf "$item"
    ln -s "$backup" "$item"
    echo "replaced: $item -> $backup"
  else
    ln -s "$backup" "$item"
    echo "linked: $item -> $backup"
  fi
done

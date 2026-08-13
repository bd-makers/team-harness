#!/bin/bash
# Creates symlinks in this project pointing to items in the harness backup directory.
# Never destroys real files in the project or in the backup:
#   - if a real file/dir already exists in the project and is byte-identical to the
#     backup copy, it is replaced with a symlink
#   - if it differs, it is left untouched and the user is told to run clone.sh first
# Run from the project root.
set -euo pipefail

BACKUP_DIR="{{BACKUP_DIR}}"
ITEMS=("CLAUDE.md" "AGENTS.md" "GEMINI.md" ".claude" ".cursor" ".opencode" ".codex" "docs" ".harness")

if [ ! -d "$BACKUP_DIR" ]; then
  echo "error: backup dir not found: $BACKUP_DIR" >&2
  exit 1
fi

same_tree() {
  # Returns 0 if $1 and $2 have identical contents (files or directories).
  local a="$1" b="$2"
  if [ -d "$a" ] && [ -d "$b" ]; then
    diff -rq "$a" "$b" >/dev/null 2>&1
  elif [ -f "$a" ] && [ -f "$b" ]; then
    cmp -s "$a" "$b"
  else
    return 1
  fi
}

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
      echo "replaced symlink: $item -> $backup"
    fi
  elif [ -e "$item" ]; then
    if same_tree "$item" "$backup"; then
      rm -rf "$item"
      ln -s "$backup" "$item"
      echo "replaced (identical): $item -> $backup"
    else
      echo "skip: $item (real file differs from backup — run ./clone.sh first, then re-run)"
    fi
  else
    ln -s "$backup" "$item"
    echo "linked: $item -> $backup"
  fi
done

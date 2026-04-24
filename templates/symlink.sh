#!/bin/bash
# DEPRECATED: Use `harness-team symlink` or /harness-symlink instead.
# Creates symlinks in the current directory pointing to ../frontchapter-harness/lab-blog/
# Run this from your project root (e.g., lab-blog/)

SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"
ITEMS=("CLAUDE.md" "AGENTS.md" "GEMINI.md" ".claude" ".cursor" ".opencode" ".cursorrules" "docs" ".harness" "clone.sh" "delete.sh")

for item in "${ITEMS[@]}"; do
  backup="$SCRIPT_DIR/$item"
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

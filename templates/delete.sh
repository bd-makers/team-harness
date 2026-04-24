#!/bin/bash
# DEPRECATED: Use `harness-team delete` or /harness-delete instead.
# Removes symlinks created by link.sh
# Run this from your project root (e.g., lab-blog/)

SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"
ITEMS=("CLAUDE.md" ".claude" ".cursor" ".opencode" "docs" ".harness" "clone.sh" "delete.sh")
ALIAS_ITEMS=("AGENTS.md" "GEMINI.md" ".cursorrules")

for item in "${ITEMS[@]}"; do
  if [ -L "$item" ]; then
    target="$(readlink "$item")"
    if [[ "$target" == "$SCRIPT_DIR"* ]]; then
      rm "$item"
      echo "removed: $item (harness symlink)"
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

#!/bin/bash
# Removes symlinks created by link.sh
# Run this from your project root (e.g., lab-blog/)

SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"
ITEMS=("CLAUDE.md" "AGENTS.md" "GEMINI.md" ".claude" ".cursor" ".opencode" ".cursorrules" "docs" ".harness" "clone.sh" "delete.sh")

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

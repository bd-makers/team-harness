#!/bin/bash
# Creates symlinks in the current directory pointing to ../frontchapter-harness/lab-blog/
# Run this from your project root (e.g., lab-blog/)

SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"
ITEMS=("CLAUDE.md" "AGENTS.md" "GEMINI.md" ".claude" ".cursor" ".opencode" ".cursorrules" "docs" ".harness" "clone.sh" "delete.sh")

for item in "${ITEMS[@]}"; do
  if [ -L "$item" ]; then
    target="$(readlink "$item")"
    if [[ "$target" == "$SCRIPT_DIR"* ]]; then
      echo "skip: $item (already linked to harness)"
    else
      echo "skip: $item (local symlink -> $target)"
    fi
  elif [ -e "$item" ]; then
    echo "skip: $item (already exists)"
  else
    ln -s "$SCRIPT_DIR/$item" "$item"
    echo "linked: $item -> $SCRIPT_DIR/$item"
  fi
done

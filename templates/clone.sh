#!/bin/bash
# DEPRECATED: Use `harness-team clone` or /harness-clone instead.
# Syncs non-symlink items from current project to harness directory.
# Merge semantics: only files newer than harness are copied; harness-only files are preserved.
# Run this from your project root (e.g. bodoc4, bodoc4-2, ...).

SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"
ITEMS=("CLAUDE.md" "AGENTS.md" "GEMINI.md" ".claude" ".cursor" ".opencode" ".cursorrules" "docs" ".harness")

# Refuse to run inside the harness itself (would be a no-op / self-copy).
if [ "$(pwd)" = "$SCRIPT_DIR" ]; then
  echo "error: run clone.sh from a project root, not inside the harness ($SCRIPT_DIR)" >&2
  exit 1
fi

for item in "${ITEMS[@]}"; do
  if [ -L "$item" ]; then
    target="$(readlink "$item")"
    if [[ "$target" == "$SCRIPT_DIR"* ]]; then
      echo "skip: $item (harness symlink)"
    else
      ln -sf "$target" "$SCRIPT_DIR/$item"
      echo "synced symlink: $item -> $target"
    fi
  elif [ -d "$item" ]; then
    mkdir -p "$SCRIPT_DIR/$item"
    rsync -a --update "$item/" "$SCRIPT_DIR/$item/"
    echo "merged dir: $item -> $SCRIPT_DIR/$item"
  elif [ -e "$item" ]; then
    if [ ! -e "$SCRIPT_DIR/$item" ] || [ "$item" -nt "$SCRIPT_DIR/$item" ]; then
      cp -p "$item" "$SCRIPT_DIR/$item"
      echo "copied (newer): $item -> $SCRIPT_DIR/$item"
    else
      echo "skip: $item (harness is newer or equal)"
    fi
  else
    echo "skip: $item (not found)"
  fi
done

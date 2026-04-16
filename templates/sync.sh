#!/bin/bash
# sync.sh — Unified harness ↔ project sync with auto-detection.
# Run from your project root (e.g. bodoc4-2/).
#
# Per-item behavior (auto-detected per item):
#   only harness has it      → symlink project → harness
#   only project has it      → copy/rsync project → harness
#   both exist               → sync newest (file: timestamp compare, dir: bidirectional rsync --update)
#   already harness symlink  → skip (already in sync)
#   external symlink         → skip (don't touch)
#   not found anywhere       → skip
#
# NOTE: harness files are always kept as real files, never replaced with symlinks.

set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"
ITEMS=(
  "CLAUDE.md" "AGENTS.md" "GEMINI.md"
  ".claude" ".cursor" ".sisyphus" ".ai"
  ".cursorrules" ".agents"
  "handoff.md" "plan.md"
  "opencode.json" "oh-my-openagent.json"
  "docs"
)

# Refuse to run inside the harness itself
if [ "$(pwd)" = "$SCRIPT_DIR" ]; then
  echo "error: run sync.sh from a project root, not inside the harness ($SCRIPT_DIR)" >&2
  exit 1
fi

for item in "${ITEMS[@]}"; do
  project_item="$item"
  harness_item="$SCRIPT_DIR/$item"

  # Already a symlink in project — check where it points
  if [ -L "$project_item" ]; then
    target="$(readlink "$project_item")"
    if [[ "$target" == "$SCRIPT_DIR"* ]]; then
      echo "skip: $item (already harness symlink)"
    else
      echo "skip: $item (external symlink -> $target)"
    fi
    continue
  fi

  project_exists=false
  harness_exists=false
  [ -e "$project_item" ] && project_exists=true
  [ -e "$harness_item" ] && harness_exists=true

  if ! $project_exists && ! $harness_exists; then
    # Neither side has it
    echo "skip: $item (not found anywhere)"

  elif ! $project_exists && $harness_exists; then
    # Case 1: only harness has it → create symlink in project
    ln -s "$harness_item" "$project_item"
    echo "linked: $item -> harness"

  elif $project_exists && ! $harness_exists; then
    # Case 2: only project has it → copy/rsync to harness
    if [ -d "$project_item" ]; then
      mkdir -p "$harness_item"
      rsync -a "$project_item/" "$harness_item/"
      echo "cloned dir: $item -> harness"
    else
      cp -p "$project_item" "$harness_item"
      echo "cloned: $item -> harness"
    fi

  else
    # Case 3: both exist → sync newest
    if [ -d "$project_item" ] || [ -d "$harness_item" ]; then
      # Bidirectional directory sync — newer files win on each side
      rsync -a --update "$project_item/" "$harness_item/"
      rsync -a --update "$harness_item/" "$project_item/"
      echo "synced dir (bidirectional): $item"
    else
      # File — compare timestamps
      if [ "$project_item" -nt "$harness_item" ]; then
        cp -p "$project_item" "$harness_item"
        echo "synced: $item (project -> harness)"
      elif [ "$harness_item" -nt "$project_item" ]; then
        cp -p "$harness_item" "$project_item"
        echo "synced: $item (harness -> project)"
      else
        echo "skip: $item (up to date)"
      fi
    fi
  fi
done

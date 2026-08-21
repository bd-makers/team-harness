#!/bin/bash
# PostToolUse hook: Edit/Write 후 Prettier 자동 포맷
# .ts, .tsx, .js, .jsx, .json 파일만 대상

INPUT=$(cat)
FILE_PATH=$(echo "$INPUT" | jq -r '.tool_input.file_path // empty')

# 파일 경로가 없거나 포맷 대상이 아니면 스킵
if [[ -z "$FILE_PATH" ]]; then
  exit 0
fi

case "$FILE_PATH" in
  *.ts|*.tsx|*.js|*.jsx|*.json)
    if [[ -f "$FILE_PATH" ]]; then
      npx prettier --write "$FILE_PATH" 2>/dev/null
    fi
    ;;
esac

exit 0

#!/bin/bash
# PreToolUse hook: 보호 대상 파일 수정 차단
# Exit 0 = 허용, Exit 2 = 차단

INPUT=$(cat)
FILE_PATH=$(echo "$INPUT" | jq -r '.tool_input.file_path // .tool_input.command // empty')

# 보호 대상 패턴
PROTECTED_PATTERNS=(
  ".env"
  "ios/Pods"
  "android/build"
  "node_modules/"
  ".git/"
)

for pattern in "${PROTECTED_PATTERNS[@]}"; do
  if [[ "$FILE_PATH" == *"$pattern"* ]]; then
    echo "🚫 보호 대상 파일입니다: $pattern — 직접 수정할 수 없습니다." >&2
    exit 2
  fi
done

exit 0
